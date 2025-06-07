import { ShoppingCartIcon, BriefcaseIcon, UserCircleIcon, StarIcon} from '@heroicons/react/20/solid'
import '../custom-styles.css'

const RootPage: React.FC = () => {
  return (
    <div className="root-page">
      <div className="content">
        <h1>Account Abstraction DID (did:aa:eip155:...)</h1>

        <h2>Core Capabilities</h2>
        <ul>
          <li>Agent Interoperability: Subject and Issuer identification for VC and VP communication between agents (via DIDComm and MCP).</li>
          <li>Simplified UI: Supports gasless (Paymaster), batching, and sponsorship for on-chain invocations.</li>
          <li>Delegation & Role Access: Managed via Account Abstraction delegation logic.</li>
          <li>Key Rotation: DID is not tied to a single EOA; supports updates without re-publication.</li>
          <li>Compatibility with ZK circuits and MPC wallets.</li>
          <li>Enhanced Security: Multi-factor authentication and social recovery options.</li>
          <li>Cost Efficiency: Batch transactions and gas optimization through Account Abstraction.</li>
        </ul>


        <h2>When to Use Account Abstraction-based DIDs</h2>
        <ul>
          <li>You need organization wallets or multi-sig control</li>
          <li>You want social recovery or modular signing logic</li>
          <li>You want gasless onboarding or sponsored credentials</li>
          <li>You're integrating with ERC-4337, EIP-1271, or ZK-based workflows</li>
          <li>You need flexible key management for large organizations</li>
          <li>You want to implement progressive security measures</li>
        </ul>

        <h2>Signature and Verification Mechanics</h2>
        <ul>
          <li>Delegator signs EIP-712 structured data on behalf of a smart account using their EOA</li>
          <li>Signature is verified on-chain using ERC-1271's <code>isValidSignature</code></li>
          <li>Signed messages, VCs, or VPs can be transferred across agents and validated on-chain</li>
          <li>Subject/Issuer DID is tied to an Account Abstraction address, not a static EOA</li>
          <li>Support for multiple signature schemes and custom validation logic</li>
        </ul>




        <h2>Why Account Abstraction DIDs Are Still Emerging</h2>
        <p>
          Traditional DID methods like <code>did:ethr</code>, <code>did:web</code>, <code>did:key</code>, and <code>did:peer</code> assume an EOA with a private key.
        </p>
        <p>Account Abstraction (via ERC-4337 and smart wallets) breaks this assumption by enabling smart contracts to act as fully sovereign identities—without needing private keys.</p>
        <p>Most current DID libraries and resolvers expect direct signing from a keypair, so smart contract wallets don't yet integrate cleanly.</p>


        <h2>MyOrgWallet Integration</h2>
        <ul>
          <li>Ties attestations to both Organization and Individual Account Abstractions</li>
          <li>Manages Account Abstraction DIDs across orgs and individuals</li>
          <li>Publishes discoverable DID Documents for AA wallets</li>
          <li>DID Documents include delegation relationships and organization services</li>
          <li>Automated compliance and audit trail features</li>
          <li>Integration with popular identity providers and SSO solutions</li>
        </ul>

        <h2>Project Shared Package</h2>
        <p>Extend Veramo's capabilities to support:</p>
        <ul>
          <li>Account Abstraction DID Methods (e.g. <code>did:aa:eip155:...</code>)</li>
          <li>ERC-4337 signing and delegation flows</li>
          <li>ERC-1271-compatible VC and VP issuance/verification</li>
          <li>Integration with popular DID resolution networks</li>
          <li>Support for emerging Account Abstraction standards</li>
          <li>Cross-chain DID resolution and verification</li>
        </ul>

        <h2>Resources</h2>
        <ul>
          <li>ERC-4337 Specification</li>
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
