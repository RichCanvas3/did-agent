import { createAgent, type TAgent} from '@veramo/core'
import { Resolver } from 'did-resolver';





import { DIDResolverPlugin } from '@veramo/did-resolver';

import {
  KeyManager,
  MemoryKeyStore,
  MemoryPrivateKeyStore,
} from '@veramo/key-manager';

import {
  type AbstractIdentifierProvider,
  DIDManager,
  MemoryDIDStore,
} from '@veramo/did-manager';

import { AAKeyManagementSystem } from  '@mcp/shared';
import { CredentialIssuerEIP1271 } from '@mcp/shared';
import { AADidProvider } from '@mcp/shared'; 

import { getResolver as aaDidResolver } from '@mcp/shared';
import { getResolver as webDidResolver } from 'web-did-resolver'
import { getResolver as ethrDidResolver } from 'ethr-did-resolver'

export type CredentialJwtOrJSON = { proof: { jwt: string } } | Record<string, unknown>;
export type CredentialStatus = { revoked: boolean };


import type { IKey, TKeyType, IDIDManager, ICredentialIssuer, ICredentialVerifier,  IResolver, IDataStore, IKeyManager, VerifiableCredential, IVerifyResult } from '@veramo/core';


const didProviders: Record<string, AADidProvider> = {
}

const aaKMS = new AAKeyManagementSystem(didProviders)

export const resolver = new Resolver({
  ...aaDidResolver(),
  ...webDidResolver(),
  ...ethrDidResolver({
      networks: [
        {
          name: 'mainnet',
          rpcUrl: process.env.ETHEREUM_RPC_URL as string,
        },
        {
          name: 'sepolia',
          rpcUrl: process.env.SEPOLIA_RPC_URL as string,
        },
        {
          name: 'linea',
          rpcUrl: process.env.LINEA_RPC_URL as string,
        },
      ],
    }),
})


export type Agent = TAgent<ICredentialVerifier & IDIDManager & IKeyManager & IResolver>
export const agent: Agent = createAgent({
    plugins: [
      //new CredentialPlugin(),
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
        resolver: resolver,
      }),
    ],
  })