import { SendMcpMessage } from '../components/SendMcpMessage';
import '../custom-styles.css'

const ExamplePage: React.FC = () => {
  return (
    <>
      <h2> Gator Link Example </h2>

      <ul>
        <li>Demonstrates MCP agent service request and recurring payments for Gator Lawn Service.</li>
        <li>Client and server MCP agents leveraging <a href="https://eips.ethereum.org/EIPS/eip-4337" target="_blank">ERC-4337</a> and <a href="https://eips.ethereum.org/EIPS/eip-7710" target="_blank">ERC-7710</a> for account abstraction.</li>
        <li>Client and server DID identification and verification leveraging <a href="https://eips.ethereum.org/EIPS/eip-1271" target="_blank">ERC-1271</a>.</li>
        <li>Client requests verifiable credentials and presentations using Veramo-based account abstraction DID management.</li>
        <li>Embedded native token stream payment permissions leveraging <a href="https://eips.ethereum.org/EIPS/eip-7715" target="_blank">ERC-7715</a>.</li>
      </ul>

      <SendMcpMessage />
    </>
  );
};

export default ExamplePage;
