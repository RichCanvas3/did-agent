import {} from '@veramo/core';
import { AbstractIdentifierProvider } from '@veramo/did-manager';
export class AADidProvider extends AbstractIdentifierProvider {
    constructor(options) {
        super();
        Object.defineProperty(this, "defaultKms", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "chainId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "address", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "providerName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.defaultKms = options.defaultKms;
        this.chainId = options.chainId;
        this.address = options.address;
        this.providerName = `aa:${this.address}`;
    }
    // Returns the DID method name
    getSupportedMethods() {
        return [`aa:${this.address}`];
    }
    getAccount() {
        return this.address;
    }
    async createIdentifier({ kms, alias, options }, context) {
        // provider and did are a one to one relationship
        const address = this.address;
        const chainId = this.chainId;
        const did = `did:aa:eip155:${chainId}:${address}`;
        const identifier = {
            did,
            alias,
            provider: this.providerName,
            controllerKeyId: address, // assumes no local private key; signing done externally or on-chain
            keys: [],
            services: [],
        };
        console.info("&&&&&&&&&&&& Creating identifier:", identifier);
        return identifier;
    }
    async resolveDid(did) {
        console.info(`Resolving DID 222: ${did}`);
        const [method, networkId, address] = did.split(':').slice(1);
        if (method !== 'contract') {
            throw new Error(`Unsupported DID method: ${method}`);
        }
        const controllerAddress = address.toLowerCase();
        return {
            '@context': ['https://www.w3.org/ns/did/v1'],
            id: did,
            verificationMethod: [
                {
                    id: `${did}#controller`,
                    type: 'EcdsaSecp256k1RecoveryMethod2020',
                    controller: did,
                    blockchainAccountId: `${controllerAddress}@eip155:${networkId}`,
                },
            ],
            authentication: [`${did}#controller`],
        };
    }
    async updateIdentifier(args, context) {
        throw new Error('WebDIDProvider updateIdentifier not supported yet.');
    }
    async deleteIdentifier(identifier, context) {
        for (const { kid } of identifier.keys) {
            await context.agent.keyManagerDelete({ kid });
        }
        return true;
    }
    async addKey({ identifier, key, options }, context) {
        return { success: true };
    }
    async addService({ identifier, service, options }, context) {
        return { success: true };
    }
    async removeKey(args, context) {
        return { success: true };
    }
    async removeService(args, context) {
        return { success: true };
    }
}
