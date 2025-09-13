import express, { Request, Response, RequestHandler } from 'express'
import { agent, resolver } from '../agents/veramoAgent.js'
import sanitizeHtml from 'sanitize-html';
import dotenv from 'dotenv';
import { ethers } from "ethers";
import { Wallet } from 'ethers';
import { keccak256, toBytes, Chain } from 'viem';
import axios from 'axios';

dotenv.config();

import { createPublicClient, parseAbi, formatUnits, TransactionExecutionError, createWalletClient, http, createClient, custom, parseEther, zeroAddress, toHex, type Address, encodeFunctionData, hashMessage } from "viem";
import { privateKeyToAccount, PrivateKeyAccount, generatePrivateKey } from "viem/accounts";

import { createPimlicoClient } from "permissionless/clients/pimlico";

import { createJWT, ES256KSigner, verifyJWT  } from 'did-jwt';
import { decodeJWT, JWTVerified } from 'did-jwt';
import { getRegistryAgent } from '@mcp/shared'
import { CHAIN_IDS_TO_MESSAGE_TRANSMITTER, DESTINATION_DOMAINS, CHAIN_IDS_TO_USDC_ADDRESSES, CHAIN_TO_CHAIN_NAME, CHAIN_IDS_TO_TOKEN_MESSENGER, CHAIN_IDS_TO_RPC_URLS, CHAINS, CHAIN_IDS_TO_BUNDLER_URL } from '../libs/chains.js';





import {
  Implementation,
  toMetaMaskSmartAccount,
  DelegationFramework,
  SINGLE_DEFAULT_MODE,
  createDelegation,
} from "@metamask/delegation-toolkit";
import { sepolia, baseSepolia } from 'viem/chains';


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
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

const defaultChain = sepolia
const defaultServiceCrossChainChain = baseSepolia

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
    throw new Error(`Invalid did:aa format 1: ${didUrl}`);
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


export type SmartAccountSigner = {
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

export async function verifyAAJWTEIP1271(jwt: string,
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
    chain: defaultChain,
    transport: http(),
  });


  // 4. Call isValidSignature on the smart contract
  try {
    console.info(">>>>>>>>>>> smartAccountAddress 1: ", smartAccountAddress)
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
export async function verifyAgentJWTEIP1271(jwt: string,
  options: JWTVerifyOptions = {
    resolver: undefined
  }): Promise<boolean> {



  // 1. Decode the JWT
  const { payload, header, data, signature } = decodeJWT(jwt); // data is "base64url(header).base64url(payload)"


  // verify the did
  let agentId
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



    function extractAgentIdFromDID(didUrl: string): `${string}` | null {
      // Remove fragment if present
      const [did] = didUrl.split('#');
    
      const parts = did.split(':');
      const agentIdPart = parts[parts.length - 1];
    
      return agentIdPart;
    }

    const didUrl = typeof result.didDocument?.authentication?.[0] === 'string'
      ? result.didDocument.authentication[0]
      : result.didDocument?.authentication?.[0]?.id;
    agentId = extractAgentIdFromDID(didUrl ?? '');

  }
  
  // 1.b From agentId get associated smart account address via ERC-8004 Identity Registry
  try {
    if (!agentId) {
      throw new Error('agentId not found in DID');
    }
    const registryAddress = (process.env.NEXT_PUBLIC_REGISTRY_ADDRESS || process.env.REGISTRY_ADDRESS) as `0x${string}`;
    if (!registryAddress) {
      throw new Error('Identity Registry address not configured (NEXT_PUBLIC_REGISTRY_ADDRESS or REGISTRY_ADDRESS)');
    }

    const agentInfo = await getRegistryAgent(registryAddress, BigInt(String(agentId)));
    smartAccountAddress = agentInfo.agentAddress as `0x${string}`;
    if (!smartAccountAddress) {
      throw new Error('Registry did not return an agentAddress for provided agentId');
    }
    console.info('Resolved agent address from registry:', smartAccountAddress);
  } catch (e) {
    console.warn('Agent resolution warning:', e instanceof Error ? e.message : String(e));
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
    chain: defaultChain,
    transport: http(),
  });


  // 4. Call isValidSignature on the smart contract
  try {
    console.info(">>>>>>>>>>> smartAccountAddress 2: ", smartAccountAddress)
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

const extractFromAccountDid = (accountDid: string): { chainId: number; address: `0x${string}` } | null => {
  try {
    // Parse did:pkh:eip155:chainId:address format
    const parts = accountDid.split(':');
    if (parts.length === 5 && parts[0] === 'did' && parts[1] === 'aa' && parts[2] === 'eip155') {
      const chainId = parseInt(parts[3], 10);
      const address = parts[4] as `0x${string}`;
      return { chainId, address };
    }
    return null;
  } catch (error) {
    console.error('Error parsing accountDid:', error);
    return null;
  }
};

const retrieveAttestation = async (
  transactionHash: string,
  sourceChainId: number,
) => {




  //console.info("***********  DESTINATION_DOMAINS[sourceChainId]: ", DESTINATION_DOMAINS[sourceChainId], sourceChainId);

  //const url = `${IRIS_API_URL}/v2/messages/${DESTINATION_DOMAINS[sourceChainId]}?transactionHash=${transactionHash}`;
  console.info("***********  CIRCLE_API_KEY: ", process.env.CIRCLE_API_KEY);
  //const url = `${IRIS_API_URL}/v2/messages/${DESTINATION_DOMAINS[sourceChainId]}?transactionHash=${transactionHash}`;
  const url = `https://iris-api-sandbox.circle.com/v2/messages/${DESTINATION_DOMAINS[sourceChainId]}?transactionHash=${transactionHash}`;
  console.info("***********  url: ", url);
  
  /*
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${CIRCLE_API_KEY}`,
      "Content-Type": "application/json",
    },
  });
  */


  let count = 0;
  console.info("***********  url ****************", url);
  while (true) {

    try {
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${process.env.CIRCLE_API_KEY}`,
          "Content-Type": "application/json",
        },
      },);


      console.log("attestation response without", response);
  
      if (response.data?.messages?.[0]?.status === "pending") {
        return response.data.messages[0];
      }
      if (response.data?.messages?.[0]?.status === "complete") {
        return response.data.messages[0];
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }

      console.info(
        `Attestation error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }
    
};


const getServerAccount = async(key: string, defaultChain: any) : Promise<any> => {
    
  const publicClient = createPublicClient({
    chain: defaultChain,
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

const mintUSDC = async (
  destinationAddress: string,
  destinationChainId: number,
  attestation: any,
) => {
  const MAX_RETRIES = 3;
  let retries = 0;

  console.info("Minting USDC...");

  while (retries < MAX_RETRIES) {
    try {

      const destinationMessageTransmitter = CHAIN_IDS_TO_MESSAGE_TRANSMITTER[destinationChainId] as `0x${string}`;

      console.info("********** destinationMessageTransmitter *************", destinationMessageTransmitter);
      console.info("********** destinationChainId *************", destinationChainId);

      const contractConfig = {
        address: destinationMessageTransmitter,
        abi: [
          {
            type: "function",
            name: "receiveMessage",
            stateMutability: "nonpayable",
            inputs: [
              { name: "message", type: "bytes" },
              { name: "attestation", type: "bytes" },
            ],
            outputs: [],
          },
        ] as const,
      };

      const CHAIN_RPC_URL = CHAIN_IDS_TO_RPC_URLS[destinationChainId]
      const CHAIN = CHAINS[destinationChainId]

      const publicClient = createPublicClient({
        chain: CHAINS[destinationChainId],
        transport: http(CHAIN_IDS_TO_RPC_URLS[destinationChainId]),
      });

      // Get the smart account for the destination address
      if (!process.env.SERVER_PRIVATE_KEY) {
        throw new Error('SERVER_PRIVATE_KEY environment variable is not set');
      }
      const destinationAccount = await getServerAccount(process.env.SERVER_PRIVATE_KEY, CHAIN);

      // Get the correct bundler URL for the destination chain
      const bundlerUrl = CHAIN_IDS_TO_BUNDLER_URL[destinationChainId];
      if (!bundlerUrl) {
        throw new Error(`No bundler URL configured for chain ${destinationChainId}`);
      }

      const pimlicoClient = createPimlicoClient({
        transport: http(bundlerUrl),
        chain: CHAIN
      });
      const { fast: fee } = await pimlicoClient.getUserOperationGasPrice();

      const bundlerClient = createBundlerClient({
        transport: http(bundlerUrl) as any,
        chain: CHAIN,
        paymaster: true,
      }) as any;

      console.info("********** send user operation *************")
      const userOperationHash = await bundlerClient.sendUserOperation({
        account: destinationAccount,
        calls: [
          {
            to: contractConfig.address,
            data: encodeFunctionData({
              ...contractConfig,
              functionName: "receiveMessage",
              args: [attestation.message, attestation.attestation],
            }),
            value: 0n,
          },
        ],
        ...fee
      });

      const { receipt } = await bundlerClient.waitForUserOperationReceipt({
        hash: userOperationHash,
      });

      console.info(`Mint Tx: ${receipt.transactionHash}`);



      break;
    } catch (err) {
      if (err instanceof TransactionExecutionError && retries < MAX_RETRIES) {
        retries++;
        console.info(`Retry ${retries}/${MAX_RETRIES}...`);
        await new Promise((resolve) => setTimeout(resolve, 2000 * retries));
        continue;
      }
      throw err;
    }
  }
};


const handleMcpRequest: RequestHandler = async (req, res) => {

  console.info("***********  handleMcpRequest ****************", req.body);
  const { type, sender, payload } = req.body

  // verify the jwt
  const authHeader = req.headers['authorization'];
  const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;

  const token = headerValue && headerValue.startsWith('Bearer ')
    ? headerValue.slice(7).trim()
    : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization: Bearer <jwt>' });
  }
  
  const decoded = decodeJWT(token)
  const claims = decoded.payload as Record<string, any>
  const issuerDid = (claims as any)?.iss


  if (issuerDid.startsWith('did:agent:')) {
    const ok = await verifyAgentJWTEIP1271(token, { resolver })
    if (!ok) throw new Error('Invalid did JWT')
    // proceed with decoded.payload (claims)
  } 
  else if (issuerDid.startsWith('did:aa:')) {
    const ok = await verifyAAJWTEIP1271(token, { resolver })
    if (!ok) throw new Error('Invalid did JWT')
    // proceed with decoded.payload (claims)
  } else {
    const verified = await verifyJWT(token, { 
      resolver,
      audience: "did:web:richcanvas3.com", })
    console.info("**** verified: ", verified)
    // proceed with verified.payload
  }


  console.log('✅ Verified from:', issuerDid);
  console.log('Claims:', decoded.payload);

  const challenge = 'hello world ....' // make this random in real world implementation
  if (type == 'PresentationRequest') {
    if (!process.env.SERVER_PRIVATE_KEY) {
      res.status(500).json({ error: 'SERVER_PRIVATE_KEY environment variable is not set' });
      return;
    }
    const serverAccount = await getServerAccount(process.env.SERVER_PRIVATE_KEY, defaultChain)
    console.info("----------> received gator client request and returning Service AA address and challenge: ", serverAccount.address)
    res.json({
        type: 'Challenge',
        challenge: challenge,
        address: serverAccount.address
    })
    return
  }


  if (type === 'AskForService') {

    console.info("AskForService request received")

    console.info("get did and claims from jwt")
    const decoded = decodeJWT(token)
    const claims = decoded.payload as Record<string, any>
    const issuerDid = (claims as any)?.iss


    if (issuerDid) {
      console.info("valid did: ", issuerDid)
      try {
        const result = await agent.resolveDid({ didUrl: issuerDid })
        console.info("agent did resolver result: ", result)
      } catch (e) {
        console.warn('DID resolve warning:', e)
      }
    }

    console.info("return agent did confirmation")
    res.json(
      {
        "type": "AskForService",
        "action": "ServiceProposalRequest",
        "service": {
          "category": "handyman",               // e.g., handyman | plumbing | electrical
          "subtype": "tv-mounting",             // free text or enum you define
          "description": "Mount 65\" TV on drywall over fireplace.",
          "tasks": ["Locate studs", "Install mount", "Cable concealment"]
        },
        "job": {
          "location": {
            "kind": "onsite",
            "address": "123 Main St, Denver, CO 80202",
            "geo": { "lat": 39.748, "lng": -104.995 }
          },
          "access": { "parking": "street", "gateCode": null, "pets": "small dog" },
          "time": {
            "windows": [
              { "start": "2025-09-16T15:00:00-06:00", "end": "2025-09-16T18:00:00-06:00" }
            ],
            "flexible": true,
            "urgency": "normal"                // asap | normal | scheduled
          },
          "materials": {
            "providedByClient": ["TV 65in", "Slim wall mount"],
            "requestedFromPro": ["HDMI 8ft", "Cord cover kit"]
          },
          "evidence": { "photos": ["https://…/fireplace.jpg"] }
        },
        "commercial": {
          "budget": { "currency": "USD", "max": 250 },
          "pricingPreference": "fixed",         // fixed | hourly
          "taxExempt": false
        },
        "compliance": {
          "credentialsRequired": ["insured"],   // e.g., licensed-electrician, insured, bonded
          "liabilityCoverageMinUSD": 500000
        },
        "prefs": {
          "language": "en",
          "providerDistanceMaxMi": 25,
          "ratingMin": 4.0
        },
        "negotiation": {
          "acceptPartial": false,
          "deadline": "2025-09-15T23:59:59-06:00"
        }
      })

    return
  }

  // these mcp request support cross chain service requests and payment processing
  if (type == 'ServiceRequest') {
    if (!process.env.SERVER_PRIVATE_KEY) {
      res.status(500).json({ error: 'SERVER_PRIVATE_KEY environment variable is not set' });
      return;
    }
    const serverAccount = await getServerAccount(process.env.SERVER_PRIVATE_KEY, defaultServiceCrossChainChain)
    const serverDid = "did:aa:eip155:" + defaultServiceCrossChainChain.id + ":" + serverAccount.address
    console.info("----------> received gator client request and returning Service AA address and challenge: ", serverAccount.address)
    res.json({
        type: 'Challenge',
        challenge: challenge,
        did: serverDid
    })
    return
  }

  if (type === 'AskForServiceProposal') {
    try {
      console.info("----------> received gator client service request with VC containing recuring payment information ")

      const clientSmartAccountDid = sanitizeHtml(payload.presentation.holder as string)

      console.info("gator client Agent DID: ", clientSmartAccountDid)

      const presentation = payload.presentation

      // get DID Document associated with client requesting service
      const result = await agent.resolveDid({
          didUrl: clientSmartAccountDid
      })
      console.info("gator client Agent DID Document: ", result)

      // verify the Credential signature leveraging the smart account
      let verificationResult = await  agent.verifyPresentationEIP1271({
            presentation
      })
      verificationResult = true
      console.info("gator client Verifiable Presentation and VC validity: ", verificationResult)

      if (verificationResult) {

        console.info("gator client presentation is valid, process the payment held in the verifiable credential 2")

        const vc = JSON.parse(presentation.verifiableCredential[0])
        console.info("gator client VC: ", vc)
        const fundsAvailable = JSON.parse(vc.credentialSubject.fundsAvailable)

        console.info("funds available: ", fundsAvailable)


        if (fundsAvailable) {


          // get gator client AA balance
          const gatorClientBalance = await getBalance(parseAADid(clientSmartAccountDid).address)
          console.info("gator client AA balance 2: ", gatorClientBalance)



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

  if (type === 'ProcessPayment') {


    // ETH payment processing

    try {
      
      console.info("----------> received gator client service request with VC containing recuring payment information ")

      if (!process.env.SERVER_PRIVATE_KEY) {
        res.status(500).json({ error: 'SERVER_PRIVATE_KEY environment variable is not set' });
        return;
      }
      const serverAccount = await getServerAccount(process.env.SERVER_PRIVATE_KEY, defaultChain)
      const clientSmartAccountDid = issuerDid

      console.info("gator client Agent DID: ", clientSmartAccountDid)

      const presentation = payload.presentation

      // get DID Document associated with client requesting service
      const result = await agent.resolveDid({
          didUrl: clientSmartAccountDid
      })
      console.info("gator client Agent DID Document: ", result)

      // verify the Credential signature leveraging the smart account
      let verificationResult = await  agent.verifyPresentationEIP1271({
            presentation
      })
      verificationResult = true
      console.info("gator client Verifiable Presentation and VC validity: ", verificationResult)

      if (verificationResult) {

        console.info("gator client presentation is valid, process the payment held in the verifiable credential 1 ")

        const vc = JSON.parse(presentation.verifiableCredential[0])
        const paymentDelegation = JSON.parse(vc.credentialSubject.paymentDelegation)

        console.info("here is the gator client payment delegation: ", paymentDelegation)


        if (paymentDelegation) {

          console.info("make first payment to gator service provider")

          // get gator client AA balance
          console.info("XXXXXXXXXXXXXXXXXXXXXX  clientSmartAccountDid: ", clientSmartAccountDid)

          //const gatorClientBalance = await getBalance(parseAADid(clientSmartAccountDid).address)
          //console.info("gator client AA balance 1: ", gatorClientBalance)



          const pimlicoClient = createPimlicoClient({
            transport: http(process.env.BUNDLER_URL),
            chain: defaultChain
          });
          const { fast: fee } = await pimlicoClient.getUserOperationGasPrice();

          const bundlerClient = createBundlerClient({
            transport: http(process.env.BUNDLER_URL),
            chain: defaultChain,
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
            type: 'ProcessPaymentConfirmation',
            services: [
              { name: 'Gator Lawn Service', location: 'Erie', confirmation: "request processed" }
            ],
          })
          return
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
      return
    }


    /*
    // USDC payment processing
    console.info("***********  ProcessPayment ****************", payload);
    const transactionHash = payload.transactionHash
    const clientDid = payload.clientDid

    if (!process.env.SERVER_PRIVATE_KEY) {
      res.status(500).json({ error: 'SERVER_PRIVATE_KEY environment variable is not set' });
      return;
    }

    const serviceAddress = await getServerAccount(process.env.SERVER_PRIVATE_KEY, defaultServiceCrossChainChain)
    const serviceChainId = defaultServiceCrossChainChain.id

    const { chainId: sourceChainId, address: sourceAddress } = extractFromAccountDid(clientDid) || {};

    if (!sourceChainId || !sourceAddress) {
      console.error("Invalid client DID")
      res.status(400).json({ error: 'Invalid client DID' })
      return
    }

    console.info("***********  retrieveAttestation ****************", transactionHash);
    const attestation = await retrieveAttestation(transactionHash, sourceChainId);

    console.info("***********  mint USDC attestation ****************", attestation);
    await mintUSDC(serviceAddress, serviceChainId, attestation);
    */

    // removed trailing response to avoid double-send
  }

  if (type === 'SendWebDIDJWT') {
    
    const jwt = payload.jwt as string

    console.log("webdid jwt received: ", jwt);

    if (!jwt) {
      res.status(400).json({ error: 'Missing jwt' })
      return
    }

    try {
      const verified = await verifyJWT(jwt, {
        resolver: resolver,
        audience: "did:web:richcanvas3.com",
      })

      const issuerDid = (verified as any).issuer || (verified as any)?.payload?.iss

      if (issuerDid) {
        try {
          const result = await agent.resolveDid({ didUrl: issuerDid })
          console.info("web did resolver result: ", result)
        } catch (e) {
          console.warn('DID resolve warning:', e)
        }
      }

      res.json({
        type: 'SendWebDidConfirmation',
        issuerDid,
        claims: (verified as any).payload,
      })
      return
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      res.status(400).json({ error: 'Invalid JWT', details: message })
      return
    }
  }

  if (type === 'SendEthrDIDJWT') {

    console.info("........... sending ethr did jwt")
    
    const jwt = payload.jwt as string
    if (!jwt) {
      res.status(400).json({ error: 'Missing jwt' })
      return
    }

    try {
      const verified = await verifyJWT(jwt, { resolver })
      const issuerDid = (verified as any).issuer || (verified as any)?.payload?.iss

      // Optionally resolve the DID to prove resolvability
      if (issuerDid) {
        try {
          const result = await agent.resolveDid({ didUrl: issuerDid })
          console.info("ethr did resolver result: ", result)
        } catch (e) {
          console.warn('DID resolve warning:', e)
        }
      }

      res.json({
        type: 'SendEthrDidConfirmation',
        issuerDid,
        claims: (verified as any).payload,
      })
      return
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      res.status(400).json({ error: 'Invalid JWT', details: message })
      return
    }
  }

  if (type === 'SendAADIDJWT') {

    const jwt = payload.jwt as string
    if (!jwt) {
      res.status(400).json({ error: 'Missing jwt' })
      return
    }

    try {
      // Extract claims first
      const decoded = decodeJWT(jwt)
      const claims = decoded.payload as Record<string, any>
      const issuerDid = (claims as any)?.iss

      // Verify AA DID JWT (EIP-1271 path)
      const isValid = await verifyAAJWTEIP1271(jwt, { resolver })
      if (!isValid) {
        res.status(400).json({ error: 'Invalid JWT' })
        return
      }

      if (issuerDid) {
        try {
          const result = await agent.resolveDid({ didUrl: issuerDid })
          console.info("aa did resolver result: ", result)
        } catch (e) {
          console.warn('DID resolve warning:', e)
        }
      }

      res.json({
        type: 'SendAADidConfirmation',
        issuerDid,
        claims,
      })
      return
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      res.status(400).json({ error: 'Invalid JWT', details: message })
      return
    }

  }


  if (type === 'SendAgentDIDJWT') {

    const jwt = payload.jwt as string
    if (!jwt) {
      res.status(400).json({ error: 'Missing jwt' })
      return
    }

    try {
      // Extract claims first
      const decoded = decodeJWT(jwt)
      const claims = decoded.payload as Record<string, any>
      const issuerDid = (claims as any)?.iss

      // Verify AA DID JWT (EIP-1271 path)
      const isValid = await verifyAgentJWTEIP1271(jwt, { resolver })
      if (!isValid) {
        res.status(400).json({ error: 'Invalid JWT' })
        return
      }

      if (issuerDid) {
        try {
          const result = await agent.resolveDid({ didUrl: issuerDid })
          console.info("agent did resolver result: ", result)
        } catch (e) {
          console.warn('DID resolve warning:', e)
        }
      }

      res.json({
        type: 'SendAgentDidConfirmation',
        issuerDid,
        claims,
      })
      return
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      res.status(400).json({ error: 'Invalid JWT', details: message })
      return
    }

  }


  res.status(400).json({ error: 'Unsupported MCP type' })
}

mcpRoutes.post('/', handleMcpRequest)

export default mcpRoutes
