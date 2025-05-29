import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/App.tsx
import { SendMcpMessage } from './components/SendMcpMessage';
import debug from 'debug';
// Manually enable logging in dev mode
if (import.meta.env.DEV) {
    console.info('Debugging enabled for @veramo/*');
    debug.enable('veramo:*,@veramo/*');
}
localStorage.debug = '';
const log = debug('@veramo/test');
log('🔍 Veramo debug is working!');
function App() {
    return (_jsxs("div", { children: [_jsx("h1", { children: "My MCP Client" }), _jsx(SendMcpMessage, {})] }));
}
export default App;
