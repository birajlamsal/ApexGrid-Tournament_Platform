import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <div className="logo">PUBG<span>Pulse</span></div>
          <p>Competitive PUBG tournaments, curated stats, and verified results.</p>
          <div className="footer-chips">
            <span className="chip">Global</span>
            <span className="chip">API-ready</span>
            <span className="chip">Esports ops</span>
          </div>
        </div>
        <div className="footer-links">
          <span className="footer-title">Quick Links</span>
          <Link to="/tournaments">Tournaments</Link>
          <Link to="/announcements">News</Link>
          <Link to="/contact">Contact</Link>
        </div>
        <div className="footer-links">
          <span className="footer-title">Tools</span>
          <Link to="/matchidextract">Match ID Extractor</Link>
          <Link to="/matchdetails">Match Details</Link>
          <Link to="/admin">Admin Console</Link>
        </div>
        <div className="footer-meta">
          <span>Admin-controlled data • PUBG API ready</span>
          <span>© 2026 PUBGPulse. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
