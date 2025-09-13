import React, { useState, useEffect } from 'react';
import { privateKeyToAccount } from "viem/accounts";
import { hexToBytes } from 'viem';
import { createJWT, ES256KSigner, verifyJWT, decodeJWT }  from 'did-jwt';
import { agent } from '../../agents/veramoAgent';
import { getRegistryAgent } from '@mcp/shared';
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
  const [requestSub, setRequestSub] = useState<string | null>(null);
  const [agentInfo, setAgentInfo] = useState<null | { agentDomain: string; agentAddress: string; agentId: string; did: string }>(null);
  const [didDocOpen, setDidDocOpen] = useState<boolean>(false);
  const [didDoc, setDidDoc] = useState<string>("");
  const [didDocLoading, setDidDocLoading] = useState<boolean>(false);
  const [didDocError, setDidDocError] = useState<string | null>(null);


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

  const REGISTRY_ADDRESS = '0xD3Ef59f3Bbc1d766E3Ba463Be134B5eB29e907A0' as `0x${string}`;

  function parseAgentIdFromDid(did: string | null | undefined): string | null {
    if (!did) return null;
    const base = did.split('#')[0];
    const parts = base.split(':');
    if (parts.length >= 5 && parts[0] === 'did' && parts[1] === 'agent') {
      return parts[parts.length - 1] || null;
    }
    return null;
  }

  useEffect(() => {
    (async () => {
      const agentId = parseAgentIdFromDid(requestSub || undefined);
      if (!agentId) {
        setAgentInfo(null);
        return;
      }
      try {
        const info = await getRegistryAgent(REGISTRY_ADDRESS, BigInt(agentId));
        setAgentInfo({
          agentDomain: info.agentDomain,
          agentAddress: info.agentAddress as string,
          agentId: String(info.agentId),
          did: requestSub as string,
        });
      } catch (e) {
        setAgentInfo(null);
      }
    })();
  }, [requestSub]);

  const handleViewDidDoc = async () => {
    if (!requestSub) return;
    setDidDocOpen(true);
    setDidDoc("");
    setDidDocError(null);
    setDidDocLoading(true);
    try {
      const result = await agent.resolveDid({ didUrl: requestSub });
      setDidDoc(JSON.stringify(result, null, 2));
    } catch (e: any) {
      setDidDocError(e?.message || 'Failed to resolve DID Document');
    } finally {
      setDidDocLoading(false);
    }
  };


  const handleSendWebDIDJWT = async () => {
    setLoading('web');
    setResponse(null);
    setRequestSub(null);
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
          name: 'Alice',
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
      const { payload } = decodeJWT(jwt);
      setRequestSub(String(payload.sub || payload.iss || ''));
    const challengeResult: any = await fetch('http://localhost:3001/mcp', {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`, // <-- transport-level
      },
      body: JSON.stringify({
        type: 'AskForService',
        payload: { action: 'ServiceProposalRequest' },
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

  const handleSendEthrDIDJWT = async () => {
    setLoading('ethr');
    setResponse(null);
    setRequestSub(null);
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
          aud: 'did:web:richcanvas3.com',
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
    {
      const { payload } = decodeJWT(jwt);
      setRequestSub(String(payload.sub || payload.iss || ''));
    }
    
    const challengeResult: any = await fetch('http://localhost:3001/mcp', {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`, // <-- transport-level
      },
      body: JSON.stringify({
        type: 'AskForService',
        payload: { action: 'ServiceProposalRequest' },
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


  const handleSendAADIDJWT = async () => {
    setLoading('aa');
    setResponse(null);
    setRequestSub(null);
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
  {
    const { payload } = decodeJWT(jwt);
    setRequestSub(String(payload.sub || payload.iss || ''));
  }
  setRequestSub(did);
  const challengeResult: any = await fetch('http://localhost:3001/mcp', {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`, // <-- transport-level
      },
      body: JSON.stringify({
        type: 'AskForService',
        payload: { action: 'ServiceProposalRequest' },
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

  const handleSendAgentDIDJWT = async () => {
    setLoading('agent');
    setResponse(null);
    setRequestSub(null);
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
  {
    const { payload } = decodeJWT(jwt);
    setRequestSub(String(payload.sub || payload.iss || ''));
  }


      const challengeResult: any = await fetch('http://localhost:3001/mcp', {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`, // <-- transport-level
        },
        body: JSON.stringify({
          type: 'AskForService',
          payload: { action: 'ServiceProposalRequest' },
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
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <h3>MCP: Ask For Service (ERC-8004 agent:did identifier, JWT auth) </h3>
      {agentInfo && (
        <div style={{
          margin: '8px 0 16px 0',
          padding: '10px',
          backgroundColor: '#f3f4f6',
          borderRadius: 6,
          border: '1px solid #e5e7eb',
          fontSize: 14,
          color: '#111827'
        }}>
          <div><strong>Agent DID:</strong> <span style={{ color: '#374151' }}>{agentInfo.did}</span></div>
          <div><strong>Agent Domain:</strong> <span style={{ color: '#374151' }}>{agentInfo.agentDomain}</span></div>
          <div><strong>Agent Address:</strong> <span style={{ color: '#374151' }}>{agentInfo.agentAddress}</span></div>
          <div><strong>Agent ID:</strong> <span style={{ color: '#374151' }}>{agentInfo.agentId}</span></div>
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: 20 }}>
      <button className='service-button' onClick={handleSendAgentDIDJWT} disabled={loading !== null}>
          {loading === 'agent' ? 'Sending...' : 'Service Proposal Request (agent:did)'}
        </button>
        <button className='service-button' onClick={handleSendWebDIDJWT} disabled={loading !== null}>
          {loading === 'web' ? 'Sending...' : 'use did:web'}
        </button>
        <button className='service-button' onClick={handleSendEthrDIDJWT} disabled={loading !== null}>
          {loading === 'ethr' ? 'Sending...' : 'use did:ethr'}
        </button>
        <button className='service-button' onClick={handleSendAADIDJWT} disabled={loading !== null}>
          {loading === 'aa' ? 'Sending...' : 'use did:aa'}
        </button>
        

      </div>
      {requestSub && (
        <div style={{ margin: '0 0 12px 0', color: '#374151', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div>
            <strong>Requester DID:</strong> <span style={{ color: '#4b5563' }}>{requestSub}</span>
          </div>
          <button className='service-button' onClick={handleViewDidDoc} style={{ padding: '4px 8px' }}>View DID Document</button>
        </div>
      )}
      {response && (
        <div style={{
          marginTop: 20,
          padding: '15px',
          backgroundColor: response.error ? '#f8d7da' : '#e8f5e8',
          borderRadius: '8px',
          border: `1px solid ${response.error ? '#f5c6cb' : '#28a745'}`
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: response.error ? '#721c24' : '#155724' }}>
            {response.error ? 'Error' : 'Service Proposal Request Result'}
          </h3>
          <pre style={{ margin: 0, color: response.error ? '#721c24' : '#155724', fontSize: 14 }}>
            {response.error
              ? response.error
              : JSON.stringify(response.data, null, 2)}
          </pre>
        </div>
      )}

      {didDocOpen && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
        }} onClick={() => setDidDocOpen(false)}>
          <div style={{ background: 'white', borderRadius: 8, maxWidth: 900, width: '90%', maxHeight: '80vh', overflow: 'auto', padding: 16 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h4 style={{ margin: 0 }}>Resolved DID Document</h4>
              <button className='service-button' onClick={() => setDidDocOpen(false)} style={{ padding: '4px 8px' }}>Close</button>
            </div>
            {didDocLoading ? (
              <div>Resolving...</div>
            ) : didDocError ? (
              <div style={{ color: '#b91c1c' }}>{didDocError}</div>
            ) : (
              <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{didDoc}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 