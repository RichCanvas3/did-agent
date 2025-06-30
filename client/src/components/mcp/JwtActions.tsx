import React, { useState } from 'react';

export const JwtActions: React.FC = () => {
  const [webDidResult, setWebDidResult] = useState<any>(null);
  const [ethrDidResult, setEthrDidResult] = useState<any>(null);
  const [aaDidResult, setAaDidResult] = useState<any>(null);
  const [delegatedDidCommResult, setDelegatedDidCommResult] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const handleSendWebDIDJWT = async () => {
    setLoading('web');
    setWebDidResult(null);
    try {
      const challengeResult: any = await fetch('http://localhost:3001/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'SendWebDIDJWT',
          payload: { action: 'ServiceSubscriptionRequest' },
        }),
      });
      const challengeData: any = await challengeResult.json();
      setWebDidResult(challengeData);
    } catch (err) {
      setWebDidResult({ error: 'Request failed' });
    } finally {
      setLoading(null);
    }
  };

  const handleSendEthrDIDJWT = async () => {
    setLoading('ethr');
    setEthrDidResult(null);
    try {
      const challengeResult: any = await fetch('http://localhost:3001/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'SendEthrDIDJWT',
          payload: { action: 'ServiceSubscriptionRequest' },
        }),
      });
      const challengeData: any = await challengeResult.json();
      setEthrDidResult(challengeData);
    } catch (err) {
      setEthrDidResult({ error: 'Request failed' });
    } finally {
      setLoading(null);
    }
  };

  const handleSendAADIDJWT = async () => {
    setLoading('aa');
    setAaDidResult(null);
    try {
      const challengeResult: any = await fetch('http://localhost:3001/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'SendAADIDJWT',
          payload: { action: 'ServiceSubscriptionRequest' },
        }),
      });
      const challengeData: any = await challengeResult.json();
      setAaDidResult(challengeData);
    } catch (err) {
      setAaDidResult({ error: 'Request failed' });
    } finally {
      setLoading(null);
    }
  };

  const handleSendEOADelegatedDIDCommJWT = async () => {
    setLoading('delegated');
    setDelegatedDidCommResult(null);
    try {
      const challengeResult: any = await fetch('http://localhost:3001/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'handleSendEOADelegatedDIDCommJWT',
          payload: { action: 'ServiceSubscriptionRequest' },
        }),
      });
      const challengeData: any = await challengeResult.json();
      setDelegatedDidCommResult(challengeData);
    } catch (err) {
      setDelegatedDidCommResult({ error: 'Request failed' });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      <h2>JWT transfer and signature verification using Web DID, Ethr DID, and AA DID</h2>
      <div style={{ marginBottom: 20 }}>
        <button onClick={handleSendWebDIDJWT} disabled={loading === 'web'}>
          {loading === 'web' ? 'Sending...' : 'Send Web DID JWT'}
        </button>
        {webDidResult && (
          <div style={{ marginTop: 10, background: '#f5f5f5', padding: 10, borderRadius: 6 }}>
            <pre>{JSON.stringify(webDidResult, null, 2)}</pre>
          </div>
        )}
      </div>
      <div style={{ marginBottom: 20 }}>
        <button onClick={handleSendEthrDIDJWT} disabled={loading === 'ethr'}>
          {loading === 'ethr' ? 'Sending...' : 'Send Ethr DID JWT'}
        </button>
        {ethrDidResult && (
          <div style={{ marginTop: 10, background: '#f5f5f5', padding: 10, borderRadius: 6 }}>
            <pre>{JSON.stringify(ethrDidResult, null, 2)}</pre>
          </div>
        )}
      </div>
      <div style={{ marginBottom: 20 }}>
        <button onClick={handleSendAADIDJWT} disabled={loading === 'aa'}>
          {loading === 'aa' ? 'Sending...' : 'Send AA DID JWT'}
        </button>
        {aaDidResult && (
          <div style={{ marginTop: 10, background: '#f5f5f5', padding: 10, borderRadius: 6 }}>
            <pre>{JSON.stringify(aaDidResult, null, 2)}</pre>
          </div>
        )}
      </div>
      <div style={{ marginBottom: 20 }}>
        <button onClick={handleSendEOADelegatedDIDCommJWT} disabled={loading === 'delegated'}>
          {loading === 'delegated' ? 'Sending...' : 'Send Delegated DIDComm JWT'}
        </button>
        {delegatedDidCommResult && (
          <div style={{ marginTop: 10, background: '#f5f5f5', padding: 10, borderRadius: 6 }}>
            <pre>{JSON.stringify(delegatedDidCommResult, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}; 