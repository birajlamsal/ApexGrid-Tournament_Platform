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
