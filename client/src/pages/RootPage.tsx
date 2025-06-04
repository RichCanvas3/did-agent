import { ShoppingCartIcon, BriefcaseIcon, UserCircleIcon, StarIcon} from '@heroicons/react/20/solid'
import '../custom-styles.css'

const RootPage: React.FC = () => {
  return (
    <>
      <h2> Introducing the Gator Link Tech Framework </h2>

      <h3> Revolutionizing how local services are booked, paid, and shared. </h3>

      <p> The Gator Link Tech Framework is a cutting-edge infrastructure that powers seamless transactions and smart contract automation between customers, service providers, and third-party marketplaces. Imagine it as the blockchain-native backbone for the "Amazon of House Services." </p>

      <div style={{display: 'flex'}}>
        <ShoppingCartIcon width='30px' fill='teal' style={{marginRight: '10px'}}/>
        <h3> For Marketplaces </h3>
      </div>

      <p> Marketplaces like third-party <b>House Services Sites</b> (e.g., home maintenance platforms) integrate Gator Link to: </p>

      <ul>
        <li> Onboard and authenticate customers via EOA wallets. </li>
        <li> Offer service catalogs (e.g., house cleaning, lawn care, handyman). </li>
        <li> Automatically receive a <b>commission</b> (% incentive) from every completed sale via on-chain incentive routing. </li>
        <li> Get <b>proof of sale</b> and trust via <b>Verifiable Credentials</b> and Delegated Payments. </li>
      </ul>

      <div style={{display: 'flex'}}>
        <BriefcaseIcon width='30px' fill='teal' style={{marginRight: '10px'}}/>
        <h3> For Service Providers </h3>
      </div>

      <p> Local service providers like cleaning or lawn care companies plug in their Service Provider Agent and receive: </p>

      <ul>
        <li> Secure, <b>recurring payments</b> (USDC) through smart accounts (AA accounts). </li>
        <li> Immediate fund access to their <b>Mastercard (business)</b>. </li>
        <li> Full control over pricing, product catalogs, and messaging. </li>
        <li> Contracts issued as <b>DIDs & Verifiable Presentations</b>, cryptographically signed. </li>
      </ul>

      <div style={{display: 'flex'}}>
        <UserCircleIcon width='30px' fill='teal' style={{marginRight: '10px'}}/>
        <h3> For Customers </h3>
      </div>

      <p> End users enjoy: </p>

      <ul>
        <li> Booking services with just a few taps via familiar platforms. </li>
        <li> Making payments with <b>Mastercard or crypto wallets</b>, funneled through secure smart accounts. </li>
        <li> Transparent payment delegation to verified service agents. </li>
        <li> Instant refunds via direct transfers if needed. </li>
      </ul>

      <div style={{display: 'flex'}}>
        <StarIcon width='30px' fill='teal' style={{marginRight: '10px'}}/>
        <h3> Key Tech Highlights </h3>
      </div>

      <ul>
        <li> <b>Account Abstraction (AA)</b> powers programmable USDC payments. </li>
        <li> <b>Delegated Payment Flows</b> handled by Recurring Payment Agents. </li>
        <li> <b>DID & Verifiable Credentials (VP)</b> secure contracts and automate trust. </li>
        <li> <b>Revenue Sharing Smart Logic</b> gives third parties a real-time share of the sale. </li>
      </ul>

      <p> <b>Gator Link</b> isn't just tech. It's the invisible trust engine behind service economies of the future - on-chain, programmable, and decentralized. Whether you're a platform, provider, or partner, Gator Link makes every link in the value chain smarter. </p>
    </>
  );
};

export default RootPage;
