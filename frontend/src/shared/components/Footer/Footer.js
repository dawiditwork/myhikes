import React from 'react';
import { Link } from 'react-router-dom';

import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer__content">
        <p>© {new Date().getFullYear()} MyHikes</p>
        <nav className="footer__links" aria-label="Footer navigation">
          <a
            href="https://github.com/dawiditwork"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a
            href="https://www.linkedin.com/in/dawid-f-978307425/"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
          <a
            href="https://dawidfrankowicz.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Portfolio
          </a>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
