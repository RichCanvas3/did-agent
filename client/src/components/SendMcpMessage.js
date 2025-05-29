import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/SendMcpMessage.tsx
import React, { useState } from 'react';
import {} from 'ethers';
import { mainnet } from "viem/chains";
import { createPublicClient, createWalletClient, http, custom, zeroAddress, toHex, encodeFunctionData, hashMessage } from "viem";
import { agent } from '../agents/veramoAgent';
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { BUNDLER_URL, PAYMASTER_URL } from "../config";
import { createBundlerClient, createPaymasterClient, } from "viem/account-abstraction";
import { Implementation, toMetaMaskSmartAccount, } from "@metamask/delegation-toolkit";
import { AAKmsSigner } from '@mcp/shared';
export const SendMcpMessage = () => {
    const [response, setResponse] = useState(null);
    const [loading, setLoading] = useState(false);
    const chain = mainnet;
    const provider = window.ethereum;
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
        }));
        const walletClient = createWalletClient({
            chain,
            transport: custom(provider),
            account: owner,
        });
        return {
            owner,
            signatory: { walletClient },
        };
    };
    const getOrgAccount = async (owner, signatory, publicClient) => {
        const seed = 10000;
        // build individuals AA for EOA Connected Wallet
        const accountClient = await toMetaMaskSmartAccount({
            client: publicClient,
            implementation: Implementation.Hybrid,
            deployParams: [owner, [], [], []],
            signatory: signatory,
            deploySalt: toHex(seed),
        });
        return accountClient;
    };
    const handleSend = async () => {
        setLoading(true);
        try {
            const loginResp = await login();
            const address = loginResp.owner;
            // get aa account
            const publicClient = createPublicClient({
                chain: chain,
                transport: http(),
            });
            const orgAccountClient = await getOrgAccount(loginResp.owner, loginResp.signatory, publicClient);
            const isDeployed = await orgAccountClient?.isDeployed();
            if (isDeployed == false) {
                const pimlicoClient = createPimlicoClient({
                    transport: http(BUNDLER_URL),
                });
                const paymasterClient = createPaymasterClient({
                    transport: http(PAYMASTER_URL),
                });
                const bundlerClient = createBundlerClient({
                    transport: http(BUNDLER_URL),
                    paymaster: paymasterClient,
                    chain: chain,
                    paymasterContext: {
                        // at minimum this must be an object; for Biconomy you can use:
                        mode: 'SPONSORED',
                        //calculateGasLimits: true,
                        //expiryDuration:  300,
                    },
                });
                const { fast: fee } = await pimlicoClient.getUserOperationGasPrice();
                const userOperationHash = await bundlerClient.sendUserOperation({
                    account: orgAccountClient,
                    calls: [
                        {
                            to: zeroAddress,
                        },
                    ],
                    paymaster: paymasterClient,
                    ...fee,
                });
                const { receipt } = await bundlerClient.waitForUserOperationReceipt({
                    hash: userOperationHash,
                });
            }
            const orgAddress = orgAccountClient?.address.toLowerCase();
            //const orgDid = "did:pkh:eip155:0x1:" + orgAddress
            const orgDid = "did:aa:eip155:1:" + orgAddress;
            //const orgDid = 'did:ethr:'+ orgAddress
            /*
            const identifier = await agent.didManagerGetOrCreate({
                alias: 'orgDid',
                provider: 'did:pkh',
                options: {
                    blockchainAccountId: orgDid,
                    // Explicitly avoid associating a key
                },
            });
            */
            console.info("deployed org account client address: ", orgAddress);
            console.info("org account client: ", orgAddress);
            console.info("org account did: ", orgDid);
            console.info("import did:aa:org: ", orgDid);
            await agent.didManagerImport({
                did: orgDid, // or did:aa if you're using a custom method
                provider: 'did:aa:org',
                alias: 'org-smart-account',
                keys: []
            });
            await agent.keyManagerImport({
                kms: 'aa',
                kid: 'aa-' + orgAddress,
                type: 'Secp256k1',
                publicKeyHex: '0x', // replace with actual public key 
                privateKeyHex: '0x' // replace with actual private key if available
            });
            await agent.didManagerImport({
                did: orgDid,
                alias: 'org-did',
                provider: 'did:aa:org',
                controllerKeyId: "id",
                keys: []
            });
            console.info("get did: ");
            const identifier = await agent.didManagerGet({ did: orgDid });
            console.info("identifier: ", identifier);
            const kid = "aa-" + orgAddress;
            const signature = await agent.keyManagerSign({
                data: 'Hello world',
                keyRef: kid,
                algorithm: 'eth_signMessage',
            });
            console.info(">>>>>>>>>. signature: ", signature);
            console.info("imported did: ", orgDid);
            const didDoc = await agent.resolveDid({ didUrl: orgDid });
            console.info("didDoc: ", didDoc);
            // @ts-ignore
            const signerAAVC = {
                // Required properties for AAKmsSigner interface
                //context: undefined,
                //controllerKey: undefined,
                //provider: undefined,
                async signTypedData(domain, types, value) {
                    console.info("signTypedData called with domain: ", domain);
                    console.info("signTypedData called with types: ", types);
                    console.info("signTypedData called with value: ", value);
                    const result = await orgAccountClient?.signTypedData({
                        account: loginResp.owner, // EOA that controls the smart contract
                        // @ts-ignore
                        domain: domain,
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
                async getAddress() {
                    if (!orgAccountClient) {
                        throw new Error("orgAccountClient is not initialized");
                    }
                    return orgAccountClient.address;
                },
            };
            const availableMethods = await agent.availableMethods();
            console.info("---------> availableMethods 123: ", availableMethods);
            const vcAA = await agent.createVerifiableCredentialEIP1271({
                credential: {
                    issuer: { id: orgDid },
                    issuanceDate: new Date().toISOString(),
                    type: ['VerifiableCredential'],
                    credentialSubject: {
                        id: orgDid,
                        name: 'Alice'
                    },
                    '@context': ['https://www.w3.org/2018/credentials/v1'],
                },
                //keyRef: 'aa-' + orgAddress,
                signer: signerAAVC
            });
            console.info("vcAA: ", vcAA);
            const vcVerified = await agent.verifyCredentialEIP1271({ credential: vcAA, });
            console.info("verify VC: ", vcVerified);
            const challenge1 = "hello world";
            // @ts-ignore
            const signerAAVP = {
                // Required properties for AAKmsSigner interface
                //context: undefined,
                //controllerKey: undefined,
                //provider: undefined,
                async signTypedData(domain, types, value) {
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
                async getAddress() {
                    if (!orgAccountClient) {
                        throw new Error("orgAccountClient is not initialized");
                    }
                    return orgAccountClient.address;
                },
            };
            const vpAA = await agent.createVerifiablePresentationEIP1271({
                presentation: {
                    holder: orgDid,
                    verifiableCredential: [vcAA],
                },
                proofFormat: 'EthereumEip712Signature2021',
                challenge: challenge1,
                signer: signerAAVP
            });
            console.info("vpAA: ", vpAA);
            const vpVerified = await agent.verifyPresentationEIP1271({ presentation: vpAA, });
            console.info("verify VP: ", vpVerified);
            /*
    
            const providers = await agent.didManagerGetProviders()
            console.info("did providers: ", providers)
            //console.info("did provider: ", p1)
    
            await agent.didManagerImport({
                    did: orgDid,
                    alias: 'org-did',
                    provider: 'pkh',
                    keys: [{
                        kms: 'web3',
                        kid: providerName + '-' + orgAddress,
                        type: 'aa'
                    }],
                  });
    
    
            */
            /*
            const didUrl = identifier.did
            const docResult = await agent.resolveDid({ didUrl: didUrl })
            console.info("docResult: ", docResult)
    
            console.info("call mapIdentifierKeysToDoc")
            const extendedKeys = await mapIdentifierKeysToDoc(
                identifier,
                'verificationMethod',
                { agent },
                //args.resolutionOptions,
                )
            console.info("................extendedKeys: ", extendedKeys)
            */
            /* for a web did I think
            const signature = await agent.keyManagerSign({
                data: 'Hello world',
                keyRef: identifier.controllerKeyId,
                algorithm: 'eth_signMessage',
                })
    
            verifiableCredential = await agent.createVerifiableCredential({
                credential: {
                issuer: { id: identifier.did },
                '@context': ['https://www.w3.org/2018/credentials/v1', 'https://example.com/1/2/3'],
                type: ['VerifiableCredential', 'Custom'],
                issuanceDate: new Date().toISOString(),
                credentialSubject: {
                    id: 'did:web:example.com',
                    you: 'Rock',
                },
                },
                proofFormat: 'EthereumEip712Signature2021',
            })
            
    
            console.info("org identifier: ", identifier)
        
    
    
            // AA Issued Verifiable Credential
    
            const credential1 = {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                "type": ["VerifiableCredential"],
                "issuer": orgDid,
                "issuanceDate": new Date().toISOString(),
                "credentialSubject": {
                    id: orgDid,
                    name: "Alice",
                },
            };
    
            const domain1 = {
                name: "VerifiableCredential",
                version: "1",
                chainId: chain.id,
                verifyingContract: orgAddress,
            };
    
            const types1 = {
                VerifiableCredential: [
                    { name: "issuer", type: "string" },
                    { name: "credentialSubject", type: "string" },
                    { name: "issuanceDate", type: "string" },
                ],
            };
    
            const message1 = {
                issuer: credential1.issuer,
                credentialSubject: JSON.stringify(credential1.credentialSubject),
                issuanceDate: credential1.issuanceDate,
            };
    
            console.info("... signTypedData: ", loginResp.signatory)
            const signature1 = await orgAccountClient?.signTypedData({
                account: loginResp.signatory.account, // EOA that controls the smart contract
                domain: domain1,
                types: types1,
                primaryType: "VerifiableCredential",
                message: message1,
            });
    
            console.info("done")
            const method1 = orgDid + "#controller"
            credential1.proof = {
                type: "EthereumEip712Signature2021",
                created: new Date().toISOString(),
                proofPurpose: "assertionMethod",
                verificationMethod: method1,
                proofValue: signature1,
                eip712Domain: {
                    domain: domain1,
                    types: types1,
                    primaryType: "VerifiableCredential",
                },
            };
    
            console.info("aa vc: ", credential1)
    
    
            const digest1  = TypedDataEncoder.hash(domain1, types1, message1);
    
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
                  args: [digest1, signature1],
                });
              
            const { data: isValidSignature } = await publicClient.call({
                account: orgAddress,
                data: isValidSignatureData,
                to: orgAddress,
            });
            console.info("is valid signature 12345: ", isValidSignature)
            console.log(isValidSignature?.startsWith('0x1626ba7e') ? '✅ Valid signature' : '❌ Invalid');
    
    
            const challengeResult2 = await fetch('http://localhost:3001/mcp', {
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
            const challengeData2 = await challengeResult2.json()
    
    
    
            console.info("........ challengeResult2: ", challengeData2.challenge)
    
            const vcStr = JSON.stringify(credential1)
            const presentation2 = {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                type: ["VerifiablePresentation"],
                verifiableCredential: [JSON.stringify(vcStr)],
                holder: orgDid,
            };
    
            const domain2 = {
                name: "VerifiablePresentation",
                version: "1",
                chainId: chain.id,
                verifyingContract: orgAddress,
            };
    
            const types2 = {
                VerifiablePresentation: [
                    { name: "holder", type: "string" },
                    { name: "verifiableCredential", type: "string" },
                    { name: "challenge", type: "string" },
                    { name: "domain", type: "string" },
                ],
            };
    
            const challenge2 = challengeData2.challenge
            const proofDomain2 = "localhost:5174";
    
    
            const message2 = {
                holder: presentation2.holder,
                verifiableCredential: JSON.stringify(presentation2.verifiableCredential),
                challenge: challenge2,
                domain: proofDomain2,
            };
    
            const signature2 = await orgAccountClient?.signTypedData({
                account: loginResp.signatory.account, // EOA that controls the smart contract
                domain: domain2,
                types: types2,
                primaryType: "VerifiablePresentation",
                message: message2,
            });
    
            const method2 = orgDid + "#controller"
            presentation2.proof = {
                type: "EthereumEip712Signature2021",
                created: new Date().toISOString(),
                proofPurpose: "authentication",
                verificationMethod: method2,
                proofValue: signature2,
                eip712Domain: {
                    domain: domain2,
                    types: types2,
                    primaryType: "VerifiablePresentation",
                },
                challenge: challenge2,
                domain: proofDomain2,
            };
    
            console.info("&&&&&&&&&&&&&&&&&&&&&&&77 aa vp: ", presentation2)
    
    
    
    
    
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
    
    
            console.info("vc holder did: ", holderDid)
    
    
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
    
    
    
            console.info("........ challengeResult: ", challengeData.challenge)
    
            
    
    
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
            
    
            // 3. Send VP to server
            //const response = await axios.post(endpoint, vp)
    
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
                        //presentation: presentation2,
                        presentation: vpAA
                    },
                }),
            });
            const data = await res.json();
            setResponse(data);
        }
        catch (err) {
            console.error('Error sending MCP message:', err);
            setResponse({ error: 'Request failed' });
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { style: { padding: 20 }, children: [_jsx("h2", { children: "Ask For Lawn Care Service" }), _jsx("button", { onClick: handleSend, disabled: loading, children: loading ? 'Sending...' : 'Send MCP Message' }), response && (_jsxs("div", { style: { marginTop: 20 }, children: [_jsx("h3", { children: "Response:" }), _jsx("pre", { children: JSON.stringify(response, null, 2) })] }))] }));
};
