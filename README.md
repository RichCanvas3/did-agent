# Account Abstraction DID (did:aa).  Verifiable Credentials, Verifiable Presentation  leveraging EIP-1271


# Account Abstraction DID

## Core Capabilities

- **Agent Interoperability**  
  Enables subject and issuer identification for Verifiable Credential (VC) and Verifiable Presentation (VP) communications between agents.

- **DIDComm-based Agent Interactions**  
  Supports DIDComm messaging across Model Context Protocol (MCP) agents.

- **Simplified UI**  
  Utilizes gasless transactions, batching, and sponsored on-chain invocation via Paymasters.

- **Delegation and Role Access**  
  Simplifies delegation and role-based permissions through Account Abstraction-based delegation.

- **Key Rotation**  
  Allows key rotation without losing the DID, as DIDs are not tied to a single EOA (Externally Owned Account), eliminating the need for updates or re-publication.

- **Zero-Knowledge and MPC Integration**  
  Can be plugged into ZK circuits and Multi-Party Computation (MPC) wallets.

---

## When to Use Account Abstraction-based DIDs

Use Account Abstraction DIDs when:

- You need **organization wallets** or **multi-signature control**.
- You want **social recovery** or **modular signing**.
- You require **gasless onboarding** or **sponsored credentials**.
- You're integrating with **ERC-4337**, **EIP-1271**, or **ZK workflows**.

---

## Signature and Verification Mechanics

- **EIP-712 Delegated Signing**  
  A delegator (typically an EOA) uses `signTypedData` to sign structured data on behalf of a smart account.

- **ERC-1271 Signature Verification**  
  Delegated signatures are verified on-chain using the `isValidSignature` method defined by ERC-1271.

- **Credential and Presentation Validation**  
  Once a VC or VP is signed, it can be validated across agents and on-chain using smart account logic.

- **Decoupled Identity**  
  Subject/Issuer DIDs are linked to account abstraction smart contracts and not tied to a single EOA.

---

## MyOrgWallet Integration

- Ties all attestations to **organizational** and **individual account abstractions**.
- Manages **Account Abstraction DIDs** for organizations and individuals.
- Supports **discovery** of Account Abstraction DID Documents.
- Captures **delegation relationships** between organizations and individuals.
- Registers and maintains **services provided by organizations** in DID Documents.

---

## Why Account Abstraction DIDs Are Not Yet Common

- **Legacy Assumptions**  
  Traditional DID methods (`did:ethr`, `did:web`, `did:key`, `did:peer`) are designed for EOAs with static keys.

- **New Identity Model**  
  Account Abstraction (via ERC-4337) enables smart contracts to act as DIDs without holding private keys.

- **Tooling Gaps**  
  Most DID resolvers and signature verification tools assume direct access to signing keys, which smart contracts do not have.

---

## Veramo Extensions

Planned or ongoing extensions to Veramo include:

- Support for **ERC-4337 smart accounts**.
- Signature and verification support using **ERC-1271**.
- Management of Account Abstraction DIDs, VCs, and VPs within the Veramo agent framework.



## Project Setup

```
cd mcp-aa-did
touch client/.env
touch server/.env

[Add Environment Variables]

git switch caveats-instead-of-permissions

pnpm install
pnpm i --save-dev @types/debug -w
pnpm run build

open http:localhost:5173
cd client
pnpm run dev

open http:localhost:3001
cd server
npx tsx src/index.ts
```

## Features

- Support for `did:aa` (Account Abstraction) DID method
- EIP-1271 signature verification for smart contracts
- Verifiable Credentials and Presentations using EIP-712 typed data
- Integration with Veramo framework
- TypeScript/ESM support

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
MAINNET_RPC_URL=your_mainnet_rpc_url
```

## License

MIT