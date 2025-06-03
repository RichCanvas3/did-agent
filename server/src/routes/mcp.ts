import express, { Request, Response, RequestHandler } from 'express'
import { agent } from '../agents/veramoAgent.js'
import sanitizeHtml from 'sanitize-html';
import dotenv from 'dotenv';
import { ethers } from "ethers";

dotenv.config();

import { createPublicClient, createWalletClient, http, createClient, custom, parseEther, zeroAddress, toHex, type Address, encodeFunctionData, hashMessage } from "viem";
import { privateKeyToAccount, PrivateKeyAccount, generatePrivateKey } from "viem/accounts";

import { createPimlicoClient } from "permissionless/clients/pimlico";



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

const getServerAccount = async() : Promise<any> => {
    
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(),
  });

  if (!process.env.SERVER_PRIVATE_KEY) {
    throw new Error('SERVER_PRIVATE_KEY environment variable is not set');
  }

  const rawKey = process.env.SERVER_PRIVATE_KEY;
  const serverPrivateKey = (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as `0x${string}`;
  
  if (!/^0x[0-9a-fA-F]{64}$/.test(serverPrivateKey)) {
    throw new Error('Invalid private key format. Must be 32 bytes (64 hex characters) with optional 0x prefix');
  }

  const serverAccount = privateKeyToAccount(serverPrivateKey);
  console.info("gator link server EOA: ", serverAccount)


  const accountClient = await toMetaMaskSmartAccount({
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

  return accountClient
}



async function getBalance(address: string) {
  const balance = await provider.getBalance(address);
  const eth = ethers.formatEther(balance);
  console.log(`Balance: ${eth} ETH for address: ${address}`);
  return eth;
}

const handleMcpRequest: RequestHandler = async (req, res) => {
  const { type, sender, payload } = req.body

  const serverAccount = await getServerAccount()

  
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

  res.status(400).json({ error: 'Unsupported MCP type' })
}

mcpRoutes.post('/', handleMcpRequest)

export default mcpRoutes
