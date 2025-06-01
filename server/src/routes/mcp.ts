import express, { Request, Response, RequestHandler } from 'express'
import { agent } from '../agents/veramoAgent.js'
import sanitizeHtml from 'sanitize-html';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { createPublicClient, createWalletClient, http, createClient, custom, parseEther, zeroAddress, toHex, type Address, encodeFunctionData, hashMessage } from "viem";
import { privateKeyToAccount, PrivateKeyAccount, generatePrivateKey } from "viem/accounts";

import { createPimlicoClient } from "permissionless/clients/pimlico";
import { erc7710BundlerActions } from "@metamask/delegation-toolkit/experimental";
import { erc7715ProviderActions } from "@metamask/delegation-toolkit/experimental";

const mcpRoutes: express.Router = express.Router()

import {
  Implementation,
  MetaMaskSmartAccount,
  toMetaMaskSmartAccount,
  getDeleGatorEnvironment,
  overrideDeployedEnvironment
} from "@metamask/delegation-toolkit";
import { sepolia } from 'viem/chains';

import {
  createBundlerClient,
  createPaymasterClient,
  UserOperationReceipt,
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
  console.info("serverPrivateKey: ", serverPrivateKey)
  
  if (!/^0x[0-9a-fA-F]{64}$/.test(serverPrivateKey)) {
    throw new Error('Invalid private key format. Must be 32 bytes (64 hex characters) with optional 0x prefix');
  }

  const serverAccount = privateKeyToAccount(serverPrivateKey);
  console.info("serverAccount: ", serverAccount)

  // build individuals AA for EOA Connected Wallet
  const environment = getDeleGatorEnvironment(sepolia.id);

  const accountClient = await toMetaMaskSmartAccount({
      client: publicClient as any,
      implementation: Implementation.Hybrid,
      environment,
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
  console.info("----------> received presentation request and returning challenge: ", serverAccount.address)

  const challenge = 'hello world ....'
  if (type == 'PresentationRequest') {


    res.json({
        type: 'Challenge',
        challenge: challenge,
        address: serverAccount.address
    })
    return
  }

  if (type === 'AskForService') {
    try {
      console.info("----------> received client request with verifiable presentation ")

      const didHolder = sanitizeHtml(payload.presentation.holder as string)

      console.info("client did: ", didHolder)

      const presentation = payload.presentation
      console.info("presentation: ", presentation)

      const result =agent.resolveDid({
          didUrl: didHolder
      })
      

      console.info("client did document: ", result)
      const verificationResult = await  agent.verifyPresentationEIP1271({
            presentation
      })
   
      console.info("are we good here?: ", verificationResult)
      if (verificationResult) {

        console.info("processing verified presentation: ", presentation)

        const vc = JSON.parse(presentation.verifiableCredential[0])
        const permission = JSON.parse(vc.credentialSubject.permission)

        console.info("permission: ", permission)

        const { accountMeta, context, signerMeta } = permission;

        console.log('context in RedeemDelegation.tsx:', context);
        console.log('accountMeta in RedeemDelegation.tsx:', accountMeta);
        console.log('signerMeta in RedeemDelegation.tsx:', signerMeta);
  
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

          console.info("send user operation 1")
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


          
          console.info("sendUserOperationWithDelegation")
          const userOperationHash = await bundlerClient!.sendUserOperationWithDelegation({
              publicClient,
              account: serverAccount,
              //nonce,
              calls: [
              {
                  to: serverAccount.address,
                  data: "0x",
                  value: 1n,
                  permissionsContext: context,
                  delegationManager,
              },
              ],
              // Appropriate values must be used for fee-per-gas. 
              //paymaster: paymasterClient,
              ...fee,
              accountMetadata: accountMeta,
              
          });
          const { receipt } = await bundlerClient!.waitForUserOperationReceipt({
              hash: userOperationHash,
          });
          
          
          console.info("transaction receipt: ", receipt)


          res.json({
            type: 'ServiceList',
            services: [
              { name: 'Lawn Hero', location: 'Erie', rating: 4.8 },
              { name: 'GreenCare Co', location: 'Erie', rating: 4.5 },
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
