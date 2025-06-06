# Account Abstraction DID (did:aa).  Verifiable Credentials, Verifiable Presentation  leveraging EIP-1271

A decentralized identity and verifiable credentials provider that supports EIP-1271 for smart contract-based signature verification.

Account Abstraction DID resolver that produces DID Document
Account Abstraction DID relationships/delegations published via on-chain DID attestations and Metamask Delegation

## Grant's Setup

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