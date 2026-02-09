import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <div className="footer-social">
            <a
              className="footer-social__item"
              href="https://www.facebook.com/birajlamsalhoma/"
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
              title="Facebook"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H7v3h3v6h3v-6h3l1-3h-4v-2c0-.6.4-1 1-1Z" />
              </svg>
            </a>
            <a
              className="footer-social__item"
              href="https://www.instagram.com/birajlamsal/"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              title="Instagram"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm10 2H7a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm-5 3.2a3.8 3.8 0 1 1 0 7.6 3.8 3.8 0 0 1 0-7.6Zm0 2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6ZM17.5 6.5a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Z" />
              </svg>
            </a>
            <a
              className="footer-social__item"
              href="https://discord.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Discord"
              title="Discord"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.3 5.5A16.5 16.5 0 0 0 16.4 4l-.2.4a11.4 11.4 0 0 1 3.4 1.3 13 13 0 0 0-4.6-1.5 12.9 12.9 0 0 0-5 0A13 13 0 0 0 5.4 5.7 11.4 11.4 0 0 1 8.8 4.4L8.6 4a16.5 16.5 0 0 0-3.9 1.5C2.7 8.2 2.1 10.8 2.3 13.3a16.6 16.6 0 0 0 4.9 2.5l.6-.8a10.7 10.7 0 0 1-2-1c.2-.2.3-.3.4-.5a7.8 7.8 0 0 0 7.6 0c.1.2.3.3.4.5a10.7 10.7 0 0 1-2 1l.6.8a16.6 16.6 0 0 0 4.9-2.5c.2-2.5-.4-5.1-2.4-7.8ZM9.6 12.5a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Zm4.8 0a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Z" />
              </svg>
            </a>
            <a
              className="footer-social__item"
              href="https://x.com/BirajLamsal"
              target="_blank"
              rel="noreferrer"
              aria-label="X (Twitter)"
              title="X (Twitter)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.9 3H21l-6.7 7.6L22 21h-6.1l-4.8-6.2L5.6 21H3.4l7.2-8.2L2 3h6.2l4.3 5.6L18.9 3Zm-1.1 16h1.7L7.3 5H5.5l12.3 14Z" />
              </svg>
            </a>
            <a
              className="footer-social__item"
              href="https://www.linkedin.com/in/birajlamsal/"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              title="LinkedIn"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6.2 9H3.4v12h2.8V9Zm-1.4-1.3a1.6 1.6 0 1 1 0-3.2 1.6 1.6 0 0 1 0 3.2ZM21 14.2V21h-2.8v-6c0-1.5-.6-2.5-2-2.5-1.1 0-1.7.7-2 1.4-.1.3-.1.7-.1 1V21H11V9h2.7v1.6c.4-.7 1.2-1.7 3-1.7 2.2 0 4 1.4 4 4.3Z" />
              </svg>
            </a>
          </div>
          <div className="logo">Apex<span>Grid</span></div>
          <p>Competitive PUBG tournaments, curated stats, and verified results.</p>
          <div className="footer-chips">
            <span className="chip">Global</span>
            <span className="chip">API-ready</span>
            <span className="chip">Esports ops</span>
          </div>
        </div>
        <div className="footer-links">
          <span className="footer-title">Quick Links</span>
          <Link to="/pubg/tournaments">Tournaments</Link>
          <Link to="/pubg/announcements">News</Link>
          <Link to="/pubg/contact">Contact</Link>
        </div>
        <div className="footer-links footer-links--tools">
          <span className="footer-title">Tools</span>
          <Link to="/pubg/matchidextract">Match ID Extractor</Link>
          <Link to="/pubg/matchdetails">Match Details</Link>
          <Link to="/pubg/admin">Admin Console</Link>
        </div>
        <div className="footer-meta">
          <span>Admin-controlled data • PUBG API ready</span>
          <span>© 2026 ApexGrid. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
