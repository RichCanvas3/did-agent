import { type IIdentifier, type IKey, type IService, type IAgentContext, type IKeyManager, type TKeyType, type IKeyManagerCreateArgs, type MinimalImportableKey } from '@veramo/core';
import { AbstractIdentifierProvider } from '@veramo/did-manager';
export interface AADidProviderOptions {
    defaultKms: string;
    chainId: number;
    address: string;
}
type IContext = IAgentContext<IKeyManager>;
export type ImportOrCreateKeyOptions<TKey extends TKeyType = TKeyType> = Omit<Partial<IKeyManagerCreateArgs & MinimalImportableKey>, 'kms'> & {
    type: TKey;
};
export type CreateIdentifierBaseOptions<T extends TKeyType = TKeyType> = {
    keyRef?: string;
    key?: ImportOrCreateKeyOptions<T>;
};
export declare class AADidProvider extends AbstractIdentifierProvider {
    private defaultKms;
    private chainId?;
    private address;
    private providerName;
    constructor(options: AADidProviderOptions);
    getSupportedMethods(): string[];
    getAccount(): string;
    createIdentifier({ kms, alias, options }: {
        kms?: string;
        alias?: string;
        options: MinimalImportableKey;
    }, context: IContext): Promise<Omit<IIdentifier, 'provider'>>;
    resolveDid(did: string): Promise<any>;
    updateIdentifier(args: {
        did: string;
        kms?: string | undefined;
        alias?: string | undefined;
        options?: any;
    }, context: IAgentContext<IKeyManager>): Promise<IIdentifier>;
    deleteIdentifier(identifier: IIdentifier, context: IContext): Promise<boolean>;
    addKey({ identifier, key, options }: {
        identifier: IIdentifier;
        key: IKey;
        options?: any;
    }, context: IContext): Promise<any>;
    addService({ identifier, service, options }: {
        identifier: IIdentifier;
        service: IService;
        options?: any;
    }, context: IContext): Promise<any>;
    removeKey(args: {
        identifier: IIdentifier;
        kid: string;
        options?: any;
    }, context: IContext): Promise<any>;
    removeService(args: {
        identifier: IIdentifier;
        id: string;
        options?: any;
    }, context: IContext): Promise<any>;
}
export {};
