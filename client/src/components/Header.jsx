import { NavLink } from "react-router-dom";

const Header = () => {
  return (
    <header className="site-header">
      <div className="header-left">
        <div className="logo">PUBG<span>Pulse</span></div>
        <span className="status-chip">Ops Live</span>
      </div>
      <nav className="nav-links">
        <NavLink to="/">Hub</NavLink>
        <NavLink to="/tournaments">Tournaments</NavLink>
        <NavLink to="/announcements">News</NavLink>
        <div className="nav-dropdown">
          <button type="button" className="dropdown-toggle">
            Tools
          </button>
          <div className="dropdown-menu">
            <NavLink to="/matchidextract">Match ID Extractor</NavLink>
            <NavLink to="/matchdetails">Match Details Downloader</NavLink>
            <NavLink to="/admin">Admin Console</NavLink>
          </div>
        </div>
        <NavLink to="/contact">Contact</NavLink>
      </nav>
      <div className="header-actions">
        <label className="search-box" aria-label="Search tournaments">
          <span className="search-icon" aria-hidden="true">
            ⌕
          </span>
          <input type="search" placeholder="Search tournaments, teams..." />
        </label>
        <select className="lang-select" aria-label="Language">
          <option value="en">EN</option>
          <option value="sea">SEA</option>
          <option value="eu">EU</option>
          <option value="na">NA</option>
        </select>
        <button type="button" className="user-button">
          Commander
        </button>
        <a
          className="cta-button"
          href="https://discord.gg/SNUaRtxsXz"
          target="_blank"
          rel="noreferrer"
        >
          Join Discord
        </a>
      </div>
    </header>
  );
};

export default Header;
