export interface MCPMessage {
  type: string;
  sender: string;
  payload: Record<string, any>;
}

export * from './utils/ICredentialEIP1271.js';
export * from './utils/AACredentialIssuerEIP1271.js';
export * from './utils/AgentCredentialIssuerEIP1271.js';

export * from './utils/AATypes.js';
export * from './utils/AAKmsSigner.js';
export * from './utils/AAKeyManagementSystem.js';
export * from './utils/AADidProvider.js';
export * from './utils/AAResolver.js';

export * from './utils/AgentTypes.js';
export * from './utils/AgentKmsSigner.js';
export * from './utils/AgentKeyManagementSystem.js';
export * from './utils/AgentDidProvider.js';
export * from './utils/AgentResolver.js';
