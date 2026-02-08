import React from 'react';
import { FaGithub, FaLinkedin, FaTwitter, FaHeart, FaCode } from 'react-icons/fa';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <div className="footer-brand">
            <img src="/logo.png" alt="Flixary" className="footer-logo" />
            <span className="footer-brand-text">Flixary</span>
          </div>
          <p className="footer-tagline">Film ve Dizi Takip Platformu</p>
        </div>

        <div className="footer-section">
          <h4>Geliştirici</h4>
          <div className="footer-developer">
            <p className="developer-name">
              <FaCode /> Mehmet Tevfik Çetin
            </p>
            <div className="footer-social">
              <a 
                href="https://github.com/mehmettevfikcetin" 
                target="_blank" 
                rel="noopener noreferrer"
                className="social-link"
                title="GitHub"
              >
                <FaGithub />
              </a>
              <a 
                href="https://linkedin.com/in/mehmettevfikcetin" 
                target="_blank" 
                rel="noopener noreferrer"
                className="social-link"
                title="LinkedIn"
              >
                <FaLinkedin />
              </a>
              <a 
                href="https://twitter.com/mehmettevfikcetin" 
                target="_blank" 
                rel="noopener noreferrer"
                className="social-link"
                title="Twitter"
              >
                <FaTwitter />
              </a>
            </div>
          </div>
        </div>

        <div className="footer-section">
          <h4>Teknolojiler</h4>
          <ul className="footer-tech">
            <li>React + Vite</li>
            <li>Firebase</li>
            <li>TMDB API</li>
            <li>Vercel</li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>
          © {currentYear} Flixary. Tüm hakları saklıdır. 
          <span className="made-with">
            Made with <FaHeart className="heart-icon" /> by Mehmet Tevfik Çetin
          </span>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
