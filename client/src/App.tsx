// src/App.tsx

import { SendMcpMessage } from './components/SendMcpMessage';
import debug from 'debug';

// Manually enable logging in dev mode
if (import.meta.env.DEV) {
  console.info('Debugging enabled for @veramo/*');
  debug.enable('veramo:*,@veramo/*');
}

localStorage.debug = ''

const log = debug('@veramo/test')
log('🔍 Veramo debug is working!')

function App() {
  return (
    <div>
      <h1>Gator Lawn Service Request and Payment</h1>
      <ul>
      <li>MCP agent service request and recurring payments for Gator Lawn Service</li>
      <li>Client and server MCP agents leveraging ERC-4337 and ERC-7710 for account abstraction</li>
      <li>Client and server DID identification and verification leveraging ERC-1271</li>
      <li>Client requests verifiable credentials and presentations using Veramo-based account abstraction DID management</li>
      <li>Embedded native token stream payment permissions leveraging ERC-7715</li>
      </ul>
      <SendMcpMessage />
    </div>
  );
}

export default App;
