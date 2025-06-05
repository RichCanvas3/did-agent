// src/components/SendMcpMessage.tsx

import React from 'react';
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { type TypedDataDomain, type TypedDataField } from 'ethers'
import { ethers } from "ethers";
import { sepolia } from "viem/chains";
import { createPublicClient, createWalletClient, http, createClient, custom, parseEther, zeroAddress, toHex, type Address, encodeFunctionData, hashMessage } from "viem";
import { agent } from '../agents/veramoAgent';
import { Implementation, toMetaMaskSmartAccount, createCaveatBuilder, createDelegation } from "@metamask/delegation-toolkit";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { createBundlerClient } from "viem/account-abstraction";
import { AAKmsSigner } from '@mcp/shared';
import '../custom-styles.css';

// Add RPC URL constant
const RPC_URL = import.meta.env.SEPOLIA_RPC_URL as string;

// Add Account Abstraction ABI
const accountAbstractionAbi = ["function owner() view returns (address)"];

export const SendMcpMessage: React.FC = () => {
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
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
      chain: sepolia,
      transport: custom(provider),
      account: owner as `0x${string}`
    });

    console.info("........> wallet address: ", owner)

    return {
      owner,
      signatory: { walletClient: walletClient },
    };
  };

  const getClientSubscriberSmartAccount = async(
    owner: any,
    signatory: any,
    publicClient: any
  ) : Promise<any> => {

    // Issue with metamask smart contract created.  I don't have an owner address and cannot get signature using ERC-1271
    // For now we return a default account for DID, VC and VP
    // Money is still taken out of the metamask smart wallet defined by address.

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

    // After creating the account client, we can check if it's deployed
    const isDeployed = await accountClient.isDeployed();
    console.log("Smart account deployment status:", isDeployed);

    if (isDeployed) {
      /*
      try {
          const provider = new ethers.JsonRpcProvider(RPC_URL);
          const contract = new ethers.Contract(accountClient.address, accountAbstractionAbi, provider);
          const contractOwner = await contract.owner();
          console.log("Smart account owner:", contractOwner);
      } catch (error) {
          console.warn("Could not get owner of deployed account:", error);
      }
      */
  } else {
      console.log("Smart account not yet deployed");
  }

  return accountClient;
}

async function getBalance(address: string) {
  const sepProv = new ethers.JsonRpcProvider(import.meta.env.VITE_SEPOLIA_RPC_URL);
  const balance = await sepProv.getBalance(address);
  const eth = ethers.formatEther(balance);
  console.log(`Balance: ${eth} ETH for address: ${address}`);
  return eth;
}

  const handleSend = async () => {
    setLoading(true);

    try {
        // get challenge from organization providing service,  along with challenge phrase
        const challengeResult : any = await fetch('http://localhost:3001/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
          type: 'PresentationRequest',
          //from: clientSubscriberDid,
          payload: {
              action: 'ServiceSubscriptionRequest'
          },
          }),
        });

        const challengeData : any = await challengeResult.json()
        console.info("........ challengeResult: ", challengeData)

        const loginResp = await login()
        const publicClient = createPublicClient({
          chain: sepolia,
          transport: http(),
        });

        // generate payment delegation for service account
        const smartServiceAccountAddress = challengeData.address

        const clientSubscriptionAccountClient = await getClientSubscriberSmartAccount(loginResp.owner, loginResp.signatory, publicClient)
        console.info("client smart account address: ",  clientSubscriptionAccountClient.address)

        const environment = clientSubscriptionAccountClient.environment;
        const caveatBuilder = createCaveatBuilder(environment);

        // get list of careat types: https://docs.gator.metamask.io/how-to/create-delegation/restrict-delegation
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
        const clientSubscriberDid = "did:aa:eip155:" + chain.id + ":" + clientSubscriberSmartAddress.toLowerCase()
        console.info("client subscriber smart account address : ", clientSubscriberSmartAddress)
        console.info("client subscriber did: ", clientSubscriberDid)

        // get did document for client subscriber
        const clientSubscriberEthrDid = "did:ethr:" + clientSubscriberSmartAddress.toLowerCase()
        const clientSubscriberEthrDidDoc = await agent.resolveDid({didUrl: clientSubscriberEthrDid})
        console.info("client subscriber ethr did document: ", clientSubscriberEthrDidDoc)

        const eoaEthrDid = "did:ethr:" + loginResp.owner.toLowerCase()
        const eoaEthrDidDoc = await agent.resolveDid({didUrl: eoaEthrDid})
        console.info("gator client eoa ethr did document: ", eoaEthrDidDoc)

        const eoaBalance = await getBalance(loginResp.owner.toLowerCase())
        console.info("client subscriber eoa balance: ", eoaBalance)

        const aaEthrDid = "did:ethr:" + clientSubscriberSmartAddress.toLowerCase()
        const aaEthrDidDoc = await agent.resolveDid({didUrl: aaEthrDid})
        console.info("gator client aa ethr did document: ", aaEthrDidDoc)

        const aaBalance = await getBalance(clientSubscriberSmartAddress)
        console.info("client subscriber smart account balance: ", aaBalance)

        const isDeployed = await clientSubscriptionAccountClient?.isDeployed()
        console.info("************* isDeployed: ", isDeployed)

        if (isDeployed == false) {
          const pimlicoClient = createPimlicoClient({
            transport: http(import.meta.env.VITE_BUNDLER_URL),
            chain: sepolia
          });

          const bundlerClient = createBundlerClient({
            transport: http(import.meta.env.VITE_BUNDLER_URL) as any,
            chain: sepolia as any,
            paymaster: true,
          }) as any;

          const { fast: fee } = await pimlicoClient.getUserOperationGasPrice();
          const userOperationHash = await bundlerClient!.sendUserOperation({
            account: clientSubscriptionAccountClient,
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

        // get agent available methods, this is a capability demonstration
        // const availableMethods = await agent.availableMethods()

        // add did and key to our agent
        await agent.didManagerImport({
          did: clientSubscriberDid, // or did:aa if you're using a custom method
          provider: 'did:aa:client',
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

        /*
        // try out signing a message, just a capability demonstration
        const kid = "aa-" + clientSubscriberSmartAddress
        const signature = await agent.keyManagerSign({
            data: 'for smart service payment',
            keyRef: kid,
            algorithm: 'eth_signMessage',
            })
        console.info(">>>>>>>>>. signature: ", signature)


        // try getting the did document, this is a capability demonstration
        const didDoc = await agent.resolveDid({didUrl: clientSubscriberDid})
        console.info("didDoc: ", didDoc)
        */

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
              paymentDelegation: JSON.stringify(paymentDel),
            },

            '@context': ['https://www.w3.org/2018/credentials/v1'],
          },

          signer: signerAAVC
        })

        console.info("service request and payment delegation verifiable credential: ", vcAA)

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
        console.info("verify VP: ", vpVerified)

        /*
            vc and vp using masca if using did:dthr or did:pkh

        // get metamask current account did
        const snapId = 'npm:@blockchain-lab-um/masca'
        const mascaRslt = await enableMasca(address, {
            snapId: snapId,
            //supportedMethods: ['did:ethr', 'did:key', 'did:pkh'], // Specify supported DID methods
            supportedMethods: ['did:pkh'],
        });

        const mascaApi = await mascaRslt.data.getMascaApi();
        const did = await mascaApi.getDID()
        const holderDid = did.data

        // interact with mcp server as a client

        const challengeResult = await fetch('http://localhost:3001/mcp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
            type: 'PresentationRequest',
            from: 'did:web:client.myorgwallet.io',
            payload: {
                action: 'ServiceSubscriptionRequest'
            },
            }),
        });
        const challengeData = await challengeResult.json()

        // 1. Issue VC
        console.info("create vc with subject for did: ", holderDid)
        const unsignedCredential = {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            type: ["VerifiableCredential", "ExampleCredential"],
            issuer: holderDid,
            issuanceDate: new Date().toISOString(),
            credentialSubject: {
                id: holderDid,
                name: "Alice",
            },
            }

        const credentialResult = await mascaApi.createCredential({
            minimalUnsignedCredential: unsignedCredential,
            proofFormat: 'EthereumEip712Signature2021',
            options: {
                save: true, // store in Snap or other connected store
                store: ['snap'],
            },
            })

        const vcs = [credentialResult.data]
        console.info("vc generated: ", credentialResult)

        console.info("challenge phrase: ", challengeData.challenge)

        // 2. Package VC into VP

        const holder = holderDid
        const challenge = challengeData.challenge
        const domain = "wallet.myorgwallet.io"

        console.info("create vp with subject and challenge: ", holder, challenge)

        // did has to be loaded and to do that private key is needed
        const presentationResult = await agent.createVerifiablePresentation({
        presentation: {
            holder,
            verifiableCredential: vcs,
        },
        proofFormat: 'EthereumEip712Signature2021',
        domain,
        challenge: challenge
        });

        const proofOptions = { type: 'EthereumEip712Signature2021', domain, challenge };
        const presentationResult = await mascaApi.createPresentation({
            vcs,
            proofFormat: 'EthereumEip712Signature2021',
            proofOptions,
            })

        const vp = presentationResult.data
        //vp.proof.challenge = challenge
        //vp.proof.domain = domain
        console.info("........ vp: ", JSON.stringify(vp))

        */

      const res = await fetch('http://localhost:3001/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        type: 'AskForService',
        sender: clientSubscriberDid,
        payload: {
            location: 'Erie, CO',
            service: 'Lawn Care',
            presentation: vpAA
        },
        }),
      });

      const data = await res.json();

      setResponse(data);
    } catch (err) {
      console.error('Error sending MCP message:', err);

      setResponse({ error: 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2> Gator Lawn Service </h2>

      <button className='service-button' onClick={handleSend} disabled={loading}>
        {loading ? 'Sending...' : 'Send MCP Lawn Service Request and Payment'}
      </button>

      {response && (
        <div style={{ marginTop: 20, backgroundColor: 'black', color: 'white', padding: '2px 20px', borderRadius: '10px' }}>
          <h3>Response:</h3>
          <pre>{JSON.stringify(response, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};