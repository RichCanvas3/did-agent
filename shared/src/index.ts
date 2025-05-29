export interface MCPMessage {
  type: string;
  sender: string;
  payload: Record<string, any>;
}

export * from './utils/ICredentialEIP1271.js';
export * from './utils/AATypes.js';
export * from './utils/AAKmsSigner.js';
export * from './utils/AAKeyManagementSystem.js';
export * from './utils/CredentialIssuerEIP1271.js';
export * from './utils/AADidProvider.js';
export * from './utils/AAResolver.js';
