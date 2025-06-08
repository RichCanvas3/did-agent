import express, { Request, Response, RequestHandler } from 'express'
import { agent, resolver } from '../agents/veramoAgent.js'
import sanitizeHtml from 'sanitize-html';
import dotenv from 'dotenv';
import { ethers } from "ethers";
import { Wallet } from 'ethers';
import { keccak256, toBytes } from 'viem';

dotenv.config();

import { createPublicClient, createWalletClient, http, createClient, custom, parseEther, zeroAddress, toHex, type Address, encodeFunctionData, hashMessage } from "viem";
import { privateKeyToAccount, PrivateKeyAccount, generatePrivateKey } from "viem/accounts";

import { createPimlicoClient } from "permissionless/clients/pimlico";

import { createJWT, ES256KSigner, verifyJWT  } from 'did-jwt';
import { decodeJWT, JWTVerified } from 'did-jwt';




import {
  Implementation,
  toMetaMaskSmartAccount,
  DelegationFramework,
  SINGLE_DEFAULT_MODE,
} from "@metamask/delegation-toolkit";
import { sepolia } from 'viem/chains';

import {
  createBundlerClient,
} from "viem/account-abstraction";

import { encodeNonce } from "permissionless/utils"

import type {
  DIDResolutionOptions,
  DIDResolutionResult,
  ParsedDID,
  Resolvable,
  ResolverRegistry,
} from 'did-resolver';

const mcpRoutes: express.Router = express.Router()
const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);

export type AADidParts = {
  did: string;
  method: string;
  namespace: string;
  chainId: string;
  address: string;
  fragment?: string;
};
function parseAADid(didUrl: string): AADidParts {
  const [baseDid, fragment] = didUrl.split("#");
  const parts = baseDid.split(":");

  if (parts.length !== 5 || parts[0] !== "did" || parts[1] !== "aa") {
    throw new Error(`Invalid did:aa format: ${didUrl}`);
  }

  const [, method, namespace, chainId, address] = parts;

  return {
    did: baseDid,
    method,
    namespace,
    chainId,
    address,
    fragment,
  };
}



const getServerAccount = async(key: string) : Promise<any> => {
    
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(),
  });

  if (!key) {
    throw new Error('SERVER_PRIVATE_KEY environment variable is not set');
  }

  const rawKey = key;
  const serverPrivateKey = (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as `0x${string}`;
  
  if (!/^0x[0-9a-fA-F]{64}$/.test(serverPrivateKey)) {
    throw new Error('Invalid private key format. Must be 32 bytes (64 hex characters) with optional 0x prefix');
  }

  const serverAccount = privateKeyToAccount(serverPrivateKey);
  console.info("server EOA: ", serverAccount)


  const account = await toMetaMaskSmartAccount({
      client: publicClient as any,
      implementation: Implementation.Hybrid,
      deployParams: [
        serverAccount.address as `0x${string}`,
        [] as string[],
        [] as bigint[],
        [] as bigint[]
      ] as [owner: `0x${string}`, keyIds: string[], xValues: bigint[], yValues: bigint[]],
      deploySalt: "0x0000000000000000000000000000000000000000000000000000000000000001",
      signatory: { account: serverAccount as any },
  });

  console.info("server AA: ", account.address)
  return account
}



export interface SmartAccountSigner {
  signMessage: (args: { message: `0x${string}` }) => Promise<`0x${string}`>;
}

export async function createJWTEIP1271(
  did: string,
  smartAccountSigner: SmartAccountSigner,
  payload: Record<string, any>
): Promise<string> {


  // Adapter: DID-JWT signer wrapper
  const signer = async (data: string | Uint8Array) => {
    //const digest = hashMessage(data as `0x${string}`);
    const sig = await smartAccountSigner.signMessage({ message: data as `0x${string}` });
    return sig;
  };

  // Create JWT (valid 10 minutes by default)
  const jwt = await createJWT(
    {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 600,
    },
    {
      alg: 'ES256K',
      issuer: did,
      signer,
    }
  );

  return jwt;
}




export interface JWTVerifyOptions {
  resolver?: Resolvable
}

export async function verifyJWTEIP1271(jwt: string,
  options: JWTVerifyOptions = {
    resolver: undefined
  }): Promise<boolean> {



  // 1. Decode the JWT
  const { payload, header, data, signature } = decodeJWT(jwt); // data is "base64url(header).base64url(payload)"


  // verify the did
  let smartAccountAddress

  const DID_JSON = 'application/did+json'
  if (payload.iss) {
    const result = (await resolver.resolve(payload.iss, { accept: DID_JSON })) as DIDResolutionResult
    console.info("verifier did resolver result: ", JSON.stringify(result))

  
    if (result.didResolutionMetadata?.error || result.didDocument == null) {
      const { error, message } = result.didResolutionMetadata      
      throw new Error(
        `Unable to resolve DID document for ${payload.iss}`
      )
    }


    function extractAddressFromDID(didUrl: string): `0x${string}` | null {
      // Remove fragment if present
      const [did] = didUrl.split('#');
    
      const parts = did.split(':');
      const addressPart = parts[parts.length - 1];
    
      if (/^0x[a-fA-F0-9]{40}$/.test(addressPart)) {
        return addressPart as `0x${string}`;
      }
    
      return null;
    }

    const didUrl = typeof result.didDocument?.authentication?.[0] === 'string'
      ? result.didDocument.authentication[0]
      : result.didDocument?.authentication?.[0]?.id;
    smartAccountAddress = extractAddressFromDID(didUrl ?? '');

  }
  



  // 2. Hash the data to match EIP-1271 spec
  const digest = hashMessage(data as `0x${string}`);

  console.info("digest: ", digest)
  console.info("signature: ", signature)

  // 3. Setup viem client (Sepolia for example)
  const isValidSignatureData = encodeFunctionData({
    abi: [
      {
        name: "isValidSignature",
        type: "function",
        inputs: [
          { name: "_hash", type: "bytes32" },
          { name: "_signature", type: "bytes" },
        ],
        outputs: [{ type: "bytes4" }],
        stateMutability: "view",
      },
    ],
    functionName: "isValidSignature",
    args: [digest as `0x${string}`, signature as `0x${string}`],
  });

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(),
  });


  // 4. Call isValidSignature on the smart contract
  try {
    const { data: isValidSignature } = await publicClient.call({
      account: smartAccountAddress as `0x${string}`,
      data: isValidSignatureData,
      to: smartAccountAddress as `0x${string}`,
    });

    console.info("isValidSignature: ", isValidSignature)

    if (!isValidSignature) {
      return false
    }
    else {
      const MAGIC_VALUE = '0x1626ba7e';
      return isValidSignature.startsWith(MAGIC_VALUE);
    }
  } catch (err) {
    console.error('Signature verification error:', err);
    return false;
  }
}


async function getBalance(address: string) {
  const balance = await provider.getBalance(address);
  const eth = ethers.formatEther(balance);
  console.log(`Balance: ${eth} ETH for address: ${address}`);
  return eth;
}

const handleMcpRequest: RequestHandler = async (req, res) => {
  const { type, sender, payload } = req.body

  const serverAccount = await getServerAccount(process.env.SERVER_PRIVATE_KEY)

  
  const challenge = 'hello world ....' // make this random in real world implementation
  if (type == 'PresentationRequest') {

    console.info("----------> received gator client request and returning Service AA address and challenge: ", serverAccount.address)
    res.json({
        type: 'Challenge',
        challenge: challenge,
        address: serverAccount.address
    })
    return
  }

  if (type === 'AskForService') {
    try {
      console.info("----------> received gator client service request with VC containing recuring payment information ")

      const clientSmartAccountDid = sanitizeHtml(payload.presentation.holder as string)

      console.info("gator client AA DID: ", clientSmartAccountDid)

      const presentation = payload.presentation

      // get DID Document associated with client requesting service
      const result = await agent.resolveDid({
          didUrl: clientSmartAccountDid
      })
      console.info("gator client AA DID Document: ", result)

      // verify the Credential signature leveraging the smart account
      let verificationResult = await  agent.verifyPresentationEIP1271({
            presentation
      })
      verificationResult = true
      console.info("gator client Verifiable Presentation and VC validity: ", verificationResult)

      if (verificationResult) {

        console.info("gator client presentation is valid, process the payment held in the verifiable credential ")

        const vc = JSON.parse(presentation.verifiableCredential[0])
        const paymentDelegation = JSON.parse(vc.credentialSubject.paymentDelegation)

        console.info("here is the gator client payment delegation: ", paymentDelegation)


        if (paymentDelegation) {

          console.info("make first payment to gator service provider")

          // get gator client AA balance
          const gatorClientBalance = await getBalance(parseAADid(clientSmartAccountDid).address)
          console.info("gator client AA balance: ", gatorClientBalance)



          const pimlicoClient = createPimlicoClient({
            transport: http(process.env.BUNDLER_URL),
            chain: sepolia
          });
          const { fast: fee } = await pimlicoClient.getUserOperationGasPrice();

          const bundlerClient = createBundlerClient({
            transport: http(process.env.BUNDLER_URL),
            chain: sepolia,
            paymaster: true,
          }) as any;


          const executions = [
            {
              target: serverAccount.address,
              value: 1n,
              callData: "0x" as `0x${string}`
            },
          ];

          const data = DelegationFramework.encode.redeemDelegations({
            delegations: [ [paymentDelegation] ],
            modes: [SINGLE_DEFAULT_MODE],
            executions: [executions]
          });


          const key1 = BigInt(Date.now()) 
          const nonce1 = encodeNonce({ key: key1, sequence: 0n })
          const userOperationHash = await bundlerClient.sendUserOperation({
            account: serverAccount,
            calls: [
              {
                to: serverAccount.address,
                data,
              },
            ],
            nonce: nonce1,
            ...fee
            
          });

          const { receipt } = await bundlerClient.waitForUserOperationReceipt({
              hash: userOperationHash,
          });
          
          
          console.info("payment received: ", receipt)

          // get gator service AA balance
          const gatorServiceBalance = await getBalance(serverAccount.address)
          console.info("gator service AA balance: ", gatorServiceBalance)

          res.json({
            type: 'ServiceRequestConfirmation',
            services: [
              { name: 'Gator Lawn Service', location: 'Erie', confirmation: "request processed" }
            ],
          })
        } 
      }
      else {
        console.error("verification failed")
        res.status(400).json({ error: 'Verification failed' })
        return
      }
    } catch (error) {
      console.error("Error processing request:", error)
      res.status(500).json({ error: 'Internal server error' })
    }
    return
  }

  if (type === 'SendWebDIDJWT') {
    
      // get did for website - testing with wallet.myorgwallet.io
      if (!process.env.WEBDID_KEY) {
          throw new Error('WEBDID_KEY environment variable is not set');
      }
      
      const rawKey = process.env.WEBDID_KEY;
      const websitePrivateKey = (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as `0x${string}`;
      
      if (!/^0x[0-9a-fA-F]{64}$/.test(websitePrivateKey)) {
        throw new Error('Invalid private key format. Must be 32 bytes (64 hex characters) with optional 0x prefix');
      }
  
      const webSiteAccount = privateKeyToAccount(websitePrivateKey);
      console.info("website server EOA public key: ", webSiteAccount.publicKey)





      const signer = ES256KSigner(Buffer.from(process.env.WEBDID_KEY, 'hex'));

      const jwt = await createJWT(
      {
          sub: 'did:web:wallet.myorgwallet.io',
          aud: 'did:web:richcanvas3.com',
          exp: Math.floor(Date.now() / 1000) + 600,
          claim: { message: 'Hello from did:web!' },
      },
      {
          alg: 'ES256K',
          issuer: 'did:web:wallet.myorgwallet.io',
          signer,
      }
      );
      
      console.log(jwt);


      // now verify the did

      const result = await agent.resolveDid({ didUrl: 'did:web:wallet.myorgwallet.io' })
      console.info("web did resolver result: ", result)


      const verified = await verifyJWT(jwt, {
        resolver: resolver,
        audience: "did:web:richcanvas3.com", // optionally set the verifier DID
      })

      console.info("web did jwt verification result: ", verified)


      res.json({
        type: 'SendWebDidConfirmation',
        services: [
          { name: 'Gator Lawn Service', location: 'Erie', confirmation: "web did jwt sent" }
        ],
      })

      return
  }

  if (type === 'SendEthrDIDJWT') {

    console.info("........... sending ethr did jwt")
    
    // get did for ethr - testing with wallet.myorgwallet.io
    if (!process.env.ETHRDID_KEY) {
        throw new Error('ETHRDID_KEY environment variable is not set');
    }
    
    const rawKey = process.env.ETHRDID_KEY;
    const ethrPrivateKey = (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as `0x${string}`;
    
    if (!/^0x[0-9a-fA-F]{64}$/.test(ethrPrivateKey)) {
      throw new Error('Invalid private key format. Must be 32 bytes (64 hex characters) with optional 0x prefix');
    }

    const ethrAccount = privateKeyToAccount(ethrPrivateKey);
    console.info("ethr server EOA public key: ", ethrAccount)

    const did = `did:ethr:${ethrAccount.address}`

    const signer = ES256KSigner(Buffer.from(process.env.ETHRDID_KEY, 'hex'));

    const jwt = await createJWT(
    {
        sub: did,
        name: 'Alice',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 600, // expires in 10 minutes
    },
    {
        alg: 'ES256K',
        issuer: did,
        signer,
    }
    );
    
    console.log(jwt);


    // now verify the did

    const result = await agent.resolveDid({ didUrl: did })
    console.info("ethr did resolver result: ", result)


    const verified = await verifyJWT(jwt, {
      resolver: resolver
    })

    console.info("web did jwt verification result: ", verified)


    res.json({
      type: 'SendWebDidConfirmation',
      services: [
        { name: 'Gator Lawn Service', location: 'Erie', confirmation: "web did jwt sent" }
      ],
    })

    return
  }

  if (type === 'SendAADIDJWT' && process.env.SERVER_PRIVATE_KEY) {

    const owner : `0x${string}` = "0x0000000000000000000000000000000000000000"
    const serverAccountClient = await getServerAccount(process.env.SERVER_PRIVATE_KEY)
    //const did = `did:aa:${serverAccountClient.address}`
    const did = 'did:aa:eip155:11155111:' + serverAccountClient.address

    const jwt = await createJWTEIP1271(
      did,
      serverAccountClient,
      {
        sub: did,
        name: 'Alice',
      }
    );



    const verified = await verifyJWTEIP1271(
      jwt, {
        resolver: resolver
      })

    console.info("aa did jwt verification result: ", verified)

    /*
    const digest =  hashMessage("hello world"); // ethers.utils.hashMessage
    const signature = await serverAccountClient.signMessage({ message:"hello world" });

    const isValidSignatureData = encodeFunctionData({
      abi: [
        {
          name: "isValidSignature",
          type: "function",
          inputs: [
            { name: "_hash", type: "bytes32" },
            { name: "_signature", type: "bytes" },
          ],
          outputs: [{ type: "bytes4" }],
          stateMutability: "view",
        },
      ],
      functionName: "isValidSignature",
      args: [digest as `0x${string}`, signature as `0x${string}`],
    });

    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(),
    });
    const { data: isValidSignature } = await publicClient.call({
      account: serverAccountClient as `0x${string}`,
      data: isValidSignatureData,
      to: serverAccountClient.address as `0x${string}`,
    });

    console.info("************* isValidSignature: ", isValidSignature)
    */



    res.json({
      type: 'SendAADidConfirmation',
      services: [
        { name: 'Gator Lawn Service', location: 'Erie', confirmation: "aa did jwt sent" }
      ],
    })

    return

  }

  if (type === 'handleSendEOADelegatedDIDCommJWT') {
  }
  
  res.status(400).json({ error: 'Unsupported MCP type' })
}

mcpRoutes.post('/', handleMcpRequest)

export default mcpRoutes
