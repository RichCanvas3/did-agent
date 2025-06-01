import { createAgent, type TAgent} from '@veramo/core'
import { Resolver } from 'did-resolver';


import { DIDResolverPlugin } from '@veramo/did-resolver';

import {
  KeyManager,
  MemoryKeyStore,
} from '@veramo/key-manager';

import {
  DIDManager,
  MemoryDIDStore,
} from '@veramo/did-manager';


export type CredentialJwtOrJSON = { proof: { jwt: string } } | Record<string, unknown>;
export type CredentialStatus = { revoked: boolean };


import type { IKey, TKeyType, IDIDManager, ICredentialIssuer, ICredentialVerifier, IResolver, IDataStore, IKeyManager, VerifiableCredential, IVerifyResult } from '@veramo/core';

import { 
  getResolver as aaDidResolver, 
  AAKeyManagementSystem, 
  CredentialIssuerEIP1271, 
  AADidProvider } from '@mcp/shared';




const didProviders: Record<string, AADidProvider> = {
}
const aaKMS = new AAKeyManagementSystem(didProviders)


export type Agent = TAgent<ICredentialVerifier & IDIDManager & IKeyManager & IResolver>
export const agent: Agent = createAgent({
  plugins: [
    new CredentialIssuerEIP1271(),
    new KeyManager({
      store: new MemoryKeyStore(),
      kms: {
        aa: aaKMS,
      },
    }),
    new DIDManager({
      store: new MemoryDIDStore(),
      defaultProvider: 'did:aa:client',
      providers: didProviders,
    }),
    new DIDResolverPlugin({
      resolver: new Resolver({
        ...aaDidResolver(),
      }),
    }),
  ],
})