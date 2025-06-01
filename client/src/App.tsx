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
        <li>MCP agent subscription request for Gator Lawn Service</li>
        <li>Client and Server MCP Agents leveraging ERC-4337 and ERC-7710 Account Abstraction</li>
        <li>Client and Server DID identification and verification leverating ERC-1271</li>
        <li>Client request verifiable credential and presentation using new veramo account abstract DID management</li>
        <li>Embedded Native-token-stream payment permission leveraging ERC-7715 </li>
      </ul>
      <SendMcpMessage />
    </div>
  );
}

export default App;
