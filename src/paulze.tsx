import { useEffect, useRef } from 'react';
import LinkedInIcon from './assets/linkedin.svg?react';
import paulzeLogo from './assets/logo_no_black.svg';
import mattPhoto from './assets/matthew-fallon.png';
import meyerPhoto from './assets/meyer-eskin.png';
import neoPhoto from './assets/neo-matsuyama.png';
import { CONTINENTS, type Polygon } from './continent-data';
import './paulze.css';

// ─── Globe Canvas ─────────────────────────────────────────────────────────────

const CITY_LIGHTS: [number, number][] = [
  [40.71, -74.01], [34.05, -118.24], [41.88, -87.63], [29.76, -95.37],
  [33.45, -112.07], [47.61, -122.33], [25.77, -80.19], [32.78, -96.80],
  [38.90, -77.04], [42.36, -71.06], [43.65, -79.38], [45.50, -73.57],
  [-23.55, -46.63], [-34.60, -58.38], [-12.04, -77.03], [4.71, -74.07],
  [-33.46, -70.65], [-15.78, -47.93],
  [51.51, -0.13], [48.85, 2.35], [52.52, 13.41], [40.42, -3.70],
  [41.90, 12.50], [59.33, 18.07], [55.75, 37.62],
  [41.01, 28.98], [35.69, 51.39], [25.20, 55.27],
  [19.08, 72.88], [28.64, 77.22], [13.08, 80.27],
  [39.91, 116.39], [31.23, 121.47], [22.54, 114.06],
  [35.69, 139.69], [37.57, 126.98],
  [1.36, 103.82], [13.75, 100.52],
  [30.06, 31.25], [-26.20, 28.04], [6.38, 3.52], [-1.29, 36.82],
  [-33.87, 151.21], [-37.81, 144.96],
];

const CANVAS_SIZE = 900;
const DEG2RAD = Math.PI / 180;

/**
 * Draw a continent polygon. Hidden vertices are projected onto the sphere
 * edge so the polygon naturally hugs the silhouette — no arcs, no chords,
 * no direction ambiguity, no edge glitches.
 */
function drawContinentPolygon(
  ctx: CanvasRenderingContext2D,
  polygon: Polygon,
  cx: number,
  cy: number,
  R: number,
  lonOffset: number,
) {
  const Z_CLIP = 0.12; // fade-out zone slightly inside the silhouette

  let anyVisible = false;
  const projected = polygon.map(([latDeg, lonDeg]) => {
    const lat = latDeg * DEG2RAD;
    const lon = lonDeg * DEG2RAD + lonOffset;
    const x = Math.cos(lat) * Math.sin(lon);
    const y = -Math.sin(lat);
    const z = Math.cos(lat) * Math.cos(lon);

    if (z > Z_CLIP) {
      anyVisible = true;
      return { sx: cx + x * R, sy: cy + y * R };
    }
    // Hidden: push (x,y) outward to lie on the sphere edge circle
    const len = Math.sqrt(x * x + y * y) || 1;
    return { sx: cx + (x / len) * R, sy: cy + (y / len) * R };
  });

  if (!anyVisible) return;

  ctx.beginPath();
  ctx.moveTo(projected[0].sx, projected[0].sy);
  for (let i = 1; i < projected.length; i++) {
    ctx.lineTo(projected[i].sx, projected[i].sy);
  }
  ctx.closePath();
  ctx.fill();
}

function GlobeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    if (!ctx) return;

    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    let animId: number;
    let lonOffset = 0;
    let rotSpeed = 0.0018; // base auto-rotation speed (rad/frame)
    let dragVelX = 0;      // velocity from mouse drag
    let isDragging = false;
    let lastMouseX = 0;

    // ── Mouse interaction ──────────────────────────────────────────────
    function onMouseDown(e: MouseEvent) {
      isDragging = true;
      lastMouseX = e.clientX;
      dragVelX = 0;
    }
    function onMouseMove(e: MouseEvent) {
      if (!isDragging) return;
      const dx = e.clientX - lastMouseX;
      dragVelX = dx * 0.005;    // map px to radians
      lastMouseX = e.clientX;
    }
    function onMouseUp() {
      isDragging = false;
      // dragVelX carries momentum, decays each frame
    }

    canvas.style.pointerEvents = 'auto';
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    function draw() {
      const W = CANVAS_SIZE;
      const H = CANVAS_SIZE;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const cx = W / 2;
      const cy = H / 2;
      const R = W * 0.42;

      // Apply rotation: auto-spin + drag momentum
      if (isDragging) {
        lonOffset += dragVelX;
      } else {
        // Decay drag velocity toward zero, blend back to auto-spin
        dragVelX *= 0.95;
        lonOffset += rotSpeed + dragVelX;
      }

      // ── Atmosphere outer glow ───────────────────────────────────────────
      const atmo = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.18);
      atmo.addColorStop(0, 'rgba(0, 229, 160, 0.00)');
      atmo.addColorStop(0.25, 'rgba(0, 229, 160, 0.14)');
      atmo.addColorStop(0.55, 'rgba(0, 229, 160, 0.06)');
      atmo.addColorStop(1, 'rgba(0, 229, 160, 0.00)');
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.18, 0, Math.PI * 2);
      ctx.fillStyle = atmo;
      ctx.fill();

      // ── Sphere base (ocean) ─────────────────────────────────────────────
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();

      const ocean = ctx.createRadialGradient(
        cx - R * 0.25, cy - R * 0.2, R * 0.05,
        cx, cy, R,
      );
      ocean.addColorStop(0, '#072a18');
      ocean.addColorStop(0.4, '#051a10');
      ocean.addColorStop(1, '#020d07');
      ctx.fillStyle = ocean;
      ctx.fillRect(0, 0, W, H);

      // ── Subtle ocean grid (very faint graticule) ────────────────────────
      const STEPS = 100;
      ctx.globalAlpha = 0.08;
      ctx.strokeStyle = '#00E5A0';
      ctx.lineWidth = 0.5;

      for (let latDeg = -60; latDeg <= 60; latDeg += 30) {
        const lat = latDeg * DEG2RAD;
        ctx.beginPath();
        let penDown = false;
        for (let i = 0; i <= STEPS; i++) {
          const lon = (i / STEPS) * Math.PI * 2 + lonOffset;
          const x3 = Math.cos(lat) * Math.sin(lon);
          const z3 = Math.cos(lat) * Math.cos(lon);
          if (z3 < 0) { penDown = false; continue; }
          const sx = cx + x3 * R;
          const sy = cy + (-Math.sin(lat)) * R;
          if (!penDown) { ctx.moveTo(sx, sy); penDown = true; }
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }

      for (let lonDeg = 0; lonDeg < 360; lonDeg += 30) {
        const lonBase = lonDeg * DEG2RAD + lonOffset;
        ctx.beginPath();
        let penDown = false;
        for (let i = 0; i <= STEPS; i++) {
          const lat = (i / STEPS) * Math.PI - Math.PI / 2;
          const x3 = Math.cos(lat) * Math.sin(lonBase);
          const y3 = -Math.sin(lat);
          const z3 = Math.cos(lat) * Math.cos(lonBase);
          if (z3 < 0) { penDown = false; continue; }
          const sx = cx + x3 * R;
          const sy = cy + y3 * R;
          if (!penDown) { ctx.moveTo(sx, sy); penDown = true; }
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // ── Continent fills ─────────────────────────────────────────────────
      // Land: subtle elevation from ocean with soft green tint
      ctx.fillStyle = 'rgba(14, 62, 38, 0.65)';
      for (const poly of CONTINENTS) {
        drawContinentPolygon(ctx, poly, cx, cy, R, lonOffset);
      }

      // Continent edges — thin bright stroke for definition
      ctx.strokeStyle = 'rgba(0, 229, 160, 0.14)';
      ctx.lineWidth = 0.8;
      for (const poly of CONTINENTS) {
        drawContinentPolygon(ctx, poly, cx, cy, R, lonOffset);
        ctx.stroke();
      }

      // Second pass: brighter interior fill near the center for depth
      const landHighlight = ctx.createRadialGradient(
        cx - R * 0.2, cy - R * 0.15, R * 0.1,
        cx, cy, R,
      );
      landHighlight.addColorStop(0, 'rgba(20, 80, 50, 0.30)');
      landHighlight.addColorStop(0.5, 'rgba(12, 55, 35, 0.12)');
      landHighlight.addColorStop(1, 'rgba(8, 35, 22, 0.00)');
      ctx.fillStyle = landHighlight;
      for (const poly of CONTINENTS) {
        drawContinentPolygon(ctx, poly, cx, cy, R, lonOffset);
      }

      // ── City lights ─────────────────────────────────────────────────────
      for (const [latDeg, lonDeg] of CITY_LIGHTS) {
        const lat = latDeg * DEG2RAD;
        const lon = lonDeg * DEG2RAD;
        const x3 = Math.cos(lat) * Math.sin(lon + lonOffset);
        const y3 = -Math.sin(lat);
        const z3 = Math.cos(lat) * Math.cos(lon + lonOffset);
        if (z3 < 0.05) continue;

        const sx = cx + x3 * R;
        const sy = cy + y3 * R;
        const alpha = z3 * 0.7 + 0.2;
        const dotR = (z3 * 1.8 + 0.6) * (R / 400);

        // Soft glow halo
        const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, dotR * 6);
        glow.addColorStop(0, `rgba(0, 229, 160, ${(alpha * 0.55).toFixed(2)})`);
        glow.addColorStop(0.35, `rgba(0, 229, 160, ${(alpha * 0.12).toFixed(2)})`);
        glow.addColorStop(1, 'rgba(0, 229, 160, 0)');
        ctx.beginPath();
        ctx.arc(sx, sy, dotR * 6, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Bright center dot
        ctx.beginPath();
        ctx.arc(sx, sy, dotR * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 255, 230, ${alpha.toFixed(2)})`;
        ctx.fill();
      }

      // ── Specular highlight (subtle light reflection on sphere) ──────────
      const spec = ctx.createRadialGradient(
        cx - R * 0.35, cy - R * 0.3, R * 0.02,
        cx - R * 0.2, cy - R * 0.15, R * 0.6,
      );
      spec.addColorStop(0, 'rgba(180, 255, 220, 0.04)');
      spec.addColorStop(0.3, 'rgba(120, 230, 180, 0.02)');
      spec.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = spec;
      ctx.fillRect(0, 0, W, H);

      // ── Night-side shadow ───────────────────────────────────────────────
      const shadow = ctx.createRadialGradient(
        cx + R * 0.45, cy + R * 0.05, R * 0.05,
        cx + R * 0.35, cy, R * 1.05,
      );
      shadow.addColorStop(0, 'rgba(1, 4, 2, 0.75)');
      shadow.addColorStop(0.35, 'rgba(1, 4, 2, 0.35)');
      shadow.addColorStop(0.7, 'rgba(1, 4, 2, 0.10)');
      shadow.addColorStop(1, 'rgba(1, 4, 2, 0.00)');
      ctx.fillStyle = shadow;
      ctx.fillRect(0, 0, W, H);

      ctx.restore();

      // ── Globe outline ring ──────────────────────────────────────────────
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 229, 160, 0.18)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return <canvas ref={canvasRef} className="globe-canvas" />;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Paulze() {
  useEffect(() => {
    const header = document.getElementById('header') as HTMLElement;
    const logoImg = header.querySelector<HTMLImageElement>('.logo-img');
    const navLinks = header.querySelectorAll<HTMLAnchorElement>('.nav-links a');
    function onScroll() {
      const p = Math.min(window.scrollY / 120, 1);
      header.style.padding = `${1 - 0.5 * p}rem 0`;
      if (logoImg) logoImg.style.height = `${88 - 56 * p}px`;
      navLinks.forEach(a => { a.style.fontSize = `${0.95 - 0.15 * p}rem`; });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div className="grain" aria-hidden="true" />

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
          {/* ── Layered animated background ── */}
          <div className="hero-bg" aria-hidden="true">
            <GlobeCanvas />
            <div className="hero-vignette" />
          </div>

          <div className="container hero-content">
            <span className="hero-badge">B2B Marketplace</span>
            <h1>Liquidate near-expiry crop protection. <span>No waste.</span></h1>
            <p className="hero-tagline">
              Paulze connects agrochemical manufacturers with vetted distributors to move soon-to-expire inventory at fair prices — so nothing goes to waste.
            </p>
          </div>
        </section>

        {/* Section glow divider */}
        <div className="relative h-px w-full overflow-visible">
          <div className="absolute left-1/2 top-1/2 h-[2px] w-[60%] -translate-x-1/2 -translate-y-1/2 bg-[linear-gradient(90deg,transparent,rgba(0,229,160,0.3),rgba(0,229,160,0.5),rgba(0,229,160,0.3),transparent)] blur-[1px]" />
          <div className="absolute left-1/2 top-1/2 h-[40px] w-[50%] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(0,229,160,0.08),transparent_70%)] blur-xl" />
        </div>

        <section id="problem" className="problem">
          <div className="container">
            <p className="section-label reveal">The Problem</p>
            <h2 className="section-title reveal">Billions in chemicals expire every year</h2>
            <p className="section-subtitle reveal">
              Unsold crop protection products often sit until they pass expiry — destroying value for manufacturers and leaving distributors without access to discounted supply.
            </p>
            <div className="problem-stat-inline reveal">
              <span className="problem-stat">$4B+</span>
            </div>
            <p className="problem-stat-desc reveal">
              Estimated value of crop protection chemicals that expire or are written off annually.
            </p>
            <div className="problem-cards">
              <div className="problem-card reveal" style={{ '--d': '0s' } as React.CSSProperties}>
                <h3>Manufacturers lose margin</h3>
                <p>Excess inventory and write-offs hurt profitability and complicate planning.</p>
              </div>
              <div className="problem-card reveal" style={{ '--d': '0.1s' } as React.CSSProperties}>
                <h3>Distributors miss deals</h3>
                <p>No trusted channel to source near-expiry product at discount for short-cycle use.</p>
              </div>
              <div className="problem-card reveal" style={{ '--d': '0.2s' } as React.CSSProperties}>
                <h3>Environment pays the cost</h3>
                <p>Unused chemicals add to waste and disposal burden when they could still be used safely.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section glow divider */}
        <div className="relative h-px w-full overflow-visible">
          <div className="absolute left-1/2 top-1/2 h-[2px] w-[50%] -translate-x-1/2 -translate-y-1/2 bg-[linear-gradient(90deg,transparent,rgba(0,229,160,0.25),rgba(0,229,160,0.4),rgba(0,229,160,0.25),transparent)] blur-[1px]" />
          <div className="absolute left-1/2 top-1/2 h-[30px] w-[40%] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(0,229,160,0.06),transparent_70%)] blur-xl" />
        </div>

        <section id="how-it-works" className="relative overflow-hidden">
          {/* Subtle ambient glow */}
          <div className="pointer-events-none absolute -right-[20%] top-[10%] h-[60%] w-[40%] rounded-full bg-[radial-gradient(circle,rgba(0,229,160,0.05)_0%,transparent_70%)] blur-3xl" aria-hidden="true" />
          <div className="container">
            <p className="section-label reveal">How It Works</p>
            <h2 className="section-title reveal">Three steps to liquidate and buy</h2>
            <p className="section-subtitle reveal">
              We broker the deal so manufacturers recover value and distributors get vetted product at a discount.
            </p>
            <div className="steps">
              <div className="step reveal" style={{ '--d': '0s' } as React.CSSProperties}>
                <div className="step-num">Step 1</div>
                <span className="step-arrow" aria-hidden="true">→</span>
                <h3>Manufacturers list SKUs</h3>
                <p>Submit near-expiry crop protection SKUs and volumes. We handle pricing and matching.</p>
              </div>
              <div className="step reveal" style={{ '--d': '0.12s' } as React.CSSProperties}>
                <div className="step-num">Step 2</div>
                <span className="step-arrow" aria-hidden="true">→</span>
                <h3>Paulze brokers the deal</h3>
                <p>We connect you with vetted distributors and facilitate terms, documentation, and logistics.</p>
              </div>
              <div className="step reveal" style={{ '--d': '0.24s' } as React.CSSProperties}>
                <div className="step-num">Step 3</div>
                <h3>Distributors buy at discount</h3>
                <p>Distributors purchase at a discount for short-cycle use — product moves, everyone wins.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section glow divider */}
        <div className="relative h-px w-full overflow-visible">
          <div className="absolute left-1/2 top-1/2 h-[2px] w-[50%] -translate-x-1/2 -translate-y-1/2 bg-[linear-gradient(90deg,transparent,rgba(0,229,160,0.25),rgba(0,229,160,0.4),rgba(0,229,160,0.25),transparent)] blur-[1px]" />
          <div className="absolute left-1/2 top-1/2 h-[30px] w-[40%] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(0,229,160,0.06),transparent_70%)] blur-xl" />
        </div>

        <section id="benefits" className="benefits">
          <div className="container">
            <p className="section-label reveal">Key Benefits</p>
            <h2 className="section-title reveal">Built for both sides of the market</h2>
            <p className="section-subtitle reveal">
              Manufacturers recover value; distributors get reliable supply at better prices.
            </p>
            <div className="benefits-grid">
              <div className="benefits-column reveal" style={{ '--d': '0s' } as React.CSSProperties}>
                <h3>For Manufacturers</h3>
                <ul>
                  <li>Liquidate near-expiry inventory without damaging brand or channel</li>
                  <li>Recover value instead of writing off product</li>
                  <li>Vetted distributors only — no grey market risk</li>
                  <li>Simple process: list SKUs, we handle matching and brokering</li>
                </ul>
              </div>
              <div className="benefits-column reveal" style={{ '--d': '0.15s' } as React.CSSProperties}>
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

        <section id="co-founders" className="co-founders relative overflow-hidden">
          {/* Subtle ambient glow */}
          <div className="pointer-events-none absolute left-[10%] top-[20%] h-[50%] w-[35%] rounded-full bg-[radial-gradient(circle,rgba(0,229,160,0.04)_0%,transparent_65%)] blur-3xl" aria-hidden="true" />
          <div className="container">
            <p className="section-label">The Team</p>
            <h2 className="section-title">Co-founders</h2>
            <p className="section-subtitle">
              The team building the marketplace for near-expiry crop protection.
            </p>
            <div className="founders-grid">
              <article className="founder-card reveal" style={{ '--d': '0s' } as React.CSSProperties}>
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
              <article className="founder-card reveal" style={{ '--d': '0.12s' } as React.CSSProperties}>
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
              <article className="founder-card reveal" style={{ '--d': '0.24s' } as React.CSSProperties}>
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

        <section id="contact" className="contact-section">
          <div className="container">
            <div className="contact-card reveal">
              <div className="contact-card-text">
                <p className="section-label">Contact</p>
                <h2 className="contact-headline">Built for manufacturers, distributors, and strategic partnerships.</h2>
                <p className="contact-body">
                  Paulze is recovering billions in wasted agrochemical value — connecting the supply chain so nothing expires unsold. Reach out to discuss investment, partnership, or market expansion.
                </p>
              </div>
              <div className="contact-card-cta">
                <a href="mailto:investors@paulze.com" className="contact-cta">Get in Touch</a>
              </div>
            </div>
          </div>
        </section>

        <footer>
          <div className="container footer-inner">
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
        </footer>

      </main>
    </>
  );
}
