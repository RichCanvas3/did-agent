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
        <h1>MCP · ERC-8004 Identity Registry · did:agent · Veramo (JWT, VC, VP)</h1>

        <h2>Introduction</h2>
        <p>
          This work introduces a standards-based framework for agent identity and service interaction that
          brings together <strong>ERC-8004</strong>, <strong>did:agent</strong>, and <strong>Veramo</strong>.
          The core technology establishes globally unique on-chain agent identities anchored in the
          ERC-8004 Identity Registry, extended with Veramo to support resolution, signing, and verification
          across DID networks.
        </p>
        <p>
          The approach enables authenticated agent-to-service interactions using JWT, Verifiable Credentials (VCs),
          and Verifiable Presentations (VPs), with native support for Account Abstraction (AA), ERC-1271 validation,
          and cryptographically verifiable actions.
        </p>

        <h2>Two Key Use Cases</h2>
        <h3>1) MCP Request: Client Agent Authenticating with a Service Tool</h3>
        <ul>
          <li>A client agent uses its <code>did:agent</code> identity to generate a signed JWT.</li>
          <li>The JWT is included in an MCP <code>AskForService</code> request to authenticate and authorize the interaction.</li>
          <li>The service tool validates the JWT against the ERC-8004 registry via Veramo.</li>
          <li>Enables secure discovery, negotiation, and exchange of proposals between agents and MCP services.</li>
        </ul>

        <h3>2) MCP Payment: Getting Services and Making Payments</h3>
        <ul>
          <li>Upon proposal acceptance, the client agent commits to a <code>ServiceRequest</code>.</li>
          <li>Payment is processed using JWTs plus VCs/VPs to prove compliance, authority, or entitlements.</li>
          <li>Final settlement moves ETH or tokens via the client AA wallet, validated with ERC-1271.</li>
          <li>Identity and value transfer are cryptographically bound, auditable, and anchored in ERC-8004.</li>
        </ul>

        <h2>Core Technology & Capabilities</h2>
        <ul>
          <li><strong>ERC-8004 Agent Identity</strong>: on-chain <code>agentId</code> anchoring the <code>did:agent</code> identifier.</li>
          <li><strong>did:agent Method</strong>: deterministic DID format binding directly to ERC-8004 <code>agentId</code>.</li>
          <li><strong>Veramo Agent Extension</strong>: ERC-8004 resolver + support for AA, ERC-1271, VCs, VPs.</li>
          <li><strong>MCP Integration</strong>: structured interactions (AskForService, ServiceRequest, ProcessPayment) authenticated by JWTs and enriched with credentials.</li>
          <li><strong>Interoperable Security</strong>: cryptographic guarantees for discovery, negotiation, and execution.</li>
          <li><strong>Fine-Grained Delegation</strong>: roles/capabilities enforced via AA + ERC-1271.</li>
          <li><strong>Verifiable Actions</strong>: EIP-712 signing, on-chain <code>isValidSignature</code> checks.</li>
          <li><strong>Operational UX</strong>: Paymasters, batching, sponsorship for seamless on-chain calls.</li>
          <li><strong>Auditability</strong>: on-chain attestations for provenance and revocation.</li>
        </ul>

        <h2>Signature and Verification Mechanics</h2>
        <ul>
          <li>Delegator signs EIP-712 structured data on behalf of a smart account using their EOA</li>
          <li>Signature is verified on-chain using ERC-1271's <code>isValidSignature</code></li>
          <li>Signed messages, VCs, or VPs can be transferred across agents and validated on-chain</li>
          <li>Subject/Issuer DID is tied to an Agent ERC-8004 agentId, not a static EOA</li>
          <li>Support for multiple signature schemes and custom validation logic</li>
        </ul>


        <h2>Veramo</h2>
        <p>Extended to support:</p>
        <ul>
          <li>did:agent DID Method</li>
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
