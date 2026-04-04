import { type FormEvent, useEffect, useRef, useState } from 'react';
import LinkedInIcon from './assets/linkedin.svg?react';
import paulzeLogo from './assets/logo_no_black.svg';
import mattPhoto from './assets/matthew-fallon.png';
import meyerPhoto from './assets/meyer-eskin.png';
import neoPhoto from './assets/neo-matsuyama.png';
import { CONTINENTS, type Polygon } from './continent-data';
import './paulze.css';

// ─── Globe Canvas ─────────────────────────────────────────────────────────────

const CITY_LIGHTS: [number, number][] = [
  // North America
  [40.71, -74.01], [34.05, -118.24], [41.88, -87.63], [29.76, -95.37],
  [33.45, -112.07], [47.61, -122.33], [32.78, -96.80],
  [38.90, -77.04], [42.36, -71.06], [43.65, -79.38], [45.50, -73.57],
  // South America
  [-23.55, -46.63], [-34.60, -58.38], [-12.04, -77.03], [4.71, -74.07],
  [-33.46, -70.65], [-15.78, -47.93],
  // Europe
  [51.51, -0.13], [48.85, 2.35], [52.52, 13.41], [40.42, -3.70],
  [41.90, 12.50], [59.33, 18.07], [55.75, 37.62],
  // Middle East
  [41.01, 28.98], [35.69, 51.39],
  // South Asia
  [19.08, 72.88], [28.64, 77.22],
  // East Asia
  [39.91, 116.39], [31.23, 121.47],
  [37.57, 126.98],
  // Southeast Asia
  [13.75, 100.52],
  // Africa
  [30.06, 31.25], [-26.20, 28.04], [6.38, 3.52], [-1.29, 36.82],
  // Australia
  [-33.87, 151.21], [-37.81, 144.96],
];

const CANVAS_SIZE = 900;
const DEG2RAD = Math.PI / 180;

/**
 * Draw a continent polygon. Hidden vertices are projected onto the sphere
 * edge so the polygon naturally hugs the silhouette — no arcs, no chords,
 * no direction ambiguity, no edge glitches.
 */
/** Rotate a 3D point around the X-axis by angle a (for vertical tilt). */
function rotX(x: number, y: number, z: number, cosA: number, sinA: number) {
  return { x, y: y * cosA - z * sinA, z: y * sinA + z * cosA };
}

function drawContinentPolygon(
  ctx: CanvasRenderingContext2D,
  polygon: Polygon,
  cx: number,
  cy: number,
  R: number,
  lonOffset: number,
  latCos: number,
  latSin: number,
) {
  const Z_CLIP = 0.12; // fade-out zone slightly inside the silhouette

  let anyVisible = false;
  const projected = polygon.map(([latDeg, lonDeg]) => {
    const lat = latDeg * DEG2RAD;
    const lon = lonDeg * DEG2RAD + lonOffset;
    const x0 = Math.cos(lat) * Math.sin(lon);
    const y0 = -Math.sin(lat);
    const z0 = Math.cos(lat) * Math.cos(lon);
    const { x, y, z } = rotX(x0, y0, z0, latCos, latSin);

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
    let latOffset = 0;
    let rotSpeed = 0.0018; // base auto-rotation speed (rad/frame)
    let dragVelX = 0;      // velocity from mouse drag (horizontal)
    let dragVelY = 0;      // velocity from mouse drag (vertical)
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    const MAX_LAT = Math.PI * 0.45; // clamp vertical tilt to ~81°

    // ── Mouse interaction ──────────────────────────────────────────────
    function onMouseDown(e: MouseEvent) {
      isDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      dragVelX = 0;
      dragVelY = 0;
    }
    function onMouseMove(e: MouseEvent) {
      if (!isDragging) return;
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;
      dragVelX = dx * 0.005;    // map px to radians
      dragVelY = -dy * 0.005;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    }
    function onMouseUp() {
      isDragging = false;
      // dragVelX/Y carry momentum, decay each frame
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
        latOffset += dragVelY;
      } else {
        // Decay drag velocity toward zero, blend back to auto-spin
        dragVelX *= 0.95;
        dragVelY *= 0.95;
        lonOffset += rotSpeed + dragVelX;
        latOffset += dragVelY;
      }
      // Clamp vertical tilt
      latOffset = Math.max(-MAX_LAT, Math.min(MAX_LAT, latOffset));

      // Pre-compute lat tilt trig (used by all projection)
      const latCos = Math.cos(latOffset);
      const latSin = Math.sin(latOffset);

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
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = '#00E5A0';
      ctx.lineWidth = 0.7;

      for (let latDeg = -60; latDeg <= 60; latDeg += 30) {
        const lat = latDeg * DEG2RAD;
        ctx.beginPath();
        let penDown = false;
        for (let i = 0; i <= STEPS; i++) {
          const lon = (i / STEPS) * Math.PI * 2 + lonOffset;
          const x0 = Math.cos(lat) * Math.sin(lon);
          const y0 = -Math.sin(lat);
          const z0 = Math.cos(lat) * Math.cos(lon);
          const p = rotX(x0, y0, z0, latCos, latSin);
          if (p.z < 0) { penDown = false; continue; }
          const sx = cx + p.x * R;
          const sy = cy + p.y * R;
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
          const x0 = Math.cos(lat) * Math.sin(lonBase);
          const y0 = -Math.sin(lat);
          const z0 = Math.cos(lat) * Math.cos(lonBase);
          const p = rotX(x0, y0, z0, latCos, latSin);
          if (p.z < 0) { penDown = false; continue; }
          const sx = cx + p.x * R;
          const sy = cy + p.y * R;
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
        drawContinentPolygon(ctx, poly, cx, cy, R, lonOffset, latCos, latSin);
      }

      // Continent edges — thin bright stroke for definition
      ctx.strokeStyle = 'rgba(0, 229, 160, 0.14)';
      ctx.lineWidth = 0.8;
      for (const poly of CONTINENTS) {
        drawContinentPolygon(ctx, poly, cx, cy, R, lonOffset, latCos, latSin);
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
        drawContinentPolygon(ctx, poly, cx, cy, R, lonOffset, latCos, latSin);
      }

      // ── City lights ─────────────────────────────────────────────────────
      for (const [latDeg, lonDeg] of CITY_LIGHTS) {
        const lat = latDeg * DEG2RAD;
        const lon = lonDeg * DEG2RAD;
        const x0 = Math.cos(lat) * Math.sin(lon + lonOffset);
        const y0 = -Math.sin(lat);
        const z0 = Math.cos(lat) * Math.cos(lon + lonOffset);
        const cp = rotX(x0, y0, z0, latCos, latSin);
        if (cp.z < 0.05) continue;

        const sx = cx + cp.x * R;
        const sy = cy + cp.y * R;
        const alpha = cp.z * 0.7 + 0.2;
        const dotR = (cp.z * 1.8 + 0.6) * (R / 400);

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

// ─── 3D Tilt Effect ──────────────────────────────────────────────────────────

function useTiltCards() {
  useEffect(() => {
    const cards = document.querySelectorAll<HTMLElement>('.tilt-card');

    function onMove(this: HTMLElement, e: MouseEvent) {
      const rect = this.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;   // -0.5 to 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      this.style.transform = `perspective(800px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
      this.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
      this.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
    }
    function onLeave(this: HTMLElement) {
      this.style.transform = '';
    }

    cards.forEach(card => {
      card.addEventListener('mousemove', onMove);
      card.addEventListener('mouseleave', onLeave);
    });
    return () => {
      cards.forEach(card => {
        card.removeEventListener('mousemove', onMove);
        card.removeEventListener('mouseleave', onLeave);
      });
    };
  }, []);
}

// ─── Animated Counter ────────────────────────────────────────────────────────

function useAnimatedCounter(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();

        const duration = 3000;
        const target = 4_000_000_000;
        const start = performance.now();

        function format(n: number): string {
          if (n >= 1_000_000_000) {
            const b = Math.min(n / 1_000_000_000, 3.9);
            return `$${b.toFixed(1)}B+`;
          }
          if (n >= 1_000_000) return `$${Math.round(n / 1_000_000)}M+`;
          if (n >= 1_000) return `$${Math.round(n / 1_000)}K+`;
          return `$${n}`;
        }

        function tick(now: number) {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          // Ease-out cubic
          const eased = 1 - Math.pow(1 - progress, 3);
          const value = Math.round(eased * target);
          el!.textContent = eased > 0.99 ? '$4B+' : format(value);
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const STEPS = [
  { num: 'Step 1', title: 'Manufacturers list SKUs', desc: 'Submit near-expiry crop protection SKUs and volumes. We handle pricing and matching.' },
  { num: 'Step 2', title: 'Paulze brokers the deal', desc: 'We connect you with vetted distributors and facilitate terms, documentation, and logistics.' },
  { num: 'Step 3', title: 'Distributors buy at discount', desc: 'Distributors purchase at a discount for short-cycle use — product moves, everyone wins.' },
];

export default function Paulze() {
  const statRef = useRef<HTMLSpanElement>(null);
  const [activeSection, setActiveSection] = useState('');
  const [activeStep, setActiveStep] = useState(-1);
  const [stepDirection, setStepDirection] = useState<'down' | 'up'>('down');
  const prevStepRef = useRef(-1);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [pageProgress, setPageProgress] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const HERO_PHRASES = ['No waste.', 'No write-offs.', 'No grey market.'];
  const [typedText, setTypedText] = useState('');

  useEffect(() => {
    let phraseIdx = 0;
    let charIdx = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;

    function tick() {
      const phrase = HERO_PHRASES[phraseIdx];
      if (!deleting) {
        charIdx++;
        setTypedText(phrase.slice(0, charIdx));
        if (charIdx === phrase.length) {
          // Pause at full phrase, then start deleting
          timer = setTimeout(() => { deleting = true; tick(); }, 2000);
          return;
        }
        timer = setTimeout(tick, 80);
      } else {
        charIdx--;
        setTypedText(phrase.slice(0, charIdx));
        if (charIdx === 0) {
          deleting = false;
          phraseIdx = (phraseIdx + 1) % HERO_PHRASES.length;
          timer = setTimeout(tick, 400);
          return;
        }
        timer = setTimeout(tick, 40);
      }
    }

    // Start after initial entrance animation
    timer = setTimeout(tick, 1500);
    return () => clearTimeout(timer);
  }, []);

  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'success' | 'error'>('idle');

  function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailStatus('error');
      return;
    }
    // For now, open mailto as a fallback. Replace with API call when backend is ready.
    window.location.href = `mailto:investors@paulze.com?subject=Interest from ${encodeURIComponent(email)}&body=Contact me at ${encodeURIComponent(email)}`;
    setEmailStatus('success');
    setEmail('');
    setTimeout(() => setEmailStatus('idle'), 4000);
  }

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  useAnimatedCounter(statRef);
  useTiltCards();

  // Cursor-following glow on CTA buttons
  useEffect(() => {
    const buttons = document.querySelectorAll<HTMLElement>('.glow-btn');
    function onMove(this: HTMLElement, e: MouseEvent) {
      const rect = this.getBoundingClientRect();
      this.style.setProperty('--glow-x', `${e.clientX - rect.left}px`);
      this.style.setProperty('--glow-y', `${e.clientY - rect.top}px`);
    }
    buttons.forEach(btn => btn.addEventListener('mousemove', onMove));
    return () => buttons.forEach(btn => btn.removeEventListener('mousemove', onMove));
  }, []);

  useEffect(() => {
    const header = document.getElementById('header') as HTMLElement;
    const globe = document.querySelector<HTMLElement>('.globe-canvas');
    const glows = document.querySelectorAll<HTMLElement>('.hero-glow');

    function onScroll() {
      const sy = window.scrollY;
      if (sy > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? sy / docHeight : 0;
      if (progressBarRef.current) {
        progressBarRef.current.style.transform = `scaleX(${progress})`;
      }

      // Parallax — only apply while hero is in view
      if (sy < window.innerHeight * 1.5) {
        if (globe) globe.style.transform = `translate(-50%, -43%) translateY(${sy * 0.12}px)`;
        glows.forEach(g => { g.style.transform = `translateY(${sy * 0.06}px)`; });
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll('.reveal, .reveal-slide');
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Step timeline observer — light up dots/line as steps scroll into view
  useEffect(() => {
    const stepEls = document.querySelectorAll<HTMLElement>('.hiw-step');
    const visibleSteps = new Set<number>();
    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          const idx = Number(e.target.getAttribute('data-step'));
          if (e.isIntersecting) visibleSteps.add(idx);
          else visibleSteps.delete(idx);
        }
        const next = visibleSteps.size > 0 ? Math.max(...visibleSteps) : -1;
        if (next < prevStepRef.current) setStepDirection('up');
        else if (next > prevStepRef.current) setStepDirection('down');
        prevStepRef.current = next;
        setActiveStep(next);
      },
      { threshold: 0.4 },
    );
    stepEls.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Scrollspy for floating nav
  useEffect(() => {
    const ids = ['problem', 'how-it-works', 'benefits', 'co-founders', 'contact'];
    const visibleSections = new Set<string>();
    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) {
            visibleSections.add(e.target.id);
          } else {
            visibleSections.delete(e.target.id);
          }
        }
        // Pick the first visible section in document order, or clear if none visible
        const current = ids.find(id => visibleSections.has(id));
        setActiveSection(current ?? '');
      },
      { threshold: 0.3 },
    );
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);


  return (
    <>
      <div className="grain" aria-hidden="true" />
      <div ref={progressBarRef} className="scroll-progress-bar" style={{ transform: 'scaleX(0)' }} aria-hidden="true" />

      {/* Floating scrollspy nav */}
      <nav className="scroll-nav" aria-label="Page sections">
        {[
          { id: 'problem', label: 'Problem' },
          { id: 'how-it-works', label: 'How It Works' },
          { id: 'benefits', label: 'Benefits' },
          { id: 'co-founders', label: 'Team' },
          { id: 'contact', label: 'Contact' },
        ].map(s => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={`scroll-nav-dot ${activeSection === s.id ? 'active' : ''}`}
            title={s.label}
          >
            <span className="scroll-nav-label">{s.label}</span>
          </a>
        ))}
      </nav>

      <header id="header" className="floating-header">
        <div className="floating-nav-pill">
          <a href="#" className="logo-link" onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            <img src={paulzeLogo} alt="Paulze" className="logo-img" />
          </a>
          <nav className="pill-nav">
            <ul className="nav-links">
              <li><a href="#problem" className={activeSection === 'problem' ? 'active' : ''}>The Problem</a></li>
              <li><a href="#how-it-works" className={activeSection === 'how-it-works' ? 'active' : ''}>How It Works</a></li>
              <li><a href="#benefits" className={activeSection === 'benefits' ? 'active' : ''}>Benefits</a></li>
              <li><a href="#co-founders" className={activeSection === 'co-founders' ? 'active' : ''}>Co-founders</a></li>
            </ul>
          </nav>
          <a href="#contact" className="nav-cta nav-cta-desktop">Contact</a>
          <button
            className={`hamburger-btn ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <span /><span /><span />
          </button>
        </div>
      </header>

      {/* Mobile menu overlay */}
      <div className={`mobile-overlay ${menuOpen ? 'open' : ''}`}>
        <nav className="mobile-overlay-nav">
          {[
            { href: '#problem', label: 'The Problem' },
            { href: '#how-it-works', label: 'How It Works' },
            { href: '#benefits', label: 'Benefits' },
            { href: '#co-founders', label: 'Co-founders' },
            { href: '#contact', label: 'Contact' },
          ].map((link, i) => (
            <a
              key={link.href}
              href={link.href}
              className="mobile-overlay-link"
              style={{ transitionDelay: menuOpen ? `${0.05 + i * 0.06}s` : '0s' }}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>

      <main>

        <section className="hero">
          {/* ── Layered animated background ── */}
          <div className="hero-bg" aria-hidden="true">
            <div className="hero-glow hero-glow-a" />
            <div className="hero-glow hero-glow-b" />
            <div className="hero-glow hero-glow-c" />
            <GlobeCanvas />
            <div className="hero-vignette" />
          </div>

          <div className="container hero-content">
            <span className="hero-badge hero-enter hero-enter-badge">B2B Marketplace</span>
            <h1 className="hero-enter hero-enter-h1">Liquidate near-expiry crop protection.<br /><span className="no-wrap typewriter">{typedText}<span className="typewriter-cursor" aria-hidden="true">|</span></span></h1>
            <p className="hero-tagline hero-enter hero-enter-tagline">
              Paulze connects agrochemical manufacturers with vetted distributors to move soon-to-expire inventory at fair prices — so nothing goes to waste.
            </p>
            <a href="#contact" className="hero-cta glow-btn hero-enter hero-enter-cta">Get in Touch</a>
          </div>
        </section>

        <div className="section-divider" aria-hidden="true">
          <div className="section-divider-line" />
          <div className="section-divider-glow" />
        </div>

        <section id="problem" className="problem dot-grid-bg">
          <div className="container">
            <p className="section-label reveal">The Problem</p>
            <h2 className="section-title reveal">Billions in chemicals expire every year</h2>
            <p className="section-subtitle reveal">
              Unsold crop protection products often sit until they pass expiry — destroying value for manufacturers and leaving distributors without access to discounted supply.
            </p>
            <div className="bento-grid">
              <div className="bento-card bento-hero glow-border tilt-card reveal" style={{ '--d': '0s' } as React.CSSProperties}>
                <div className="bento-hero-stat">
                  <span className="problem-stat" ref={statRef}>$0B+</span>
                  <p className="bento-hero-label">wasted annually</p>
                </div>
                <p className="bento-hero-desc">
                  Estimated value of crop protection chemicals that expire or are written off each year across the global supply chain.
                </p>
              </div>
              <div className="bento-card bento-small glow-border tilt-card reveal-slide" style={{ '--d': '0.1s' } as React.CSSProperties}>
                <div className="bento-icon">
                  <svg className="bento-svg-icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 8 12 16 18 10 28 24" />
                    <line x1="28" y1="8" x2="28" y2="24" />
                  </svg>
                </div>
                <h3>Manufacturers lose margin</h3>
                <p>Excess inventory and write-offs hurt profitability and complicate planning.</p>
              </div>
              <div className="bento-card bento-small glow-border tilt-card reveal-slide" style={{ '--d': '0.2s' } as React.CSSProperties}>
                <div className="bento-icon">
                  <svg className="bento-svg-icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="14" cy="14" r="9" />
                    <line x1="21" y1="21" x2="28" y2="28" />
                  </svg>
                </div>
                <h3>Distributors miss deals</h3>
                <p>No trusted channel to source near-expiry product at discount for short-cycle use.</p>
              </div>
              <div className="bento-card bento-wide glow-border tilt-card reveal" style={{ '--d': '0.3s' } as React.CSSProperties}>
                <div className="bento-icon">
                  <svg className="bento-svg-icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="16" cy="16" r="12" />
                    <path d="M4 16 Q10 10 16 16 Q22 22 28 16" />
                    <line x1="16" y1="4" x2="16" y2="28" />
                  </svg>
                </div>
                <h3>Environment pays the cost</h3>
                <p>Unused chemicals add to waste and disposal burden when they could still be used safely. The environmental impact compounds annually as disposal capacity shrinks.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="section-divider" aria-hidden="true">
          <div className="section-divider-line" />
          <div className="section-divider-glow" />
        </div>

        {/* ── How It Works ── */}
        <section id="how-it-works" className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-[20%] top-[10%] h-[60%] w-[40%] rounded-full bg-[radial-gradient(circle,rgba(0,229,160,0.05)_0%,transparent_70%)] blur-3xl" aria-hidden="true" />
          <div className="container py-24">
            <p className="section-label reveal">How It Works</p>
            <h2 className="section-title reveal">Three steps to liquidate and buy</h2>
            <p className="section-subtitle reveal">
              We broker the deal so manufacturers recover value and distributors get vetted product at a discount.
            </p>

            <div className="hiw-timeline">
              {/* Track background */}
              <div className="hiw-track" />
              {/* Active fill */}
              <div className="hiw-track-fill" style={{
                height: activeStep >= 0 ? `${((activeStep + 1) / STEPS.length) * 100}%` : '0%',
                transitionDuration: stepDirection === 'down' ? '0.6s' : '0.2s',
              }} />

              {STEPS.map((step, i) => (
                <div
                  key={i}
                  data-step={i}
                  className={`hiw-step ${activeStep >= i ? 'step-lit' : ''}`}
                  style={{ '--d': `${i * 0.12}s` } as React.CSSProperties}
                >
                  {/* Dot */}
                  <div className={`hiw-dot ${activeStep >= i ? 'hiw-dot-active' : ''}`} />
                  <div className="hiw-step-content">
                    <div className="step-num">{step.num}</div>
                    <h3>{step.title}</h3>
                    <p>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="section-divider" aria-hidden="true">
          <div className="section-divider-line" />
          <div className="section-divider-glow" />
        </div>

        <section id="benefits" className="benefits dot-grid-bg">
          <div className="container">
            <p className="section-label reveal">Key Benefits</p>
            <h2 className="section-title reveal">Built for both sides of the market</h2>
            <p className="section-subtitle reveal">
              Manufacturers recover value; distributors get reliable supply at better prices.
            </p>
            <div className="benefits-grid">
              <div className="benefits-column glow-border reveal" style={{ '--d': '0s' } as React.CSSProperties}>
                <h3>For Manufacturers</h3>
                <ul>
                  <li>Liquidate near-expiry inventory without damaging brand or channel</li>
                  <li>Recover value instead of writing off product</li>
                  <li>Vetted distributors only — no grey market risk</li>
                  <li>Simple process: list SKUs, we handle matching and brokering</li>
                </ul>
              </div>
              <div className="benefits-column glow-border reveal" style={{ '--d': '0.15s' } as React.CSSProperties}>
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
              <article className="founder-card glow-border tilt-card reveal" style={{ '--d': '0s' } as React.CSSProperties}>
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
              <article className="founder-card glow-border tilt-card reveal" style={{ '--d': '0.12s' } as React.CSSProperties}>
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
              <article className="founder-card glow-border tilt-card reveal" style={{ '--d': '0.24s' } as React.CSSProperties}>
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
            <div className="contact-card glow-border reveal">
              <div className="contact-card-text">
                <p className="section-label">Contact</p>
                <h2 className="contact-headline">Built for manufacturers, distributors, and strategic partnerships.</h2>
                <p className="contact-body">
                  Paulze is recovering billions in wasted agrochemical value — connecting the supply chain so nothing expires unsold. Reach out to discuss investment, partnership, or market expansion.
                </p>
              </div>
              <div className="contact-form-wrap">
                <form className="contact-form" onSubmit={handleEmailSubmit}>
                  <div className="contact-input-group">
                    <input
                      type="email"
                      className={`contact-input ${emailStatus === 'error' ? 'contact-input-error' : ''}`}
                      placeholder="your@email.com"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setEmailStatus('idle'); }}
                      required
                    />
                    <button type="submit" className="contact-submit glow-btn">
                      Get in Touch
                    </button>
                  </div>
                  {emailStatus === 'success' && (
                    <p className="contact-feedback contact-feedback-success">Opening email — we'll be in touch!</p>
                  )}
                  {emailStatus === 'error' && (
                    <p className="contact-feedback contact-feedback-error">Please enter a valid email address.</p>
                  )}
                </form>
                <p className="contact-fine-print">Or email us directly at <a href="mailto:investors@paulze.com">investors@paulze.com</a></p>
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
