import { useEffect } from 'react';
import './paulze.css';
import paulzeLogo from './assets/logo_no_black.svg';
import neoPhoto from './assets/neo-matsuyama.png';
import mattPhoto from './assets/matthew-fallon.png';
import meyerPhoto from './assets/meyer-eskin.png';
import LinkedInIcon from './assets/linkedin.svg?react';

export default function Paulze() {
  useEffect(() => {
    const header = document.getElementById('header') as HTMLElement;
    const logoImg = header.querySelector<HTMLImageElement>('.logo-img');
    const navLinks = header.querySelectorAll<HTMLAnchorElement>('.nav-links a');

    function onScroll() {
      const progress = Math.min(window.scrollY / 120, 1);
      header.style.padding = `${1 - 0.5 * progress}rem 0`;
      if (logoImg) logoImg.style.height = `${88 - 56 * progress}px`;
      navLinks.forEach(a => { a.style.fontSize = `${0.95 - 0.15 * progress}rem`; });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header id="header">
        <div className="header-inner">
          <a href="/" className="logo-link">
            <img src={paulzeLogo} alt="Paulze" className="logo-img" />
          </a>
          <nav>
            <ul className="nav-links">
              <li><a href="#problem">The Problem</a></li>
              <li><a href="#how-it-works">How It Works</a></li>
              <li><a href="#benefits">Benefits</a></li>
              <li><a href="#co-founders">Co-founders</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container hero-content">
            <span className="hero-badge">B2B Marketplace</span>
            <h1>Liquidate near-expiry crop protection. <span>No waste.</span></h1>
            <p className="hero-tagline">
              Paulze connects agrochemical manufacturers with vetted distributors to move soon-to-expire inventory at fair prices — so nothing goes to waste.
            </p>
          </div>
        </section>

        <section id="problem" className="problem">
          <div className="container">
            <p className="section-label">The Problem</p>
            <h2 className="section-title">Billions in chemicals expire every year</h2>
            <p className="section-subtitle">
              Unsold crop protection products often sit until they pass expiry — destroying value for manufacturers and leaving distributors without access to discounted supply.
            </p>
            <div className="problem-stat">$2B+</div>
            <p>Estimated value of crop protection chemicals that expire or are written off annually.</p>
            <div className="problem-cards">
              <div className="problem-card">
                <h3>Manufacturers lose margin</h3>
                <p>Excess inventory and write-offs hurt profitability and complicate planning.</p>
              </div>
              <div className="problem-card">
                <h3>Distributors miss deals</h3>
                <p>No trusted channel to source near-expiry product at discount for short-cycle use.</p>
              </div>
              <div className="problem-card">
                <h3>Environment pays the cost</h3>
                <p>Unused chemicals add to waste and disposal burden when they could still be used safely.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works">
          <div className="container">
            <p className="section-label">How It Works</p>
            <h2 className="section-title">Three steps to liquidate and buy</h2>
            <p className="section-subtitle">
              We broker the deal so manufacturers recover value and distributors get vetted product at a discount.
            </p>
            <div className="steps">
              <div className="step">
                <div className="step-num">Step 1</div>
                <span className="step-arrow" aria-hidden="true">→</span>
                <h3>Manufacturers list SKUs</h3>
                <p>Submit near-expiry crop protection SKUs and volumes. We handle pricing and matching.</p>
              </div>
              <div className="step">
                <div className="step-num">Step 2</div>
                <span className="step-arrow" aria-hidden="true">→</span>
                <h3>Paulze brokers the deal</h3>
                <p>We connect you with vetted distributors and facilitate terms, documentation, and logistics.</p>
              </div>
              <div className="step">
                <div className="step-num">Step 3</div>
                <h3>Distributors buy at discount</h3>
                <p>Distributors purchase at a discount for short-cycle use — product moves, everyone wins.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="benefits" className="benefits">
          <div className="container">
            <p className="section-label">Key Benefits</p>
            <h2 className="section-title">Built for both sides of the market</h2>
            <p className="section-subtitle">
              Manufacturers recover value; distributors get reliable supply at better prices.
            </p>
            <div className="benefits-grid">
              <div className="benefits-column">
                <h3>For Manufacturers</h3>
                <ul>
                  <li>Liquidate near-expiry inventory without damaging brand or channel</li>
                  <li>Recover value instead of writing off product</li>
                  <li>Vetted distributors only — no grey market risk</li>
                  <li>Simple process: list SKUs, we handle matching and brokering</li>
                </ul>
              </div>
              <div className="benefits-column">
                <h3>For Distributors</h3>
                <ul>
                  <li>Access to discounted crop protection for short-cycle use</li>
                  <li>Trusted source — all product from verified manufacturers</li>
                  <li>Clear documentation and compliance support</li>
                  <li>Better margins on inventory that moves before expiry</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="co-founders" className="co-founders">
          <div className="container">
            <p className="section-label">The Team</p>
            <h2 className="section-title">Co-founders</h2>
            <p className="section-subtitle">
              The team building the marketplace for near-expiry crop protection.
            </p>
            <div className="founders-grid">
              <article className="founder-card">
              <div className="founder-photo" aria-hidden="true">
                  <img src={meyerPhoto} alt="" />
                </div>
                <h2 className="founder-name">Meyer Eskin</h2>
                <p className="founder-uni">Queen's University</p>
                <a href="https://www.linkedin.com/in/meyereskin/" className="founder-linkedin" target="_blank" rel="noopener noreferrer">
                  <LinkedInIcon />
                  LinkedIn
                </a>
              </article>

              <article className="founder-card">
                <div className="founder-photo" aria-hidden="true">
                  <img src={neoPhoto} alt="" />
                </div>
                <h2 className="founder-name">Neo Matsuyama</h2>
                <p className="founder-uni">University of Pennsylvania</p>
                <a href="https://www.linkedin.com/in/neo-matsuyama/" className="founder-linkedin" target="_blank" rel="noopener noreferrer">
                  <LinkedInIcon />
                  LinkedIn
                </a>
              </article>

              <article className="founder-card">
              <div className="founder-photo" aria-hidden="true">
                  <img src={mattPhoto} alt="" />
                </div>
                <h2 className="founder-name">Matthew Fallon</h2>
                <p className="founder-uni">Wharton, University of Pennsylvania</p>
                <a href="https://www.linkedin.com/in/mattf196/" className="founder-linkedin" target="_blank" rel="noopener noreferrer">
                  <LinkedInIcon />
                  LinkedIn
                </a>
              </article>
            </div>
          </div>
        </section>

        <footer id="contact">
          <div className="container">
            <div className="footer-grid">
              <div className="footer-brand">
                <a href="/" className="logo-link">
                  <img src={paulzeLogo} alt="Paulze" className="logo-img" />
                </a>
                <p>B2B marketplace for near-expiry crop protection chemicals. Connect with us to list or buy.</p>
              </div>
              <div className="footer-contact">
                <h4>Contact</h4>
                <a href="mailto:team@paulze.com">team@paulze.com</a>
              </div>
            </div>
            <div className="footer-bottom">
              © Paulze. All rights reserved.
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
