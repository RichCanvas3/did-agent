import { ShoppingCartIcon, BriefcaseIcon, UserCircleIcon, StarIcon} from '@heroicons/react/20/solid'
import '../custom-styles.css'
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { SendMcpMessage } from '../components/SendMcpMessage';

const RootPage: React.FC = () => {
  const [eoaBalance, setEoaBalance] = useState<string>('');
  const [aaBalance, setAaBalance] = useState<string>('');
  const [aaWalletAddress, setAaWalletAddress] = useState<string>('');

  useEffect(() => {
    const fetchBalances = async () => {
      try {
        if ((window as any).ethereum) {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          const accounts = await provider.send("eth_requestAccounts", []);
          if (accounts[0]) {
            const balance = await provider.getBalance(accounts[0]);
            setEoaBalance(ethers.formatEther(balance));
          }

          // Fetch AA wallet balance if address is available
          if (aaWalletAddress) {
            const aaBalance = await provider.getBalance(aaWalletAddress);
            setAaBalance(ethers.formatEther(aaBalance));
          }
        }
      } catch (error) {
        console.error('Error fetching balances:', error);
      }
    };

    fetchBalances();
    // Poll for balance updates every 10 seconds
    const interval = setInterval(fetchBalances, 10000);
    return () => clearInterval(interval);
  }, [aaWalletAddress]); // Added aaWalletAddress as dependency

  const handleAAWalletDeployed = (address: string) => {
    setAaWalletAddress(address);
  };

  return (
    <div className="root-page">
      <div className="content">
        <h1>Agent DID (did:agent:eip155:1:10002)</h1>

        <h2>Core Capabilities</h2>
        <ul>
          <li>ERC-8004 Agent Identity: Globally unique on-chain <code>agentId</code> anchors the <code>did:agent</code>.</li>
          <li>Controller Portability: Rotate keys or change controllers without changing the DID.</li>
          <li>Fine-Grained Delegation: Assign roles/capabilities to delegates; enforce via AA + ERC-1271.</li>
          <li>Interoperable Messaging: Clear Subject/Issuer for VCs/VPs across agents (MCP).</li>
          <li>Verifiable Actions: EIP-712 signing and on-chain validation via <code>isValidSignature</code>.</li>
          <li>Discoverable Services: Publish agent services/capabilities for automated integration.</li>
          <li>UX & Gas Options: Paymasters, batching, and sponsorship for seamless on-chain calls.</li>
          <li>Auditability: On-chain provenance and attestations enable traceability and revocation.</li>
        </ul>

        <h2>Signature and Verification Mechanics</h2>
        <ul>
          <li>Delegator signs EIP-712 structured data on behalf of a smart account using their EOA</li>
          <li>Signature is verified on-chain using ERC-1271's <code>isValidSignature</code></li>
          <li>Signed messages, VCs, or VPs can be transferred across agents and validated on-chain</li>
          <li>Subject/Issuer DID is tied to an Agent ERC-8004 agentId, not a static EOA</li>
          <li>Support for multiple signature schemes and custom validation logic</li>
        </ul>


        <h2>Veramo Agent Shared Package</h2>
        <p>Extend Veramo's capabilities to support:</p>
        <ul>
          <li>Agent DID Methods (e.g. <code>did:agent:eip155:1:10002</code>)</li>
          <li>ERC-4337 signing and delegation flows</li>
          <li>ERC-1271-compatible VC and VP issuance/verification</li>
          <li>Integration with popular DID resolution networks</li>
          <li>Support for emerging Account Abstraction standards</li>
          <li>Cross-chain DID resolution and verification</li>
        </ul>

        <h2>Resources</h2>
        <ul>
          <li>ERC-8004 Specification</li>
          <li>ERC-1271 Specification</li>
          <li>Account Abstraction Implementation Guide</li>
          <li>DID Core Specification</li>
          <li>Veramo Documentation</li>
          <li>Security Best Practices</li>
        </ul>
      </div>
    </div>
  );
};

export default RootPage;
