import { type TAgent } from '@veramo/core';
export type CredentialJwtOrJSON = {
    proof: {
        jwt: string;
    };
} | Record<string, unknown>;
export type CredentialStatus = {
    revoked: boolean;
};
import type { IDIDManager, ICredentialVerifier, IResolver, IKeyManager } from '@veramo/core';
export type Agent = TAgent<ICredentialVerifier & IDIDManager & IKeyManager & IResolver>;
export declare const agent: Agent;
