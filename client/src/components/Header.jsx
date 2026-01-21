import { NavLink } from "react-router-dom";

const Header = () => {
  return (
    <header className="site-header">
      <div className="header-left">
        <div className="logo">PUBG<span>Pulse</span></div>
        <span className="dev-badge">🚧 In Development</span>
      </div>
      <nav className="nav-links">
        <NavLink to="/">Home</NavLink>
        <NavLink to="/tournaments">Tournaments</NavLink>
        <NavLink to="/announcements">Announcements</NavLink>
        <div className="nav-dropdown">
          <button type="button" className="dropdown-toggle">
            Extras
          </button>
          <div className="dropdown-menu">
            <NavLink to="/matchidextract">Match ID Extractor</NavLink>
            <NavLink to="/matchdetails">Match Details Downloader</NavLink>
          </div>
        </div>
        <NavLink to="/contact">Contact</NavLink>
      </nav>
      <a
        className="cta-button"
        href="https://discord.gg/SNUaRtxsXz"
        target="_blank"
        rel="noreferrer"
      >
        Join Discord
      </a>
    </header>
  );
};

export default Header;
