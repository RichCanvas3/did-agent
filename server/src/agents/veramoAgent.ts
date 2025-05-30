import { createAgent, type TAgent} from '@veramo/core'
import { Resolver } from 'did-resolver';

import { getResolver as aaDidResolver } from '@mcp/shared';

/*
import dotenv from 'dotenv';
import { BrowserProvider } from 'ethers'


import type {
  W3CVerifiableCredential,
} from '@veramo/core';

import { CredentialPlugin } from '@veramo/credential-w3c';


import { getResolver as ethrDidResolver } from 'ethr-did-resolver';
import { getResolver as webDidResolver } from 'web-did-resolver';


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



export type CredentialJwtOrJSON = { proof: { jwt: string } } | Record<string, unknown>;
export type CredentialStatus = { revoked: boolean };


import type { IKey, TKeyType, IDIDManager, ICredentialIssuer, ICredentialVerifier,  IResolver, IDataStore, IKeyManager, VerifiableCredential, IVerifyResult } from '@veramo/core';

/*
const networks: Array<{ name: string; chainId: string; rpcUrl: string; registry: string }> = [
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
    {
        name: 'sepolia',
        chainId: '11155111',
        rpcUrl: '', //`${import.meta.env.VITE_SEPOLIA_RPC_URL}`,
        registry: '0xdCa7EF03e98e0DC2B855bE647C39ABe984fcF21B',
    },
];
*/

const didProviders: Record<string, AADidProvider> = {
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
}
/*
const didProviders: Record<string, AbstractIdentifierProvider> = {
    'did:pkh': new PkhDIDProvider({
        defaultKms: 'web3'
    }),
    //'did:aa': new PkhDIDProvider({
    //    defaultKms: 'local',
    //    chainId: '1'
    //}),
    'did:ethr': new EthrDIDProvider({
        defaultKms: 'local',
        networks,
    }),
    'did:web': new WebDIDProvider({
        defaultKms: 'local'
    }),
    'did:key': new KeyDIDProvider({ 
        defaultKms: 'local' 
    }),
};

const web3Providers: Record<string, BrowserProvider> = {}

*/


const aaKMS = new AAKeyManagementSystem(didProviders)


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
              defaultProvider: 'did:aa:org',
              providers: didProviders,
            }),
            new DIDResolverPlugin({
              resolver: new Resolver({
                ...aaDidResolver(),
              }),
            }),
          ],
        })