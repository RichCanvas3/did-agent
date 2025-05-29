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
      <h1>My MCP Client</h1>
      <SendMcpMessage />
    </div>
  );
}

export default App;
