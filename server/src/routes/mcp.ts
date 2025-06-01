import express, { Request, Response, RequestHandler } from 'express'
import { agent } from '../agents/veramoAgent.js'
import sanitizeHtml from 'sanitize-html';
import dotenv from 'dotenv';


dotenv.config();

import { createPublicClient, createWalletClient, http, createClient, custom, parseEther, zeroAddress, toHex, type Address, encodeFunctionData, hashMessage } from "viem";
import { privateKeyToAccount, PrivateKeyAccount, generatePrivateKey } from "viem/accounts";

import { createPimlicoClient } from "permissionless/clients/pimlico";
import { erc7710BundlerActions } from "@metamask/delegation-toolkit/experimental";

const mcpRoutes: express.Router = express.Router()

import {
  Implementation,
  toMetaMaskSmartAccount,
} from "@metamask/delegation-toolkit";
import { sepolia } from 'viem/chains';

import {
  createBundlerClient,
} from "viem/account-abstraction";

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
  console.info("serverAccount: ", serverAccount)


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

const handleMcpRequest: RequestHandler = async (req, res) => {
  const { type, sender, payload } = req.body

  const serverAccount = await getServerAccount()


  const challenge = 'hello world ....' // make this random in real world implementation
  if (type == 'PresentationRequest') {

    console.info("----------> received presentation request and returning address and challenge: ", serverAccount.address)
    res.json({
        type: 'Challenge',
        challenge: challenge,
        address: serverAccount.address
    })
    return
  }

  if (type === 'AskForService') {
    try {
      console.info("----------> request has VC of request and payment information ")

      const clientSmartAccountDid = sanitizeHtml(payload.presentation.holder as string)

      const presentation = payload.presentation

      // get DID Document associated with client requesting service
      const result =agent.resolveDid({
          didUrl: clientSmartAccountDid
      })
      

      // verify the Credential signature leveraging the smart account
      const verificationResult = await  agent.verifyPresentationEIP1271({
            presentation
      })
      console.info("are we good here?: ", verificationResult)

      if (verificationResult) {

        console.info("process the payment held in the verifiable credential ")

        const vc = JSON.parse(presentation.verifiableCredential[0])
        const permission = JSON.parse(vc.credentialSubject.permission)

        console.info("payment permission: ", permission)

        const { accountMeta, context, signerMeta } = permission;

        //console.log('context in RedeemDelegation.tsx:', context);
        //console.log('accountMeta in RedeemDelegation.tsx:', accountMeta);
        //console.log('signerMeta in RedeemDelegation.tsx:', signerMeta);
  
        if (!signerMeta) {
          console.error("No signer meta found");
          return;
        }
        const { delegationManager } = signerMeta;

        if (delegationManager) {

          const publicClient = createPublicClient({
            chain: sepolia,
            transport: http(),
          });

          const pimlicoClient = createPimlicoClient({
            transport: http(process.env.BUNDLER_URL),
            chain: sepolia
          });
          const { fast: fee } = await pimlicoClient.getUserOperationGasPrice();

          const bundlerClient = createBundlerClient({
            transport: http(process.env.BUNDLER_URL) as any,
            chain: sepolia as any,
            paymaster: true,
          }).extend(erc7710BundlerActions()) as any;


          const userOperationHash = await bundlerClient!.sendUserOperationWithDelegation({
              publicClient,
              account: serverAccount,
              calls: [
              {
                  to: serverAccount.address,
                  data: "0x",
                  value: 1n,
                  permissionsContext: context,
                  delegationManager,
              },
              ],
              ...fee,
              accountMetadata: accountMeta,
              
          });
          const { receipt } = await bundlerClient!.waitForUserOperationReceipt({
              hash: userOperationHash,
          });
          
          
          console.info("payment receipt: ", receipt)


          res.json({
            type: 'ServiceRequestConfirmation',
            services: [
              { name: 'Gator Lawn Service', location: 'Erie', confirmation: "request processed" }
            ],
          })
        } 
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
