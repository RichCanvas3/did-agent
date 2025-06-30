import React, { useState } from 'react';
import { agent } from '../../agents/veramoAgent';

export const JwtActions: React.FC = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [response, setResponse] = useState<any>(null);

  const handleSendWebDIDJWT = async () => {
    setLoading('web');
    setResponse(null);
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
      setResponse({ type: 'web', data: challengeData });
    } catch (err) {
      setResponse({ type: 'web', error: 'Request failed' });
    } finally {
      setLoading(null);
    }
  };

  const handleSendEthrDIDJWT = async () => {
    setLoading('ethr');
    setResponse(null);
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
      setResponse({ type: 'ethr', data: challengeData });
    } catch (err) {
      setResponse({ type: 'ethr', error: 'Request failed' });
    } finally {
      setLoading(null);
    }
  };

  const handleSendAADIDJWT = async () => {
    setLoading('aa');
    setResponse(null);
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
      setResponse({ type: 'aa', data: challengeData });
    } catch (err) {
      setResponse({ type: 'aa', error: 'Request failed' });
    } finally {
      setLoading(null);
    }
  };

  const handleSendEOADelegatedDIDCommJWT = async () => {
    setLoading('delegated');
    setResponse(null);
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
      setResponse({ type: 'delegated', data: challengeData });
    } catch (err) {
      setResponse({ type: 'delegated', error: 'Request failed' });
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
        <button className='service-button' onClick={handleSendEOADelegatedDIDCommJWT} disabled={loading !== null}>
          {loading === 'delegated' ? 'Sending...' : 'Send Delegated DIDComm JWT'}
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