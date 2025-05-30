// src/components/SendMcpMessage.tsx
import React, { useState } from 'react';

import {
  type TypedDataDomain,
  type TypedDataField,
} from 'ethers'

import { sepolia } from "viem/chains";
import { createPublicClient, createWalletClient, http, custom, zeroAddress, toHex, type Address, encodeFunctionData, hashMessage } from "viem";
import {  agent } from '../agents/veramoAgent';

import { erc7710BundlerActions } from "@metamask/delegation-toolkit/experimental";

import {
    createBundlerClient,
    createPaymasterClient,
    UserOperationReceipt,
  } from "viem/account-abstraction";
  import { createPimlicoClient } from "permissionless/clients/pimlico";

import {BUNDLER_URL, PAYMASTER_URL} from "../config";

import {
  Implementation,
  toMetaMaskSmartAccount,
  type ToMetaMaskSmartAccountReturnType,
} from "@metamask/delegation-toolkit";

import { erc7715ProviderActions } from "@metamask/delegation-toolkit/experimental";

import { AAKmsSigner } from '@mcp/shared';

// EntryPoint v0.6 address
const ENTRYPOINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789" as const;
const ENTRYPOINT_ADDRESS_SEPOLIA = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789" as const;

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
        chain,
        transport: custom(provider),
        account: owner,
    }) as any;

    const walletClientWithDelegation = walletClient.extend(erc7715ProviderActions());

    return {
        owner,
        signatory: { walletClient: walletClientWithDelegation },
    };
  };


  const getOrgAccount = async(owner: any, signatory: any, publicClient: any) : Promise<any> => {
    
    const seed = 10000

    // build individuals AA for EOA Connected Wallet
    const accountClient = await toMetaMaskSmartAccount({
        client: publicClient,
        implementation: Implementation.Hybrid,
        deployParams: [owner, [], [], []],
        signatory: signatory,
        deploySalt: toHex(seed),
        //chain: chain
    });

    return accountClient
}

const getSessionAccount = async(owner: any, signatory: any, publicClient: any) : Promise<any> => {
    
    const seed = 100001

    // build individuals AA for EOA Connected Wallet
    const accountClient = await toMetaMaskSmartAccount({
        client: publicClient,
        implementation: Implementation.Hybrid,
        deployParams: [owner, [], [], []],
        signatory: signatory,
        deploySalt: toHex(seed),
        //chain: chain
    });

    return accountClient
}



  const handleSend = async () => {
    setLoading(true);
    try {
        const loginResp = await login()

        // get aa account
        const publicClient = createPublicClient({
          chain: sepolia,
          transport: http(),
        });
        const orgAccountClient = await getOrgAccount(loginResp.owner, loginResp.signatory, publicClient)
        
        // Ensure account is properly initialized
        if (!orgAccountClient || !orgAccountClient.address) {
            throw new Error("Failed to initialize account client");
        }


        const pimlicoClient = createPimlicoClient({
            transport: http(BUNDLER_URL),
          });
        const paymasterClient = createPaymasterClient({
            transport: http(PAYMASTER_URL),
        });
        const bundlerClient = createBundlerClient({
                        transport: http(BUNDLER_URL),
                        paymaster: paymasterClient,
                        chain: sepolia,
                        paymasterContext: {
                            // at minimum this must be an object; for Biconomy you can use:
                            mode:             'SPONSORED',
                            //calculateGasLimits: true,
                            //expiryDuration:  300,
                        },
                    }).extend(erc7710BundlerActions());



        const isDeployed = await orgAccountClient?.isDeployed()
        console.info("************* isDeployed: ", isDeployed)
        if (isDeployed == false) {

            const { fast: fee } = await pimlicoClient.getUserOperationGasPrice();
            const userOperationHash = await bundlerClient!.sendUserOperation({
            account: orgAccountClient,
            calls: [
                {
                to: zeroAddress,
                },
            ],
            paymaster: paymasterClient,
            ...fee,
            });

            console.info("send user operation - done")
            const { receipt } = await bundlerClient!.waitForUserOperationReceipt({
            hash: userOperationHash,
            });

        }

        const orgAddress = orgAccountClient?.address.toLowerCase()
        const orgDid = "did:aa:eip155:" + chain.id + ":" + orgAddress


        // get agent available methods, this is a capability demonstration
        const availableMethods = await agent.availableMethods()

        // add did and key to our agent
        await agent.didManagerImport({
            did: orgDid, // or did:aa if you're using a custom method
            provider: 'did:aa:org',
            alias: 'org-smart-account',
            keys:[]
        })

        /*
        await agent.didManagerImport({
            did: orgDid,
            alias: 'org-did',
            provider: 'did:aa:org',
            controllerKeyId: "id",
            keys: []
          });
        */

        await agent.keyManagerImport({
            kms: 'aa',
            kid: 'aa-' + orgAddress,
            type: 'Secp256k1',
            publicKeyHex: '0x', // replace with actual public key 
            privateKeyHex: '0x' // replace with actual private key if available
        });


        console.info("deployed org account client address: ", orgAddress)
        console.info("org account client: ", orgAddress)
        console.info("org account did: ", orgDid)


        const identifier = await agent.didManagerGet({ did: orgDid });
        console.info("org did identifier: ", identifier)

        // add permissions to orgAccountClient
        
        const expiry = Math.floor(Date.now() / 1000 + 604_800); // 1 week from now.
        const currentTime = Math.floor(Date.now() / 1000); // now

        const sessionAccount = await getSessionAccount(loginResp.owner, loginResp.signatory, publicClient)
        const sessionIsDeployed = await sessionAccount?.isDeployed()
        console.info("************* sessionIsDeployed: ", sessionIsDeployed)
        if (sessionIsDeployed == false) {

            const { fast: fee } = await pimlicoClient.getUserOperationGasPrice();
            const userOperationHash = await bundlerClient!.sendUserOperation({
                account: sessionAccount,
                calls: [
                    {
                    to: zeroAddress,
                    },
                ],
                paymaster: paymasterClient,
                ...fee,
                });

                console.info("send user operation - done")
                const { receipt } = await bundlerClient!.waitForUserOperationReceipt({
                hash: userOperationHash,
            });

        }
        console.info("granting permissions for session account client: ", sessionAccount)
        const grantedPermissions = await loginResp.signatory.walletClient.grantPermissions([{
            chainId: chain.id,
            expiry,
            signer: {
                type: "account",
                data: {
                address: sessionAccount.address,
                },
            },
            permission: {
                type: "native-token-stream",
            //isAdjustmentAllowed: true,
                data: {
                initialAmount: 1n, // 1 wei
                amountPerSecond: 1n, // 1 wei per second
                maxAmount: 10n, // 10 wei
                startTime: currentTime,
                justification: "Payment for a week long subscription",
                },
            },
        }]);
        console.info("granted permissions: ", grantedPermissions)

        const permissionsContext = grantedPermissions[0].context;
        const delegationManager = grantedPermissions[0].signerMeta.delegationManager;
        const accountMetadata = grantedPermissions[0].accountMeta;


        console.info("send user operation")
        const { fast: fee } = await pimlicoClient.getUserOperationGasPrice();
        const userOperationHash = await bundlerClient!.sendUserOperationWithDelegation({
            publicClient,
            account: sessionAccount,
            calls: [
              {
                to: sessionAccount.address,
                data: "0x",
                value: 1n,
                permissionsContext,
                delegationManager,
              },
            ],
            // Appropriate values must be used for fee-per-gas. 
            paymaster: paymasterClient,
            accountMetadata,
            ...fee,
          });
        const { receipt } = await bundlerClient!.waitForUserOperationReceipt({
            hash: userOperationHash,
          });
        
          console.info("transaction receipt: ", receipt)


        // get challenge from server
        const challengeResult = await fetch('http://localhost:3001/mcp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
            type: 'PresentationRequest',
            from: orgDid,
            payload: {
                action: 'FindStateRegistration'
            },
            }),
        });
        const challengeData = await challengeResult.json()
        console.info("........ challengeResult: ", challengeData.challenge)

 


        // try out signing a message, just a capability demonstration
        const kid = "aa-" + orgAddress
        const signature = await agent.keyManagerSign({
            data: 'Hello world',
            keyRef: kid,
            algorithm: 'eth_signMessage',
            })
        console.info(">>>>>>>>>. signature: ", signature)

        // try getting the did document, this is a capability demonstration
        const didDoc = await agent.resolveDid({didUrl: orgDid})
        console.info("didDoc: ", didDoc)


        // construct the verifiable credential and presentation

        // @ts-ignore
        const signerAAVC: AAKmsSigner = {

            async signTypedData(
                domain: TypedDataDomain,
                types: Record<string, Array<TypedDataField>>,
                value: Record<string, any>,
            ): Promise<string> {

                const result = await orgAccountClient?.signTypedData({
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
                return result;
            },

            async getAddress(): Promise<Address> {
                if (!orgAccountClient) {
                    throw new Error("orgAccountClient is not initialized");
                }
                return orgAccountClient.address;
            },

        };


        const vcAA = await agent.createVerifiableCredentialEIP1271({
            credential: {
                issuer: { id: orgDid },
                issuanceDate: new Date().toISOString(),
                type: ['VerifiableCredential'],
                credentialSubject: {
                    id: orgDid,
                    name: 'Org Name',
                 },
                '@context': ['https://www.w3.org/2018/credentials/v1'],
            },
            signer: signerAAVC

        })

        console.info("verifiable credential: ", vcAA)    
         

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
                const result = await orgAccountClient?.signTypedData({
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
                if (!orgAccountClient) {
                    throw new Error("orgAccountClient is not initialized");
                }
                return orgAccountClient.address;
            },

        };
        const vpAA = await agent.createVerifiablePresentationEIP1271(
            {
                presentation: {
                    holder: orgDid,
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
                action: 'FindStateRegistration'
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
            //sender: 'did:web:client.myorgwallet.io',
            sender: orgDid,
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
    <div style={{ padding: 20 }}>
      <h2>Ask For Lawn Care Service</h2>
      <button onClick={handleSend} disabled={loading}>
        {loading ? 'Sending...' : 'Send MCP Message'}
      </button>

      {response && (
        <div style={{ marginTop: 20 }}>
          <h3>Response:</h3>
          <pre>{JSON.stringify(response, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};
