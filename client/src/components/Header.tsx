import '../custom-styles.css'

const Header: React.FC = () => {
  return (
    <div style={{ maxWidth: '100vw'}}>
      <div className='main-header'>
        <h1 className='main-header-text'>🐊 Gator Link </h1>
      </div>

      <nav className='main-nav'>
        <ul className='main-nav-ul'>

          <a className='main-nav-link' href="/">
            <li className='main-nav-li'> Introduction </li>
          </a>

          <a className='main-nav-link' href="/example">
            <li className='main-nav-li'> Example </li>
          </a>

        </ul>
      </nav>
    </div>
  );
};

export default Header;
