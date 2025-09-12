import React, { useState, useEffect } from 'react';
import { createPublicClient, http, createWalletClient, custom, toHex, type Address, zeroAddress } from 'viem';
import { sepolia } from 'viem/chains';
import { toMetaMaskSmartAccount, Implementation, createCaveatBuilder, createDelegation, DelegationFramework, SINGLE_DEFAULT_MODE } from '@metamask/delegation-toolkit';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { createBundlerClient } from 'viem/account-abstraction';
import { agent } from '../../agents/veramoAgent';
import { AgentKmsSigner } from '@mcp/shared';
import { type TypedDataDomain, type TypedDataField } from 'ethers';
import { ethers } from 'ethers';

export const McpAgentToAgentEth: React.FC = () => {
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [eoaAddress, setEoaAddress] = useState('');
  const [aaWalletAddress, setAaWalletAddress] = useState('');
  const [eoaBalance, setEoaBalance] = useState('');
  const [aaBalance, setAaBalance] = useState('');
  const chain = sepolia;

  const provider = (window as any).ethereum;

  const login = async () => {
    const selectedNetwork = await provider.request({ method: "eth_chainId" });

    if (parseInt(selectedNetwork) !== chain.id) {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [
          {
            chainId: toHex(chain.id),
          },
        ],
      });
    }

    const [owner] = (await provider.request({
      method: "eth_requestAccounts",
    })) as Address[];

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

  const getOtherSmartAccount = async(
    owner: any,
    signatory: any,
    publicClient: any
  ) : Promise<any> => {
    const accountClient = await toMetaMaskSmartAccount({
      client: publicClient as any,
      implementation: Implementation.Hybrid,
      deployParams: [
          owner,
        [] as string[],
        [] as bigint[],
        [] as bigint[]
      ] as [owner: `0x${string}`, keyIds: string[], xValues: bigint[], yValues: bigint[]],
      deploySalt: "0x0000000000000000000000000000000000000000000000000000000000000002",
      signatory: signatory as any,
    });

    const isDeployed = await accountClient.isDeployed();
    console.log("Smart account deployment status 2:", isDeployed);

    if (isDeployed == false) {
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
        console.info("Deployment receipt 2:", receipt);
      } catch (error) {
        console.error("Deployment error:", error);
        throw error;
      }
    } else {
        console.log("Smart account is deployed");
        console.log("........ smart accountClient: ", accountClient.address)
    }

    return accountClient;
  };

  async function getBalance(address: string) {
    const sepProv = new ethers.JsonRpcProvider(import.meta.env.VITE_RPC_URL);
    const balance = await sepProv.getBalance(address);
    const eth = ethers.formatEther(balance);
    console.log(`Balance: ${eth} ETH for address: ${address}`);
    return eth;
  }

  const fetchBalances = async () => {
    try {
      if ((window as any).ethereum) {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        if (accounts[0]) {
          const balance = await provider.getBalance(accounts[0]);
          setEoaAddress(accounts[0])
          setEoaBalance(ethers.formatEther(balance));
        }

        if (aaWalletAddress) {
          const aaBalance = await provider.getBalance(aaWalletAddress);
          setAaBalance(ethers.formatEther(aaBalance));
        }
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  };

  useEffect(() => {
    fetchBalances();
    const interval = setInterval(fetchBalances, 10000);
    return () => clearInterval(interval);
  }, [aaWalletAddress]);

  const handleMCPAgentToAgentEthSend = async () => {
    setLoading(true);

    try {
      // get challenge from organization providing service, along with challenge phrase
      const challengeResult : any = await fetch('http://localhost:3001/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        type: 'PresentationRequest',
        payload: {
            action: 'ServiceSubscriptionRequest'
        },
        }),
      });

      const challengeData : any = await challengeResult.json()
      console.info("........ challengeResult: ", challengeData)

      const loginResp = await login()
      const publicClient = createPublicClient({
        chain: chain,
        transport: http(),
      });

      // generate payment delegation for service account
      const smartServiceAccountAddress = challengeData.address

      const clientSubscriptionAccountClient = await getEOASmartAccount(loginResp.owner, loginResp.signatory, publicClient)
      console.info("client smart account address: ",  clientSubscriptionAccountClient.address)
      const isDeployedb = await publicClient.getCode({ address: clientSubscriptionAccountClient.address });
      console.info("isDeployedb .....: ", isDeployedb)
      const otherAccountClient = await getOtherSmartAccount(loginResp.owner, loginResp.signatory, publicClient)
      console.info("other account address: ",  otherAccountClient.address)

      setAaWalletAddress(clientSubscriptionAccountClient.address)

      const environment = clientSubscriptionAccountClient.environment;
      const caveatBuilder = createCaveatBuilder(environment);

      // get list of caveat types: https://docs.gator.metamask.io/how-to/create-delegation/restrict-delegation
      caveatBuilder.addCaveat("nativeTokenPeriodTransfer",
          10n, // 1 ETH in wei
          86400, // 1 day in seconds
          1743763600, // April 4th, 2025, at 00:00:00 UTC
      )

      const caveats = caveatBuilder.build()

      // Ensure account is properly initialized
      if (!clientSubscriptionAccountClient || !clientSubscriptionAccountClient.address) {
        throw new Error("Failed to initialize account client");
      }

      const clientSubscriberSmartAddress = clientSubscriptionAccountClient.address.toLowerCase()
      //const clientSubscriberDid = "did:aa:eip155:" + chain.id + ":" + clientSubscriberSmartAddress.toLowerCase()
      //console.info("client subscriber smart account address : ", clientSubscriberSmartAddress)
      //console.info("client subscriber did: ", clientSubscriberDid)

      const agentId = "13"
      const clientSubscriberDid = "did:agent:eip155:" + chain.id + ":" + agentId

      // get balance for client subscriber smart account
      const aaBalance = await getBalance(clientSubscriberSmartAddress)
      setAaBalance(aaBalance)
      console.info("client subscriber smart account balance: ", aaBalance)

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

      const isOtherDeployed = await otherAccountClient?.isDeployed()
      console.info("************* is Other Smart Account Deployed: ", isOtherDeployed, otherAccountClient.address)

      if (isOtherDeployed == false) {
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
        const userOperationHash = await bundlerClient!.sendUserOperation({
          account: otherAccountClient,
          calls: [
              {
              to: zeroAddress,
              },
          ],
          ...fee,
          });

          console.info("send user operation - done")
          const { receipt } = await bundlerClient!.waitForUserOperationReceipt({
          hash: userOperationHash,
        });
      }

      // create delegation to server smart account providing service these caveats
      let paymentDel = createDelegation({
        from: clientSubscriptionAccountClient.address,
        to: smartServiceAccountAddress,
        caveats: caveats }
      );

      const signature = await clientSubscriptionAccountClient.signDelegation({
        delegation: paymentDel,
      });

      paymentDel = {
        ...paymentDel,
        signature,
      }

      // add did and key to our agent
      await agent.didManagerImport({
        did: clientSubscriberDid,
        provider: 'did:agent:client',
        alias: 'subscriber-smart-account',
        keys:[]
      })

      await agent.keyManagerImport({
        kms: 'agent',
        kid: 'agent-' + agentId,
        type: 'Secp256k1',
        publicKeyHex: '0x',
        privateKeyHex: '0x'
      });

      const identifier = await agent.didManagerGet({ did: clientSubscriberDid });
      console.info("clientSubscriberDid did identifier: ", identifier)

      // construct the verifiable credential and presentation for service request and payment delegation
      const signerAgentVC: AgentKmsSigner = {
          async signTypedData(
            domain: TypedDataDomain,
            types: Record<string, Array<TypedDataField>>,
            value: Record<string, any>,
          ): Promise<string> {
              const result = await clientSubscriptionAccountClient?.signTypedData({
                  account: loginResp.owner,
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

      const vcAgent = await agent.createVerifiableCredentialEIP1271({
        credential: {
          issuer: { id: clientSubscriberDid },
          issuanceDate: new Date().toISOString(),
          type: ['VerifiableCredential'],
          credentialSubject: {
            id: clientSubscriberDid,
            paymentDelegation: JSON.stringify(paymentDel),
          },
          '@context': ['https://www.w3.org/2018/credentials/v1'],
        },
        signer: signerAgentVC
      })

      console.info("service request and payment delegation verifiable credential: ", vcAgent)

      // demonstrate verification of the verifiable credential
      const vcVerified = await agent.verifyCredentialEIP1271({ credential: vcAgent, });
      console.info("verify VC: ", vcVerified)

      const signerAgentVP: AgentKmsSigner = {
          async signTypedData(
              domain: TypedDataDomain,
              types: Record<string, Array<TypedDataField>>,
              value: Record<string, any>,
          ): Promise<string> {
              console.info("signTypedData called with domain: ", domain);
              console.info("signTypedData called with types: ", types);
              console.info("signTypedData called with value: ", value);
              const result = await clientSubscriptionAccountClient?.signTypedData({
                  account: loginResp.owner,
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
      
      const vpAgent = await agent.createVerifiablePresentationEIP1271(
          {
              presentation: {
                  holder: clientSubscriberDid,
                  verifiableCredential: [vcAgent],
              },
              proofFormat: 'EthereumEip712Signature2021',
              challenge: challengeData.challenge,
              signer: signerAgentVP
          }
      );
      console.info("verifiable presentation: ", vpAgent)

      // demonstrate verification of the verifiable presentation
      const vpVerified = await agent.verifyPresentationEIP1271({ presentation: vpAgent, });
      console.info("verify VP 2: ", vpVerified)

      const res = await fetch('http://localhost:3001/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        type: 'AskForService',
        sender: clientSubscriberDid,
        payload: {
            location: 'Erie, CO',
            service: 'Lawn Care',
            presentation: vpAgent
        },
        }),
      });

      const data = await res.json();

      setResponse(data);
      await fetchBalances()
      
    } catch (err) {
      console.error('Error sending MCP message:', err);
      setResponse({ error: 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>MCP Agent-to-Agent ETH Transfer</h2>
      <div>
        <button className='service-button' onClick={handleMCPAgentToAgentEthSend} disabled={loading}>
          {loading ? 'Sending...' : 'MCP agent-to-agent request and fund withdrawal.. VP holding VC for dd:aa:eip155:...'}
        </button>
      </div>

      {/* MCP Agent-to-Agent ETH Transfer Flow Description */}
      <div style={{ 
        marginTop: '20px', 
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '10px',
        border: '1px solid #dee2e6'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#495057' }}>
          MCP Agent-to-Agent ETH Transfer Flow
        </h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '15px' 
        }}>
          <div style={{ 
            padding: '15px',
            backgroundColor: '#e3f2fd',
            borderRadius: '8px',
            border: '1px solid #bbdefb'
          }}>
            <div style={{ 
              width: '30px', 
              height: '30px', 
              borderRadius: '50%', 
              backgroundColor: '#1976d2', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontWeight: 'bold',
              marginBottom: '10px'
            }}>
              1
            </div>
            <h4 style={{ margin: '0 0 8px 0', color: '#1565c0' }}>Authentication & Challenge</h4>
            <p style={{ margin: '0', fontSize: '0.9em', color: '#424242' }}>
              Request service challenge from MCP server, authenticate with MetaMask, and deploy smart accounts if needed.
            </p>
          </div>

          <div style={{ 
            padding: '15px',
            backgroundColor: '#f3e5f5',
            borderRadius: '8px',
            border: '1px solid #e1bee7'
          }}>
            <div style={{ 
              width: '30px', 
              height: '30px', 
              borderRadius: '50%', 
              backgroundColor: '#7b1fa2', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontWeight: 'bold',
              marginBottom: '10px'
            }}>
              2
            </div>
            <h4 style={{ margin: '0 0 8px 0', color: '#6a1b9a' }}>Payment Delegation</h4>
            <p style={{ margin: '0', fontSize: '0.9em', color: '#424242' }}>
              Create delegation with caveats for recurring payments, sign with smart account, and prepare for service request.
            </p>
          </div>

          <div style={{ 
            padding: '15px',
            backgroundColor: '#e8f5e8',
            borderRadius: '8px',
            border: '1px solid #c8e6c9'
          }}>
            <div style={{ 
              width: '30px', 
              height: '30px', 
              borderRadius: '50%', 
              backgroundColor: '#388e3c', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontWeight: 'bold',
              marginBottom: '10px'
            }}>
              3
            </div>
            <h4 style={{ margin: '0 0 8px 0', color: '#2e7d32' }}>Verifiable Credentials</h4>
            <p style={{ margin: '0', fontSize: '0.9em', color: '#424242' }}>
              Generate VC with payment delegation, create VP with challenge response, and verify using EIP-1271 signatures.
            </p>
          </div>

          <div style={{ 
            padding: '15px',
            backgroundColor: '#fff3e0',
            borderRadius: '8px',
            border: '1px solid #ffcc02'
          }}>
            <div style={{ 
              width: '30px', 
              height: '30px', 
              borderRadius: '50%', 
              backgroundColor: '#f57c00', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontWeight: 'bold',
              marginBottom: '10px'
            }}>
              4
            </div>
            <h4 style={{ margin: '0 0 8px 0', color: '#ef6c00' }}>Service Request & Payment</h4>
            <p style={{ margin: '0', fontSize: '0.9em', color: '#424242' }}>
              Submit service request with VP, execute delegation-based payment, and receive service confirmation.
            </p>
          </div>
        </div>
        
        <div style={{ 
          marginTop: '15px', 
          padding: '10px',
          backgroundColor: '#e8eaf6',
          borderRadius: '5px',
          border: '1px solid #c5cae9'
        }}>
          <strong style={{ color: '#3f51b5' }}>Key Technologies:</strong>
          <span style={{ fontSize: '0.9em', color: '#424242', marginLeft: '5px' }}>
            MetaMask Smart Accounts, Delegation Framework, Verifiable Credentials, EIP-1271, MCP Protocol, Pimlico Bundler
          </span>
        </div>
      </div>
      
      <div className="balance-info" style={{ 
        marginTop: '20px', 
        padding: '15px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 10px 0' }}>Wallet Balances</h3>
        <div style={{ display: 'flex', gap: '20px' }}>
          <div>
            <strong>Client EOA Address:</strong> {eoaAddress ? `${eoaAddress} ` : 'Loading...'}
          </div>
          <div>
            <strong>Client AA Wallet Balance:</strong> {aaWalletAddress ? `${aaWalletAddress} ` :  'Loading...' }
          </div>
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <div>
            <strong>Client EOA Balance:</strong> {eoaBalance ? `${eoaBalance} ETH` : 'Loading...'}
          </div>
          <div>
            <strong>Client AA Wallet Balance:</strong> {aaBalance ? `${aaBalance} ETH` : aaWalletAddress ? 'Loading...' : 'Not deployed'}
          </div>
        </div>
      </div>
      
      {response && (
        <div style={{ 
          marginTop: '20px', 
          padding: '20px',
          backgroundColor: '#e8f5e8',
          borderRadius: '10px',
          border: '1px solid #28a745',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#155724' }}>
            ETH Transfer Results
          </h3>
          
          {response.error ? (
            <div style={{ 
              padding: '15px',
              backgroundColor: '#f8d7da',
              borderRadius: '5px',
              border: '1px solid #f5c6cb',
              color: '#721c24'
            }}>
              <strong>Error:</strong> {response.error}
            </div>
          ) : (
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '15px'
            }}>
              <div style={{ 
                padding: '15px',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #d4edda'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#155724' }}>Service Information</h4>
                {response.services && response.services.length > 0 && (
                  <div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Service Name:</strong> 
                      <span style={{ color: '#28a745', marginLeft: '5px' }}>
                        {response.services[0].name}
                      </span>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Location:</strong> 
                      <span style={{ color: '#6c757d', marginLeft: '5px' }}>
                        {response.services[0].location}
                      </span>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Status:</strong> 
                      <span style={{ color: '#28a745', fontWeight: 'bold', marginLeft: '5px' }}>
                        {response.services[0].confirmation}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ 
                padding: '15px',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #d4edda'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#155724' }}>Transaction Details</h4>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Type:</strong> 
                  <span style={{ color: '#6c757d', marginLeft: '5px' }}>
                    MCP Agent-to-Agent ETH Transfer
                  </span>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Chain:</strong> 
                  <span style={{ color: '#6c757d', marginLeft: '5px' }}>
                    Sepolia Testnet
                  </span>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Payment Method:</strong> 
                  <span style={{ color: '#6c757d', marginLeft: '5px' }}>
                    Delegation Framework
                  </span>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Authentication:</strong> 
                  <span style={{ color: '#6c757d', marginLeft: '5px' }}>
                    EIP-1271 Smart Account
                  </span>
                </div>
              </div>
            </div>
          )}

          <div style={{ 
            marginTop: '15px', 
            padding: '10px',
            backgroundColor: '#f8f9fa',
            borderRadius: '5px',
            border: '1px solid #e9ecef'
          }}>
            <details>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#6c757d' }}>
                View Raw Response Data
              </summary>
              <pre style={{ 
                marginTop: '10px', 
                padding: '10px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                fontSize: '0.8em',
                overflow: 'auto',
                maxHeight: '200px'
              }}>
                {JSON.stringify(response, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}; 