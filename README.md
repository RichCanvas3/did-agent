# ERC-8004 Agent DID (did:agent:eip155:...).  Verifiable Credentials, Verifiable Presentation  leveraging EIP-1271


# ERC-8004 Agent DIDs

## Core Capabilities

- **Agent Interoperability**  
  Enables subject and issuer identification for Verifiable Credential (VC) and Verifiable Presentation (VP) communications between agents.

- **Multi-Signer Management**  
  Enables organizations to distribute DID control across multiple authorized signers, with configurable thresholds and permissions for different operations.

- **Simplified UI**  
  Utilizes gasless transactions, batching, and sponsored on-chain invocation via Paymasters.

- **Delegation and Role Access**  
  Simplifies delegation and role-based permissions through Account Abstraction-based delegation.

- **Key Rotation**  
  Allows key rotation without losing the DID, as DIDs are not tied to a single EOA (Externally Owned Account), eliminating the need for updates or re-publication.

- **Zero-Knowledge and MPC Integration**  
  Can be plugged into ZK circuits and Multi-Party Computation (MPC) wallets.

---
## Implementation

### DID Method Specification

The ERC-8004 Agent DID method follows the format:
```
did:aa:eip155:{chainId}:{agentId}
```

### Core Components

- **Smart Account Contract**  
  Implements ERC-4337 and ERC-1271 for signature validation and account abstraction.

- **DID Resolver**  
  Resolves DID documents by querying on-chain state and metadata.

- **Signature Provider**  
  Handles EIP-712 typed data signing through delegated EOAs.  EOA signs on behalf of the Smart Account.

### Core Infrastructure

- **Ethereum DID Registry**  
  The ethr-did-registry maintains core identity records. This forms the base layer of the DID Document with minimal verification and authentication data.

  **Ethereum Attestation Service**
  The ethereum attestation service maintains core metadata and delegation records

- **Signature Verification**  
  Validates VC, VP, and message signatures through ERC-1271's `isValidSignature`. No public key is required in the DID Document as verification happens on-chain.

- **DID Document Structure**  
  The complete AA DID Document combines data from multiple sources:


## Signature and Verification Mechanics

- **EIP-712 Delegated Signing**  
  A delegator (typically an EOA) uses `signTypedData` to sign structured data on behalf of a smart account.

- **ERC-1271 Signature Verification**  
  Delegated signatures are verified on-chain using the `isValidSignature` method defined by ERC-1271.

- **Credential and Presentation Validation**  
  Once a VC or VP is signed, it can be validated across agents and on-chain using smart account logic.

- **Decoupled Identity**  
  Subject/Issuer DIDs are linked to account abstraction smart contracts and not tied to a single EOA.




## Veramo Extensions

Planned or ongoing extensions to Veramo include:

- Support for **ERC-4337 smart accounts**.
- Signature and verification support using **ERC-1271**.
- Management of ERC-8004 Agent DIDs, VCs, and VPs within the Veramo agent framework.



## Project Setup

```
cd mcp-aa-did
touch client/.env
touch server/.env

[Add Environment Variables]

git switch caveats-instead-of-permissions

pnpm install
pnpm i --save-dev @types/debug -w

# to build shared folder with veramo did:agent and did:aa stuff
pnpm run build

open http:localhost:5173
cd client
pnpm run dev

open http:localhost:3001
cd server
npx tsx src/index.ts
```


## Project Structure

```
.
├── client/           # Frontend application
├── server/           # Backend server
└── shared/           # Shared TypeScript code
    ├── src/
    │   ├── agents/  # Veramo agent configuration
    │   └── utils/   # Shared utilities and types
```

## Prerequisites

- Node.js v20+
- pnpm (recommended) or npm

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/mcp.git
cd mcp
```

2. Install dependencies:
```bash
pnpm install
```

3. Build the packages:
```bash
pnpm run build
```

## Development

1. Start the development server:
```bash
cd server
npx tsx src/index.ts
```

2. In another terminal, start the client:
```bash
cd client
pnpm dev
```

## Environment Variables

Create a `.env` file in the server directory with the following variables:

```env
OPTIMISM_RPC_URL=your_optimism_rpc_url
ETHEREUM_RPC_URL=your_mainnet_rpc_url
```

## License

MIT