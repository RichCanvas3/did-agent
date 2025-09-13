import '../custom-styles.css'

const Header: React.FC = () => {
  return (
    <div style={{ maxWidth: '100vw'}}>
      <div className='main-header'>
        <h2 className='main-header-text'>MCP Client Agent: Handyman Services </h2>
        <h3 className='main-header-text'>ERC-8004 did:agent --- JWT auth, VC, VP and Payment </h3>
      </div>
      <div>&nbsp;</div>
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
