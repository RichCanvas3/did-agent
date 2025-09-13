import '../custom-styles.css'

const Header: React.FC = () => {
  return (
    <div style={{ maxWidth: '100vw'}}>
      <div className='main-header'>
        <h1 className='main-header-text'>Agent DID (did:agent:eip155:1:1002)</h1>
      </div>

      <nav className='main-nav'>
        <ul className='main-nav-ul'>

          <a className='main-nav-link' href="/">
            <li className='main-nav-li'> Intro </li>
          </a>
          <a className='main-nav-link' href="/jwt">
            <li className='main-nav-li'> MCP Request </li>
          </a>
          <a className='main-nav-link' href="/eth">
            <li className='main-nav-li'> MCP Payment </li>
          </a>


          

          

        </ul>
      </nav>
    </div>
  );
};

export default Header;
