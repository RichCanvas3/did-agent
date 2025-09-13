import React  from 'react';
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { type TypedDataDomain, type TypedDataField } from 'ethers';
import { ethers } from "ethers";
import { sepolia } from "viem/chains";
import { createPublicClient, parseAbi, formatUnits, TransactionExecutionError, Hex, createWalletClient, http, createClient, custom, parseEther, zeroAddress, toHex, type Address, encodeFunctionData, hashMessage } from "viem";
import { agent } from '../../agents/veramoAgent';
import { 
  CreateDelegationOptions, 
  Implementation, 
  toMetaMaskSmartAccount, 
  createCaveatBuilder, 
  createDelegation,
  DelegationFramework,
  SINGLE_DEFAULT_MODE,
} from "@metamask/delegation-toolkit";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { createBundlerClient } from "viem/account-abstraction";
import { AAKmsSigner } from '@mcp/shared';
import { privateKeyToAccount, PrivateKeyAccount, generatePrivateKey } from "viem/accounts";
import DelegationService from '../../service/DelegationService';
import { IRIS_API_URL, CHAIN_IDS_TO_EXPLORER_URL, CHAIN_IDS_TO_MESSAGE_TRANSMITTER, CIRCLE_SUPPORTED_CHAINS, CHAIN_IDS_TO_USDC_ADDRESSES, CHAIN_TO_CHAIN_NAME, CHAIN_IDS_TO_TOKEN_MESSENGER, CHAIN_IDS_TO_RPC_URLS, DESTINATION_DOMAINS, CHAINS, CHAIN_IDS_TO_BUNDLER_URL } from '../../libs/chains';

export const McpAgentToAgentUsdc: React.FC = () => {
  const [usdcTransferResults, setUsdcTransferResults] = useState<any>(null);
  const [usdcTransferLoading, setUsdcTransferLoading] = useState(false);
  const [eoaAddress, setEoaAddress] = useState<string>('');
  const [eoaBalance, setEoaBalance] = useState<string>('');
  const [aaBalance, setAaBalance] = useState<string>('');
  const [aaWalletAddress, setAaWalletAddress] = useState<string>('');
  const chain = sepolia;

  const provider = (window as any).ethereum;

  const login = async () => {
    console.info("*********** login ****************")
    const selectedNetwork = await provider.request({ method: "eth_chainId" });

    if (parseInt(selectedNetwork) !== chain.id) {
      console.info("*********** switchEthereumChain ****************")
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [
          {
            chainId: toHex(chain.id),
          },
        ],
      });
    }

    console.info("*********** eth_requestAccounts ****************")
    const [owner] = (await provider.request({
      method: "eth_requestAccounts",
    })) as Address[];

    console.info("*********** createWalletClient ****************")
    const walletClient = createWalletClient({
      chain: chain,
      transport: custom(provider),
      account: owner as `0x${string}`
    });

    console.info("........> wallet address: ", owner);

    return {
      owner,
      signatory: { walletClient: walletClient },
    };
  };

  const getEOASmartAccount = async(
    owner: any,
    signatory: any,
    publicClient: any
  ) : Promise<any> => {
    console.info("Creating smart account with owner:", owner);

    const accountClient = await toMetaMaskSmartAccount({
      client: publicClient as any,
      implementation: Implementation.Hybrid,
      deployParams: [
          owner,
        [] as string[],
        [] as bigint[],
        [] as bigint[]
      ] as [owner: `0x${string}`, keyIds: string[], xValues: bigint[], yValues: bigint[]],
      deploySalt: "0x0000000000000000000000000000000000000000000000000000000000000001",
      signatory: signatory as any,
    });

    console.info("Smart account created with address:", accountClient.address);
    const isDeployed = await accountClient.isDeployed();
    console.info("Smart account deployment status:", isDeployed);

    if (!isDeployed) {
      console.info("Deploying smart account...");
      const pimlicoClient = createPimlicoClient({
        transport: http(import.meta.env.VITE_BUNDLER_URL),
        chain: chain
      });

      const bundlerClient = createBundlerClient({
        transport: http(import.meta.env.VITE_BUNDLER_URL) as any,
        chain: chain,
        paymaster: true,
      }) as any;

      const { fast: fee } = await pimlicoClient.getUserOperationGasPrice();

      try {
        const userOperationHash = await bundlerClient.sendUserOperation({
          account: accountClient,
          calls: [
            {
              to: accountClient.address,
              data: "0x",
              value: 0n,
            },
          ],
          callGasLimit: 5000000n,
          verificationGasLimit: 5000000n,
          preVerificationGas: 2000000n,
          maxFeePerGas: fee.maxFeePerGas,
          maxPriorityFeePerGas: fee.maxPriorityFeePerGas,
        });

        console.info("Waiting for deployment receipt...");
        const { receipt } = await bundlerClient.waitForUserOperationReceipt({
          hash: userOperationHash,
        });
        console.info("Deployment receipt 1:", receipt);
      } catch (error) {
        console.error("Deployment error:", error);
        throw error;
      }
    }

    return accountClient;
  };

  async function getBalance(address: string, chainId: number) {
    const rpcUrl = CHAIN_IDS_TO_RPC_URLS[chainId];
    if (!rpcUrl) {
      console.error(`No RPC URL configured for chain ${chainId}`);
      return '0';
    }
    
    const sepProv = new ethers.JsonRpcProvider(rpcUrl);
    const balance = await sepProv.getBalance(address);
    const eth = ethers.formatEther(balance);
    console.log(`Balance: ${eth} ETH for address: ${address}`);
    return eth;
  }

  async function getUSDCBalance(address: string, chainId: number) {
    const rpcUrl = CHAIN_IDS_TO_RPC_URLS[chainId];
    if (!rpcUrl) {
      console.error(`No RPC URL configured for chain ${chainId}`);
      return '0';
    }
    
    const sepProv = new ethers.JsonRpcProvider(rpcUrl);
    const usdcAddress = CHAIN_IDS_TO_USDC_ADDRESSES[chainId] as string;
    
    // ERC-20 balanceOf function
    const usdcContract = new ethers.Contract(usdcAddress, [
      'function balanceOf(address) view returns (uint256)',
      'function decimals() view returns (uint8)'
    ], sepProv);
    
    try {
      const balance = await usdcContract.balanceOf(address);
      const decimals = await usdcContract.decimals();
      const usdcBalance = ethers.formatUnits(balance, decimals);
      console.log(`USDC Balance: ${usdcBalance} USDC for address: ${address} on chain ${chainId}`);
      return usdcBalance;
    } catch (error) {
      console.error(`Error fetching USDC balance for chain ${chainId}:`, error);
      return '0';
    }
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

  const burnUSDC = async (
    delegationChain: any,
    indivAccountClient: any,
    sourceChainId: number,
    amount: bigint,
    destinationChainId: number,
    destinationAddress: string,
    transferType: "fast" | "standard",
  ) => {
    console.info("*********** burnUSDC ****************");
    console.info("*********** delegationChain ****************", delegationChain);
    console.info("*********** indivAccountClient ****************", indivAccountClient);

    // Get the correct bundler URL for the source chain
    const bundlerUrl = CHAIN_IDS_TO_BUNDLER_URL[sourceChainId];
    if (!bundlerUrl) {
      throw new Error(`No bundler URL configured for chain ${sourceChainId}`);
    }

    const bundlerClient = createBundlerClient({
      transport: http(bundlerUrl),
      paymaster: true,
      chain: chain,
      paymasterContext: {
        mode: 'SPONSORED',
      },
    });

    let calls: any[] = [];

    // Use the actual amount parameter
    const fundingAmount = amount;

    const tokenMessenger = CHAIN_IDS_TO_TOKEN_MESSENGER[sourceChainId] as `0x${string}`
    const usdcAddress = CHAIN_IDS_TO_USDC_ADDRESSES[sourceChainId] as `0x${string}`
    const approvalExecution = {
      target: usdcAddress,
      callData: encodeFunctionData({
        abi: parseAbi(["function approve(address,uint)"]),
        functionName: "approve",
        args: [tokenMessenger, fundingAmount],
      }),
      value: 0n, // since it's an ERC-20 approval, you don't need to send ETH
    };

    const data0 = DelegationFramework.encode.redeemDelegations({
      delegations: [delegationChain],
      modes: [SINGLE_DEFAULT_MODE],
      executions: [[approvalExecution]]
    });

    const call0 = {
      to: indivAccountClient.address,
      data: data0,
    }

    calls.push(call0)

    const finalityThreshold = transferType === "fast" ? 1000 : 2000;
    const maxFee = fundingAmount - 1n;

    const mintRecipient = `0x${destinationAddress
      .replace(/^0x/, "")
      .padStart(64, "0")}`;

    const callData = encodeFunctionData({
      abi: [
        {
          type: "function",
          name: "depositForBurn",
          stateMutability: "nonpayable",
          inputs: [
            { name: "amount", type: "uint256" },
            { name: "destinationDomain", type: "uint32" },
            { name: "mintRecipient", type: "bytes32" },
            { name: "burnToken", type: "address" },
            { name: "hookData", type: "bytes32" },
            { name: "maxFee", type: "uint256" },
            { name: "finalityThreshold", type: "uint32" },
          ],
          outputs: [],
        },
      ],
      functionName: "depositForBurn",
      args: [
        fundingAmount,
        DESTINATION_DOMAINS[destinationChainId],
        mintRecipient as Hex,
        CHAIN_IDS_TO_USDC_ADDRESSES[sourceChainId] as `0x${string}`,
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        maxFee,
        finalityThreshold,
      ],
    })

    const execution = {
      target: CHAIN_IDS_TO_TOKEN_MESSENGER[sourceChainId] as `0x${string}`,
      callData: callData,
      value: 0n, // since it's an ERC-20 approval, you don't need to send ETH
    };

    console.info("*********** redeemDelegations ****************");
    const data = DelegationFramework.encode.redeemDelegations({
      delegations: [delegationChain],
      modes: [SINGLE_DEFAULT_MODE],
      executions: [[execution]]
    });

    const call = {
      to: indivAccountClient.address,
      data: data,
    }
    calls.push(call)

    const fee = {maxFeePerGas: 412596685n, maxPriorityFeePerGas: 412596676n}

    // Send user operation
    console.info("*********** sendUserOperation ****************");
    const userOpHash = await bundlerClient.sendUserOperation({
      account: indivAccountClient,
      calls: calls,
      ...fee
    });

    console.info("*********** waitForUserOperationReceipt ****************");
    const userOperationReceipt = await bundlerClient.waitForUserOperationReceipt({ hash: userOpHash });

    console.info("*********** burn tx ****************", userOperationReceipt);

    return userOperationReceipt;
  };

  const handleMCPAgentToAgentUSDCSend = async () => {
    try {
      console.info("*********** handleMCPAgentToAgentUSDCSend ****************")
      setUsdcTransferLoading(true);
      setUsdcTransferResults(null);

      console.info("*********** login ****************")
      const loginResp = await login()
      const publicClient = createPublicClient({
        chain: chain,
        transport: http(),
      });

      console.info("*********** getBurnerKeyFromStorage ****************")
      let burnerPrivateKey = await DelegationService.getBurnerKeyFromStorage(loginResp.owner)
      if (!burnerPrivateKey) {
        console.info("create new burner key")
        burnerPrivateKey = generatePrivateKey() as `0x${string}`;
        await DelegationService.saveBurnerKeyToStorage(loginResp.owner, burnerPrivateKey)
      }

      const burnerAccount = privateKeyToAccount(burnerPrivateKey as `0x${string}`);

      const burnerAccountClient = await toMetaMaskSmartAccount({
        client: publicClient,
        implementation: Implementation.Hybrid,
        deployParams: [burnerAccount.address, [], [], []],
        signatory: { account: burnerAccount },
        deploySalt: toHex(10),
      })

      const clientSubscriptionAccountClient = await getEOASmartAccount(loginResp.owner, loginResp.signatory, publicClient)
      console.info("client smart account address: ",  clientSubscriptionAccountClient.address)
      const isDeployedb = await publicClient.getCode({ address: clientSubscriptionAccountClient.address });
      console.info("isDeployedb .....: ", isDeployedb)

      setAaWalletAddress(clientSubscriptionAccountClient.address)

      // Ensure account is properly initialized
      if (!clientSubscriptionAccountClient || !clientSubscriptionAccountClient.address) {
        throw new Error("Failed to initialize account client");
      }

      const clientSubscriptionChainId = chain.id
      const clientSubscriberSmartAddress = clientSubscriptionAccountClient.address.toLowerCase()
      const clientSubscriberDid = "did:agent:eip155:" + clientSubscriptionChainId + ":" + clientSubscriberSmartAddress.toLowerCase()
      
      console.info("client subscription chain id: ", clientSubscriptionChainId)
      console.info("client subscriber smart account address : ", clientSubscriberSmartAddress)
      console.info("client subscriber did: ", clientSubscriberDid)

      // build delegation to burner account
      let burnerDel = createDelegation({
        to: burnerAccountClient.address,
        from: clientSubscriptionAccountClient.address,
        caveats: [] }
      );

      const signature = await clientSubscriptionAccountClient.signDelegation({
        delegation: burnerDel,
      });

      burnerDel = {
        ...burnerDel,
        signature,
      }

      // get challenge from organization providing service,  along with challenge phrase
      const challengeResult : any = await fetch('http://localhost:3001/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        type: 'ServiceRequest',
        payload: {
            action: 'ServiceSubscriptionRequest'
        },
        }),
      });

      const challengeData : any = await challengeResult.json()
      console.info("........ challengeResult: ", challengeData)

      // generate payment delegation for service account
      const { chainId: serviceChainId, address: serviceAddress } = extractFromAccountDid(challengeData.did) || {};
      console.info("serviceChainId: ", serviceChainId)
      console.info("serviceAddress: ", serviceAddress)

      // get balance for client subscriber smart account
      const aaBalance = await getBalance(clientSubscriberSmartAddress, serviceChainId)
      setAaBalance(aaBalance)
      console.info("client subscriber smart account balance: ", aaBalance)

      const availableFunds = {
        "USDC": 1000000000000000000000000,
        "ETH": aaBalance,
      }

      const isDeployed = await clientSubscriptionAccountClient?.isDeployed()
      console.info("************* is EOA Smart Account Deployed: ", isDeployed, clientSubscriptionAccountClient.address)

      if (isDeployed == false) {
        console.info("deploying client smart account")
        const pimlicoClient = createPimlicoClient({
          transport: http(import.meta.env.VITE_BUNDLER_URL),
          chain: chain
        });

        console.info("creating bundler client for chain: ", chain.name)
        console.info("creating bundler client for bundler: ", import.meta.env.VITE_BUNDLER_URL)

        const bundlerClient = createBundlerClient({
          transport: http(import.meta.env.VITE_BUNDLER_URL) as any,
          chain: chain,
          paymaster: true,
        }) as any;

        const { fast: fee } = await pimlicoClient.getUserOperationGasPrice();

        try {
          console.info("sending user operation to deploy client smart account")
          const userOperationHash = await bundlerClient!.sendUserOperation({
            account: clientSubscriptionAccountClient,
            calls: [
              {
                to: clientSubscriptionAccountClient.address,
                data: "0x",
                value: 0n,
              },
            ],
            callGasLimit: 3000000n,
            verificationGasLimit: 3000000n,
            preVerificationGas: 1000000n,
            maxFeePerGas: fee.maxFeePerGas,
            maxPriorityFeePerGas: fee.maxPriorityFeePerGas,
          });

          console.info("send user operation - done")
          const { receipt } = await bundlerClient!.waitForUserOperationReceipt({
            hash: userOperationHash,
          });
        }
        catch (error) {
          console.error("error deploying client smart account: ", error)
        }
      }

      // add did and key to our agent
      await agent.didManagerImport({
        did: clientSubscriberDid, 
        provider: 'did:agent:client',
        alias: 'subscriber-smart-account',
        keys:[]
      })

      await agent.keyManagerImport({
        kms: 'aa',
        kid: 'aa-' + clientSubscriberSmartAddress,
        type: 'Secp256k1',
        publicKeyHex: '0x', // replace with actual public key
        privateKeyHex: '0x' // replace with actual private key if available
      });

      const identifier = await agent.didManagerGet({ did: clientSubscriberDid });
      console.info("clientSubscriberDid did identifier: ", identifier)

      // construct the verifiable credential and presentation for service request and payment delegation
      // @ts-ignore
      const signerAAVC: AAKmsSigner = {
          async signTypedData(
            domain: TypedDataDomain,
            types: Record<string, Array<TypedDataField>>,
            value: Record<string, any>,
          ): Promise<string> {
              const result = await clientSubscriptionAccountClient?.signTypedData({
                  account: loginResp.owner, // EOA that controls the smart contract

                  // @ts-ignore
                  domain: domain as TypedDataDomain,
                  chainId: domain?.chainId,
                  types,
                  primaryType: 'VerifiableCredential',
                  message: value,
              });
              if (!result) {
                  throw new Error("signTypedData returned undefined");
              }

              console.info("owner account: ", loginResp.owner)
              console.info("client smart account signTypedData result: ", result)
              return result;
          },

          async getAddress(): Promise<Address> {
              if (!clientSubscriptionAccountClient) {
                  throw new Error("clientSubscriptionAccountClient is not initialized");
              }
              return clientSubscriptionAccountClient.address;
          },
      };

      const vcAA = await agent.createVerifiableCredentialEIP1271({
        credential: {
          issuer: { id: clientSubscriberDid },
          issuanceDate: new Date().toISOString(),
          type: ['VerifiableCredential'],
          credentialSubject: {
            id: clientSubscriberDid,
            fundsAvailable: JSON.stringify(availableFunds),
          },

          '@context': ['https://www.w3.org/2018/credentials/v1'],
        },

        signer: signerAAVC
      })

      console.info("service request and funds available verifiable credential: ", vcAA)

      // demonstrate verification of the verifiable credential
      const vcVerified = await agent.verifyCredentialEIP1271({ credential: vcAA, });
      console.info("verify VC: ", vcVerified)

      // @ts-ignore
      const signerAAVP: AAKmsSigner = {
          async signTypedData(
              domain: TypedDataDomain,
              types: Record<string, Array<TypedDataField>>,
              value: Record<string, any>,
          ): Promise<string> {
              console.info("signTypedData called with domain: ", domain);
              console.info("signTypedData called with types: ", types);
              console.info("signTypedData called with value: ", value);
              const result = await clientSubscriptionAccountClient?.signTypedData({
                  account: loginResp.owner, // EOA that controls the smart contract
                  // @ts-ignore
                  domain: domain,
                  chainId: domain?.chainId,
                  types,
                  primaryType: 'VerifiablePresentation',
                  message: value,
              });
              if (!result) {
                  throw new Error("signTypedData returned undefined");
              }
              return result;
          },

          async getAddress(): Promise<Address> {
              if (!clientSubscriptionAccountClient) {
                  throw new Error("clientSubscriptionAccountClient is not initialized");
              }
              return clientSubscriptionAccountClient.address;
          },

      };
      const vpAA = await agent.createVerifiablePresentationEIP1271(
          {
              presentation: {
                  holder: clientSubscriberDid,
                  verifiableCredential: [vcAA],
              },
              proofFormat: 'EthereumEip712Signature2021',
              challenge: challengeData.challenge,
              signer: signerAAVP
          }
      );
      console.info("verifiable presentation: ", vpAA)

      // demonstrate verification of the verifiable presentation
      const vpVerified = await agent.verifyPresentationEIP1271({ presentation: vpAA, });
      console.info("verify VP 1: ", vpVerified)

      const serviceAgentResponse = await fetch('http://localhost:3001/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        type: 'AskForServiceProposal',
        sender: clientSubscriberDid,
        payload: {
            location: 'Erie, CO',
            service: 'Lawn Care',
            presentation: vpAA
        },
        }),
      });

      const data = await serviceAgentResponse.json();

      // transfer USDC to service provider
      const sourceChainId = clientSubscriptionChainId
      const sourceAddress = clientSubscriptionAccountClient.address.toLowerCase()
      const destinationChainId = serviceChainId
      const destinationAddress = serviceAddress

      if (!sourceChainId || !destinationChainId || !sourceAddress || !destinationAddress) {
        return
      }
      
      console.info("************ sourceChainId: ", sourceChainId);
      console.info("************ sourceAddress: ", sourceAddress);
      console.info("************ destinationAddress: ", destinationAddress);
      console.info("************ destinationChainId: ", destinationChainId);

      const amount = 100000n

      const transferType = "fast";
      let burnTx = await burnUSDC(
        [burnerDel],
        burnerAccountClient,
        sourceChainId,
        amount,
        destinationChainId,
        destinationAddress,
        transferType,
      );

      const paymentPayload = {
        transactionHash: burnTx.receipt.transactionHash,
        clientDid: clientSubscriberDid
      }

      console.info("***********  transactionHash", burnTx.receipt.transactionHash);
      console.info("***********  clientSubscriberDid", clientSubscriberDid);

      const paymentResponse = await fetch('http://localhost:3001/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ProcessPayment',
          sender: clientSubscriberDid,
          payload: {
            transactionHash: burnTx.receipt.transactionHash,
            clientDid: clientSubscriberDid
          },
        }),
      });

      const dataPaymentRes = await paymentResponse.json();

      const name = dataPaymentRes.name
      const location = dataPaymentRes.location
      const confirmation = dataPaymentRes.confirmation

      // Get balances for both source and destination addresses
      console.info("*********** Getting final balances ****************");
      const sourceBalance = await getUSDCBalance(sourceAddress, sourceChainId);
      const destinationBalance = await getUSDCBalance(destinationAddress, destinationChainId);
      
      console.info("Source address USDC balance:", sourceBalance, "USDC");
      console.info("Destination address USDC balance:", destinationBalance, "USDC");

      // Set the USDC transfer results
      setUsdcTransferResults({
        name,
        location,
        confirmation,
        transactionHash: burnTx.receipt.transactionHash,
        amount: (Number(amount) / 10 ** 6).toFixed(2),
        sourceChainId,
        sourceAddress,
        sourceBalance,
        destinationChainId,
        destinationAddress,
        destinationBalance
      });

      return;
    
    } catch (err) {
      console.error('Error sending MCP message:', err);
      setUsdcTransferResults({ error: 'Request failed' });
    } finally {
      setUsdcTransferLoading(false);
    }
  };

  return (
    <div>
      <h2>MCP Agent-to-Agent USDC Transfer</h2>
      <div>
        <button className='service-button' onClick={handleMCPAgentToAgentUSDCSend} disabled={usdcTransferLoading}>
          {usdcTransferLoading ? 'Processing USDC Transfer...' : 'MCP agent-to-agent service agreement and CCTP v2 USDC transfer:aa:eip155:...'}
        </button>
      </div>
      
      {/* Flow Description Steps */}
      <div style={{ 
        marginTop: '20px', 
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#495057' }}>
          USDC Cross-Chain Transfer Flow
        </h3>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '15px' 
        }}>
          <div style={{ 
            padding: '15px',
            backgroundColor: 'white',
            borderRadius: '6px',
            border: '1px solid #e9ecef',
            borderLeft: '4px solid #007bff'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#007bff' }}>1. Authentication & Setup</h4>
            <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px', lineHeight: '1.5' }}>
              <li>Connect MetaMask wallet</li>
              <li>Switch to Sepolia testnet</li>
              <li>Deploy smart account (if not deployed)</li>
              <li>Generate burner account for delegation</li>
            </ul>
          </div>

          <div style={{ 
            padding: '15px',
            backgroundColor: 'white',
            borderRadius: '6px',
            border: '1px solid #e9ecef',
            borderLeft: '4px solid #28a745'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#28a745' }}>2. Service Request & Verification</h4>
            <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px', lineHeight: '1.5' }}>
              <li>Request service challenge from provider</li>
              <li>Create verifiable credential with funds info</li>
              <li>Sign credential with smart account (EIP-1271)</li>
              <li>Create verifiable presentation</li>
              <li>Submit service proposal</li>
            </ul>
          </div>

          <div style={{ 
            padding: '15px',
            backgroundColor: 'white',
            borderRadius: '6px',
            border: '1px solid #e9ecef',
            borderLeft: '4px solid #ffc107'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#ffc107' }}>3. USDC Burn & Cross-Chain Transfer</h4>
            <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px', lineHeight: '1.5' }}>
              <li>Create delegation to burner account</li>
              <li>Approve USDC spending for TokenMessenger</li>
              <li>Burn USDC on source chain (CCTP v2)</li>
              <li>Generate attestation via Circle API</li>
              <li>Submit burn transaction</li>
            </ul>
          </div>

          <div style={{ 
            padding: '15px',
            backgroundColor: 'white',
            borderRadius: '6px',
            border: '1px solid #e9ecef',
            borderLeft: '4px solid #dc3545'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#dc3545' }}>4. Payment Processing & Minting</h4>
            <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px', lineHeight: '1.5' }}>
              <li>Send payment notification to service provider</li>
              <li>Retrieve attestation from Circle API</li>
              <li>Mint USDC on destination chain</li>
              <li>Verify transaction completion</li>
              <li>Update balances and confirm payment</li>
            </ul>
          </div>
        </div>

        <div style={{ 
          marginTop: '15px', 
          padding: '12px',
          backgroundColor: '#e7f3ff',
          borderRadius: '6px',
          border: '1px solid #b3d9ff',
          fontSize: '14px',
          lineHeight: '1.5'
        }}>
          <strong>💡 Key Technologies:</strong> Account Abstraction (EIP-4337), Verifiable Credentials (EIP-1271), 
          Circle CCTP v2, MetaMask Delegation Toolkit, Cross-Chain USDC Transfer
        </div>
      </div>
      
      {usdcTransferResults && (
        <div style={{ 
          marginTop: '20px', 
          padding: '15px',
          backgroundColor: '#e8f5e8',
          borderRadius: '8px',
          border: '1px solid #28a745'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#155724' }}>
            USDC Cross Chain CCTP v2 Transfer Results
          </h3>
          
          <div style={{ 
            marginBottom: '10px', 
            padding: '10px',
            backgroundColor: 'white',
            borderRadius: '5px',
            border: '1px solid #d4edda'
          }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>USDC Amount: </strong>
              <span style={{ color: '#28a745', fontWeight: 'bold' }}>
                {usdcTransferResults.amount} USDC
              </span>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Source Chain ID: </strong>{usdcTransferResults.sourceChainId}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Source Address: </strong>
              <span style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
                {usdcTransferResults.sourceAddress}
              </span>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Source Balance: </strong>{usdcTransferResults.sourceBalance} USDC
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Destination Chain ID: </strong>{usdcTransferResults.destinationChainId}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Destination Address: </strong>
              <span style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
                {usdcTransferResults.destinationAddress}
              </span>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Destination Balance: </strong>{usdcTransferResults.destinationBalance} USDC
            </div>
            {usdcTransferResults.transactionHash && (
              <div style={{ marginBottom: '8px' }}>
                <strong>Transaction Hash: </strong>
                <span style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
                  {usdcTransferResults.transactionHash}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 