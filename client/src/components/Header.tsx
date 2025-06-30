import '../custom-styles.css'

const Header: React.FC = () => {
  return (
    <div style={{ maxWidth: '100vw'}}>
      <div className='main-header'>
        <h1 className='main-header-text'>Account Abstraction DID (did:aa:eip155:...)</h1>
      </div>

      <nav className='main-nav'>
        <ul className='main-nav-ul'>

          <a className='main-nav-link' href="/">
            <li className='main-nav-li'> Intro </li>
          </a>

          <a className='main-nav-link' href="/example">
            <li className='main-nav-li'> Example </li>
          </a>

          <a className='main-nav-link' href="/usdc">
            <li className='main-nav-li'> USDC </li>
          </a>

          <a className='main-nav-link' href="/eth">
            <li className='main-nav-li'> ETH </li>
          </a>

          <a className='main-nav-link' href="/jwt">
            <li className='main-nav-li'> JWT </li>
          </a>

          <a className='main-nav-link' href="/metamask-card">
            <li className='main-nav-li'> MetaMask </li>
          </a>

          <a className='main-nav-link' href="/permission-delegation">
            <li className='main-nav-li'> Permissions </li>
          </a>

        </ul>
      </nav>
    </div>
  );
};

export default Header;
