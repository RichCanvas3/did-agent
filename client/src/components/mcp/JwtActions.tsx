import React, { useState } from 'react';
import { privateKeyToAccount } from "viem/accounts";
import { hexToBytes } from 'viem';
import { createJWT, ES256KSigner, verifyJWT  } from 'did-jwt';
import { WEBDID_KEY, ETHRDID_KEY, EOA_KEY, ETHERUM_RPC_URL, OPTIMISM_RPC_URL, OPTIMISM_SEPOLIA_RPC_URL, SEPOLIA_RPC_URL, LINEA_RPC_URL, BUNDLER_URL, PAYMASTER_URL } from "../../config";
import { createPublicClient, parseAbi, formatUnits, TransactionExecutionError, createWalletClient, http, createClient, custom, parseEther, zeroAddress, toHex, type Address, encodeFunctionData, hashMessage } from "viem";

import {
  Implementation,
  toMetaMaskSmartAccount,
  DelegationFramework,
  SINGLE_DEFAULT_MODE,
  createDelegation,
} from "@metamask/delegation-toolkit";

import { sepolia, baseSepolia } from 'viem/chains';
const defaultChain = sepolia


export const JwtActions: React.FC = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [response, setResponse] = useState<any>(null);


  const publicClient = createPublicClient({
    chain: defaultChain,
    transport: http(),
  });

  const getServerAccount = async(key: string) : Promise<any> => {
      
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
        deploySalt: "0x0000000000000000000000000000000000000000000000000000000000000101",
        signatory: { account: serverAccount as any },
    });

    console.info("server AA: ", account.address)
    return account
  }


  const handleSendWebDIDJWT = async () => {
    setLoading('web');
    setResponse(null);
    try {

      const rawKey = WEBDID_KEY;
      const websitePrivateKey = (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as `0x${string}`;
      
      if (!/^0x[0-9a-fA-F]{64}$/.test(websitePrivateKey)) {
        throw new Error('Invalid private key format. Must be 32 bytes (64 hex characters) with optional 0x prefix');
      }
  
      const webSiteAccount = privateKeyToAccount(websitePrivateKey);
      console.info("website server EOA public key: ", webSiteAccount.publicKey)

      console.info("get signer ES256KSigner")
      const signer = ES256KSigner(hexToBytes(websitePrivateKey));

      console.info("createJWT")
      const jwt = await createJWT(
      {
          sub: 'did:web:wallet.myorgwallet.io',
          aud: 'did:web:richcanvas3.com',
          exp: Math.floor(Date.now() / 1000) + 600,
          claim: { message: 'Hello from did:web:wallet.myorgwallet.io, have a nice day did:web:richcanvas3.com' },
      },
      {
          alg: 'ES256K',
          issuer: 'did:web:wallet.myorgwallet.io',
          signer,
      }
      );
      
      console.log("webdid jwt: ", jwt);


      const challengeResult: any = await fetch('http://localhost:3001/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'SendWebDIDJWT',
          payload: { action: 'ServiceSubscriptionRequest', jwt: jwt },
        }),
      });
      const challengeData: any = await challengeResult.json();
      setResponse({ type: 'web', data: challengeData });
    } catch (err) {
      console.error(err)
      const message = (err as any)?.message || String(err)
      setResponse({ type: 'web', error: `Request failed: ${message}` });
    } finally {
      setLoading(null);
    }
  };

  const handleSendEthrDIDJWT = async () => {
    setLoading('ethr');
    setResponse(null);
    try {

      // get did for ethr - testing with wallet.myorgwallet.io
    if (!ETHRDID_KEY) {
      throw new Error('ETHRDID_KEY environment variable is not set');
    }
    
    const rawKey = ETHRDID_KEY;
    const ethrPrivateKey = (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as `0x${string}`;
    
    if (!/^0x[0-9a-fA-F]{64}$/.test(ethrPrivateKey)) {
      throw new Error('Invalid private key format. Must be 32 bytes (64 hex characters) with optional 0x prefix');
    }

    const ethrAccount = privateKeyToAccount(ethrPrivateKey);
    console.info("ethr server EOA public key: ", ethrAccount)

    const did = `did:ethr:${ethrAccount.address}`
    const signer = ES256KSigner(hexToBytes(ethrPrivateKey));
   

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
    

    
      const challengeResult: any = await fetch('http://localhost:3001/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'SendEthrDIDJWT',
          payload: { action: 'ServiceSubscriptionRequest', jwt: jwt },
        }),
      });
      const challengeData: any = await challengeResult.json();
      setResponse({ type: 'ethr', data: challengeData });
    } catch (err) {
      console.error(err)
      const message = (err as any)?.message || String(err)
      setResponse({ type: 'ethr', error: `Request failed: ${message}` });
    } finally {
      setLoading(null);
    }
  };

  const handleSendAADIDJWT = async () => {
    setLoading('aa');
    setResponse(null);
    try {

      const accountClient = await getServerAccount(EOA_KEY)
    const did = 'did:aa:eip155:11155111:' + accountClient.address



      // Adapter: DID-JWT signer wrapper using smart account
  const signer = async (data: string | Uint8Array) => {
    const sig = await accountClient.signMessage({ message: data as `0x${string}` });
    return sig;
  };

  // Create JWT (valid 10 minutes by default)
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
  



      const challengeResult: any = await fetch('http://localhost:3001/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'SendAADIDJWT',
          payload: { action: 'ServiceSubscriptionRequest', jwt: jwt },
        }),
      });
      const challengeData: any = await challengeResult.json();
      setResponse({ type: 'aa', data: challengeData });
    } catch (err) {
      console.error(err)
      const message = (err as any)?.message || String(err)
      setResponse({ type: 'aa', error: `Request failed: ${message}` });
    } finally {
      setLoading(null);
    }
  };

  const handleSendAgentDIDJWT = async () => {
    setLoading('agent');
    setResponse(null);
    try {

      const accountClient = await getServerAccount(EOA_KEY)
      const agentId = "13"
    const did = 'did:agent:eip155:11155111:' + agentId



      // Adapter: DID-JWT signer wrapper using smart account
  const signer = async (data: string | Uint8Array) => {
    const sig = await accountClient.signMessage({ message: data as `0x${string}` });
    return sig;
  };

  // Create JWT (valid 10 minutes by default)
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
  

  console.info("jwt: ", jwt)


      const challengeResult: any = await fetch('http://localhost:3001/mcp', {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`, // <-- transport-level
        },
        body: JSON.stringify({
          type: 'AskForService',
          payload: { action: 'ServiceSubscriptionRequest' },
        }),
      });
      const challengeData: any = await challengeResult.json();
      setResponse({ type: 'agent', data: challengeData });
    } catch (err) {
      console.error(err)
      const message = (err as any)?.message || String(err)
      setResponse({ type: 'agent', error: `Request failed: ${message}` });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <h2>JWT Actions</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: 20 }}>
        <button className='service-button' onClick={handleSendWebDIDJWT} disabled={loading !== null}>
          {loading === 'web' ? 'Sending...' : 'Send Web DID JWT'}
        </button>
        <button className='service-button' onClick={handleSendEthrDIDJWT} disabled={loading !== null}>
          {loading === 'ethr' ? 'Sending...' : 'Send Ethr DID JWT'}
        </button>
        <button className='service-button' onClick={handleSendAADIDJWT} disabled={loading !== null}>
          {loading === 'aa' ? 'Sending...' : 'Send AA DID JWT'}
        </button>
        <button className='service-button' onClick={handleSendAgentDIDJWT} disabled={loading !== null}>
          {loading === 'agent' ? 'Sending...' : 'Send Agent DID JWT'}
        </button>

      </div>
      {response && (
        <div style={{
          marginTop: 20,
          padding: '15px',
          backgroundColor: response.error ? '#f8d7da' : '#e8f5e8',
          borderRadius: '8px',
          border: `1px solid ${response.error ? '#f5c6cb' : '#28a745'}`
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: response.error ? '#721c24' : '#155724' }}>
            {response.error ? 'Error' : 'JWT Action Result'}
          </h3>
          <pre style={{ margin: 0, color: response.error ? '#721c24' : '#155724', fontSize: 14 }}>
            {response.error
              ? response.error
              : JSON.stringify(response.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}; 