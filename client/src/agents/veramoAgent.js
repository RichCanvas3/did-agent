import { createAgent } from '@veramo/core';
import { Resolver } from 'did-resolver';
import { getResolver as aaDidResolver, AAKeyManagementSystem, CredentialIssuerEIP1271, AADidProvider } from '@mcp/shared';
/*
import dotenv from 'dotenv';
import { BrowserProvider } from 'ethers'


import type {
  W3CVerifiableCredential,
} from '@veramo/core';

import { CredentialPlugin } from '@veramo/credential-w3c';


import { getResolver as ethrDidResolver } from 'ethr-did-resolver';
import { getResolver as webDidResolver } from 'web-did-resolver';
import { getResolver as aaDidResolver } from '../utils/AAResolver';

import { CredentialStatusPlugin } from '@veramo/credential-status';

import {
  KeyDIDProvider,
  getDidKeyResolver as keyDidResolver,
} from '@blockchain-lab-um/did-provider-key';


 import { getResolver as keyResolver } from 'key-did-resolver'

import { KeyManagementSystem } from '@veramo/kms-local';
import { Web3KeyManagementSystem } from '@veramo/kms-web3';

import {
  type AbstractDataStore,
  DataManager,
  type IDataManager,
} from '@blockchain-lab-um/veramo-datamanager';

import {
  PkhDIDProvider,
  getDidPkhResolver as pkhDidResolver,
} from '@veramo/did-provider-pkh';


//import { getResolver as pkhDidResolver } from 'pkh-did-resolver';

import {
  EthrDIDProvider
}
from '@veramo/did-provider-ethr';


import {
  CredentialIssuerEIP712,
} from '@veramo/credential-eip712';

import {
  WebDIDProvider
} from '@veramo/did-provider-web';

*/
import { DIDResolverPlugin } from '@veramo/did-resolver';
import { KeyManager, MemoryKeyStore, MemoryPrivateKeyStore, } from '@veramo/key-manager';
import { DIDManager, MemoryDIDStore, } from '@veramo/did-manager';
const networks = [
    {
        name: 'optimism',
        chainId: '10',
        rpcUrl: '', //`${import.meta.env.VITE_OPTIMISM_RPC_URL}`,
        registry: '0x1234567890abcdef1234567890abcdef12345678',
    },
    {
        name: 'mainnet',
        chainId: '0x1',
        rpcUrl: '', //`${import.meta.env.VITE_MAINNET_RPC_URL}`,
        registry: '0xdCa7EF03e98e0DC2B855bE647C39ABe984fcF21B',
    },
];
const didProviders = {
/*
  'did:aa:org': new AADidProvider({
      defaultKms: 'aa',
      chainId: "1",
      address: '0x2f0bcb192212ad4e3977650feee4f455053f7772'
  }),
  'did:aa:indiv': new AADidProvider({
      defaultKms: 'aa',
      chainId: "1",
      address: '0x2f0bcb192212ad4e3977650feee4f455053f7773',
  }),
  */
};
const aaKMS = new AAKeyManagementSystem(didProviders);
export const agent = createAgent({
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
            defaultProvider: 'did:aa:org',
            providers: didProviders,
        }),
        new DIDResolverPlugin({
            resolver: new Resolver({
                ...aaDidResolver(),
            }),
        }),
    ],
});
