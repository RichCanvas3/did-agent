// src/App.tsx

// import { SendMcpMessage } from './components/SendMcpMessage';
// import debug from 'debug';
// import './custom-styles.css';

// // Manually enable logging in dev mode
// if (import.meta.env.DEV) {
//   console.info('Debugging enabled for @veramo/*');
//   debug.enable('veramo:*,@veramo/*');
// }

// localStorage.debug = ''

// const log = debug('@veramo/test')
// log('🔍 Veramo debug is working!')

// function App() {
//   return (
//     <div style={{ maxWidth: '100vw'}}>
//       <div className='main-header'>
//         <h1 className='main-header-text'>🐊 Gator Link Tech</h1>
//       </div>

//       <nav className='main-nav'>
//         <ul className='main-nav-ul'>
//           <a className='main-nav-link' href="/"><li className='main-nav-li'> Introduction </li></a>
//           <a className='main-nav-link' href="/"><li className='main-nav-li'> Example </li></a>
//         </ul>
//       </nav>

//       <div className='content'>
//         <h2> This example... </h2>

//         <ul>
//           <li>Demonstrates MCP agent service request and recurring payments for Gator Lawn Service.</li>
//           <li>Client and server MCP agents leveraging <a href="https://eips.ethereum.org/EIPS/eip-4337" target="_blank">ERC-4337</a> and <a href="https://eips.ethereum.org/EIPS/eip-7710" target="_blank">ERC-7710</a> for account abstraction.</li>
//           <li>Client and server DID identification and verification leveraging <a href="https://eips.ethereum.org/EIPS/eip-1271" target="_blank">ERC-1271</a>.</li>
//           <li>Client requests verifiable credentials and presentations using Veramo-based account abstraction DID management.</li>
//           <li>Embedded native token stream payment permissions leveraging <a href="https://eips.ethereum.org/EIPS/eip-7715" target="_blank">ERC-7715</a>.</li>
//         </ul>

//         <SendMcpMessage />
//       </div>
//     </div>
//   );
// }

// export default App;

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header'
import Root from './pages/RootPage';
import Example from './pages/ExamplePage';

const App: React.FC = () => {
  return (
    <>
      <Header />

      <div style={{ maxWidth: '100vw'}}>
        <div className='content'>

          <Router>
            <Routes>
              <Route path="/" element={<Root />} />
              <Route path="/example" element={<Example />} />
            </Routes>
          </Router>
          
        </div>
      </div>
    </>
  );
};

export default App;