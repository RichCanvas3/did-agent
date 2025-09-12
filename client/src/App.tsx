

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header'
import Root from './pages/RootPage';
import McpUsdcPage from './pages/McpUsdcPage';
import McpEthPage from './pages/McpEthPage';
import JwtPage from './pages/JwtPage';


const App: React.FC = () => {
  return (
    <>
      <Header />

      <div style={{ maxWidth: '100vw'}}>
        <div className='content'>

          <Router>
            <Routes>
              <Route path="/" element={<Root />} />
              <Route path="/jwt" element={<JwtPage />} />
              <Route path="/eth" element={<McpEthPage />} />
              <Route path="/usdc" element={<McpUsdcPage />} />
              
            </Routes>
          </Router>
          
        </div>
      </div>
    </>
  );
};

export default App;