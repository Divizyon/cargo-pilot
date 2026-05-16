import React, { useState, useEffect, useRef, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ContainerScroll } from '@/components/ui/container-scroll-animation';
import { CobeGlobe } from '@/components/ui/cobe-globe';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  Share2,
  Truck,
  Package,
  CheckCircle2,
  Layers,
  Zap,
  FileText,
  Users,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

// ─── Navbar ────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: 'Özellikler', href: '#features' },
  { label: 'Nasıl Çalışır', href: '#how-it-works' },
  { label: 'Fiyatlandırma', href: '#pricing' },
];

// macOS dock magnification — individual nav link
function DockNavLink({
  href,
  label,
  mouseX,
}: {
  href: string;
  label: string;
  mouseX: MotionValue<number>;
}) {
  const ref = useRef<HTMLAnchorElement>(null);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const scaleRaw = useTransform(distance, [-80, 0, 80], [1, 1.28, 1]);
  const scale = useSpring(scaleRaw, { mass: 0.1, stiffness: 180, damping: 13 });

  return (
    <motion.a
      ref={ref}
      href={href}
      style={{ scale }}
      className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors duration-150 inline-block origin-bottom"
    >
      {label}
    </motion.a>
  );
}

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const mouseX = useMotionValue(Infinity);
  const navLinksX = useMotionValue(-65);

  useEffect(() => {
    const onScroll = () => {
      const progress = Math.min(window.scrollY / 280, 1);
      if (navRef.current) {
        navRef.current.style.maxWidth = `${896 + progress * (1280 - 896)}px`;
      }
      // same progress drives x: -40 → 0
      navLinksX.set(-65 * (1 - progress));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [navLinksX]);

  return (
    <>
      {/* Floating dock wrapper */}
      <div className="fixed top-4 inset-x-0 z-50 flex justify-center px-4 sm:px-6">
        <nav
          ref={navRef}
          className="w-full bg-background/90 backdrop-blur-md border border-border rounded-2xl shadow-lg shadow-black/5"
          style={{ maxWidth: 896 }}
        >
          <div className="h-14 px-4 sm:px-5 grid grid-cols-[1fr_auto_1fr] items-center">
            <Link
              to="/"
              className="flex items-center gap-2 shrink-0 transition-opacity hover:opacity-80"
            >
              <img src="/favicon.svg" alt="Cargo Pilot" className="w-7 h-7 shrink-0" />
              <span className="font-bold text-foreground text-sm tracking-tight">Cargo Pilot</span>
            </Link>

            {/* x driven by same scroll progress as maxWidth — always in sync */}
            <motion.div
              style={{ x: navLinksX }}
              className="hidden md:flex items-center gap-1"
              onMouseMove={(e) => mouseX.set(e.clientX)}
              onMouseLeave={() => mouseX.set(Infinity)}
            >
              {NAV_LINKS.map(({ label, href }) => (
                <DockNavLink key={label} href={href} label={label} mouseX={mouseX} />
              ))}
            </motion.div>

            <div className="flex items-center gap-2 justify-end">
              <ThemeToggle />
              <div className="hidden md:flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/auth/login">Giriş Yap</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/auth/register">
                    Ücretsiz Başla <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                  </Link>
                </Button>
              </div>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                aria-label={menuOpen ? 'Menüyü kapat' : 'Menüyü aç'}
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Mobile menu — inside the dock */}
          {menuOpen && (
            <div className="md:hidden border-t border-border px-4 py-3 flex flex-col gap-1">
              {NAV_LINKS.map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  {label}
                </a>
              ))}
              <div className="pt-3 mt-1 border-t border-border flex flex-col gap-2">
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link to="/auth/login" onClick={() => setMenuOpen(false)}>
                    Giriş Yap
                  </Link>
                </Button>
                <Button size="sm" asChild className="w-full">
                  <Link to="/auth/register" onClick={() => setMenuOpen(false)}>
                    Ücretsiz Başla <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </nav>
      </div>
    </>
  );
}

// ─── Scroll Indicator ──────────────────────────────────────────────────────

function ScrollIndicator() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.to(el, {
        opacity: 0,
        y: 12,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top 70%',
          end: 'top 30%',
          scrub: true,
        },
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={ref}
      className="absolute bottom-8 inset-x-0 flex flex-col items-center gap-1.5 pointer-events-none select-none"
    >
      <span className="text-[10px] font-semibold text-muted-foreground tracking-[0.25em] uppercase">
        Scroll
      </span>
      <ChevronDown className="w-4 h-4 text-muted-foreground animate-bounce" />
    </div>
  );
}

// ─── Hero ───────────────────────────────────────────────────────────────────

// Extreme-Point bin-packing algorithm (pure, no React)
interface PlacedBox {
  type: 'A' | 'B';
  dx: number;
  dy: number;
  dz: number;
  x: number;
  y: number;
  z: number;
}

function computePlacements(): PlacedBox[] {
  const CL = 589,
    CW = 235,
    CH = 239;
  type EP = [number, number, number];

  const todo: Array<Pick<PlacedBox, 'type' | 'dx' | 'dy' | 'dz'>> = [];
  for (let i = 0; i < 4; i++) todo.push({ type: 'B', dx: 200, dy: 100, dz: 100 });
  for (let i = 0; i < 10; i++) todo.push({ type: 'A', dx: 60, dy: 60, dz: 60 });

  const placed: PlacedBox[] = [];
  let eps: EP[] = [[0, 0, 0]];

  for (const box of todo) {
    const { dx, dy, dz } = box;
    const valid = eps
      .filter(([x, y, z]) => {
        if (x + dx > CL || y + dy > CW || z + dz > CH) return false;
        if (
          placed.some(
            (b) =>
              x < b.x + b.dx &&
              x + dx > b.x &&
              y < b.y + b.dy &&
              y + dy > b.y &&
              z < b.z + b.dz &&
              z + dz > b.z,
          )
        )
          return false;
        if (z === 0) return true;
        let sup = 0;
        for (const b of placed)
          if (Math.abs(b.z + b.dz - z) < 0.001) {
            const ox = Math.min(x + dx, b.x + b.dx) - Math.max(x, b.x);
            const oy = Math.min(y + dy, b.y + b.dy) - Math.max(y, b.y);
            if (ox > 0 && oy > 0) sup += ox * oy;
          }
        return sup / (dx * dy) >= 0.5;
      })
      .sort((a, b) => a[2] - b[2] || a[0] - b[0] || a[1] - b[1]);

    if (!valid.length) continue;
    const [x, y, z] = valid[0];
    placed.push({ ...box, x, y, z });

    const seen = new Set<string>();
    eps = [
      ...eps.filter((e) => !(e[0] === x && e[1] === y && e[2] === z)),
      [x + dx, y, z] as EP,
      [x, y + dy, z] as EP,
      [x, y, z + dz] as EP,
    ].filter(([ex, ey, ez]) => {
      if (ex < 0 || ey < 0 || ez < 0 || ex >= CL || ey >= CW || ez >= CH) return false;
      if (
        placed.some(
          (b) =>
            b.x <= ex &&
            ex < b.x + b.dx &&
            b.y <= ey &&
            ey < b.y + b.dy &&
            b.z <= ez &&
            ez < b.z + b.dz,
        )
      )
        return false;
      const k = `${ex},${ey},${ez}`;
      return seen.has(k) ? false : (seen.add(k), true);
    });
  }
  return placed;
}

// Pre-compute once at module load — result is stable
const PLACEMENTS = computePlacements();

function CargoGrid() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const CL = 589,
      CW = 235,
      CH = 239;

    // Load order: back → front, bottom → top, left → right
    const loadOrder = PLACEMENTS.slice().sort((a, b) =>
      a.x !== b.x ? a.x - b.x : a.z !== b.z ? a.z - b.z : a.y - b.y,
    );

    // algo (cm) → Three.js scene coords
    const toS = (ax: number, ay: number, az: number) => ({
      x: ax - CL / 2,
      y: az - CH / 2,
      z: CW / 2 - ay,
    });

    const W = el.clientWidth || 480;
    const H = el.clientHeight || 270;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, W / H, 1, 8000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.display = 'block';
    el.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const dl1 = new THREE.DirectionalLight(0xffffff, 0.6);
    dl1.position.set(400, 600, 400);
    scene.add(dl1);
    const dl2 = new THREE.DirectionalLight(0xffffff, 0.3);
    dl2.position.set(-300, 200, -200);
    scene.add(dl2);

    // Container wireframe + translucent fill
    const contGeom = new THREE.BoxGeometry(CL, CH, CW);
    const contEdgeGeom = new THREE.EdgesGeometry(contGeom);
    const contLineMat = new THREE.LineBasicMaterial({ color: 0x888888 });
    const contFillMat = new THREE.MeshBasicMaterial({
      color: 0xcccccc,
      transparent: true,
      opacity: 0.04,
      side: THREE.BackSide,
    });
    scene.add(new THREE.LineSegments(contEdgeGeom, contLineMat));
    scene.add(new THREE.Mesh(contGeom, contFillMat));

    // Floor
    const floorGeom = new THREE.PlaneGeometry(CL, CW);
    const floorMat = new THREE.MeshBasicMaterial({
      color: 0xd0cec4,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const floorMesh = new THREE.Mesh(floorGeom, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -CH / 2 + 0.5;
    scene.add(floorMesh);

    // Shared box geometry — BoxGeometry(dx, dz, dy) per reference HTML
    const geomA = new THREE.BoxGeometry(60, 60, 60);
    const geomB = new THREE.BoxGeometry(200, 100, 100);
    const edgeGeomA = new THREE.EdgesGeometry(geomA);
    const edgeGeomB = new THREE.EdgesGeometry(geomB);
    const matA = new THREE.MeshLambertMaterial({ transparent: true, opacity: 0 });
    const matB = new THREE.MeshLambertMaterial({ transparent: true, opacity: 0 });
    const isDark = () => document.documentElement.classList.contains('dark');
    const edgeMat = new THREE.LineBasicMaterial({ color: isDark() ? 0xffffff : 0x000000 });
    const themeObserver = new MutationObserver(() => {
      edgeMat.color.set(isDark() ? 0xffffff : 0x000000);
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    interface BoxRef {
      mesh: THREE.Mesh;
      edges: THREE.LineSegments;
      tx: number;
      ty: number;
      tz: number;
    }
    const boxRefs: BoxRef[] = [];

    loadOrder.forEach((b) => {
      const geom = b.type === 'A' ? geomA : geomB;
      const eGeom = b.type === 'A' ? edgeGeomA : edgeGeomB;
      const mat = b.type === 'A' ? matA : matB;

      const mesh = new THREE.Mesh(geom, mat);
      const edges = new THREE.LineSegments(eGeom, edgeMat);
      const sc = toS(b.x + b.dx / 2, b.y + b.dy / 2, b.z + b.dz / 2);

      mesh.position.set(sc.x, sc.y, sc.z);
      edges.position.set(sc.x, sc.y, sc.z);
      mesh.visible = false;
      edges.visible = false;

      scene.add(mesh);
      scene.add(edges);
      boxRefs.push({ mesh, edges, tx: sc.x, ty: sc.y, tz: sc.z });
    });

    // Fixed camera position
    const theta = -Math.PI / 4;
    const phi = Math.PI / 5;
    const camRadius = Math.max(CL, 600) * 2.0;
    camera.position.set(
      camRadius * Math.cos(phi) * Math.cos(theta),
      camRadius * Math.sin(phi),
      camRadius * Math.cos(phi) * Math.sin(theta),
    );
    camera.lookAt(0, 0, 0);

    // Animation parameters
    const N = boxRefs.length;
    const ANIM_MS = Math.min(4500, Math.max(2500, 2000 + N * 70));
    const STAGGER = ANIM_MS / N;
    const FLIGHT = Math.max(500, Math.min(900, STAGGER * 1.8));
    const HOLD_MS = 1800;
    const EXIT_MS = 600;
    // Boxes spawn / exit outside the door in scene coords
    const spawnX = CL / 2 + 220;

    type Phase = 'loading' | 'hold' | 'exit';
    let phase: Phase = 'loading';
    let phaseStart = performance.now();

    function easeOut(t: number) {
      return 1 - Math.pow(1 - t, 3);
    }
    function easeIn(t: number) {
      return t * t * t;
    }

    let rafId: number;
    function tick() {
      rafId = requestAnimationFrame(tick);
      const now = performance.now();

      if (phase === 'loading') {
        const elapsed = now - phaseStart;
        let allDone = true;
        boxRefs.forEach((br, i) => {
          const lt = elapsed - i * STAGGER;
          if (lt < 0) {
            br.mesh.visible = false;
            br.edges.visible = false;
            allDone = false;
            return;
          }
          br.mesh.visible = true;
          br.edges.visible = true;
          if (lt >= FLIGHT) {
            br.mesh.position.set(br.tx, br.ty, br.tz);
            br.edges.position.set(br.tx, br.ty, br.tz);
          } else {
            allDone = false;
            const x = spawnX + (br.tx - spawnX) * easeOut(lt / FLIGHT);
            br.mesh.position.set(x, br.ty, br.tz);
            br.edges.position.set(x, br.ty, br.tz);
          }
        });
        if (allDone) {
          phase = 'hold';
          phaseStart = now;
        }
      } else if (phase === 'hold') {
        if (now - phaseStart >= HOLD_MS) {
          phase = 'exit';
          phaseStart = now;
        }
      } else {
        // All boxes exit with identical velocity: shift every box by the same delta.
        // Delta = distance needed to push the furthest-back box out the door.
        const minTx = Math.min(...boxRefs.map((br) => br.tx));
        const exitDelta = spawnX - minTx;
        const t = Math.min(1, (now - phaseStart) / EXIT_MS);
        const e = easeIn(t);
        boxRefs.forEach((br) => {
          const x = br.tx + exitDelta * e;
          br.mesh.position.set(x, br.ty, br.tz);
          br.edges.position.set(x, br.ty, br.tz);
        });
        if (t >= 1) {
          boxRefs.forEach((br) => {
            br.mesh.visible = false;
            br.edges.visible = false;
          });
          phase = 'loading';
          phaseStart = now;
        }
      }

      renderer.render(scene, camera);
    }

    rafId = requestAnimationFrame(tick);

    const ro = new ResizeObserver(() => {
      const nW = el.clientWidth,
        nH = el.clientHeight;
      if (!nW || !nH) return;
      camera.aspect = nW / nH;
      camera.updateProjectionMatrix();
      renderer.setSize(nW, nH);
    });
    ro.observe(el);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      themeObserver.disconnect();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      [contGeom, contEdgeGeom, floorGeom, geomA, geomB, edgeGeomA, edgeGeomB].forEach((g) =>
        g.dispose(),
      );
      [contLineMat, contFillMat, floorMat, matA, matB, edgeMat].forEach((m) => m.dispose());
    };
  }, []);

  return (
    <div className="relative w-full max-w-lg mx-auto aspect-video rounded-2xl border border-border bg-page-background overflow-hidden shadow-sm">
      <div ref={mountRef} className="absolute inset-0" />
      <div className="absolute inset-x-0 top-0 h-10 border-b border-border bg-background/90 backdrop-blur-sm flex items-center px-4 gap-2 pointer-events-none z-10">
        <Truck className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-xs font-medium text-foreground truncate">
          Yükleme Planı — Mercedes Actros 18T
        </span>
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs text-muted-foreground">%94 verimli</span>
        </div>
      </div>
      <div className="absolute bottom-3 right-3 bg-background/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-sm pointer-events-none z-10">
        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
        <span className="text-xs font-medium text-foreground">3D görünüm hazır</span>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative min-h-dvh px-4 sm:px-6 bg-background flex items-center">
      <div className="max-w-7xl mx-auto w-full pt-24">
        <div className="grid lg:grid-cols-2 gap-10 sm:gap-12 lg:gap-16 items-center">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] tracking-tight mb-5 sm:mb-6">
              Her yükü planla. <span className="text-muted-foreground">Mükemmel şekilde.</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-7 sm:mb-8 max-w-lg">
              Cargo Pilot, araçlarınız için saniyeler içinde en uygun 3D yükleme planlarını
              oluşturur — alan kaybını azaltır, ihlalleri önler ve ekibinize paylaşılabilir görsel
              raporlar sunar.
            </p>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <Button size="lg" asChild>
                <Link to="/auth/register">
                  Ücretsiz Başla <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/auth/register">Demo Gör</Link>
              </Button>
            </div>
            <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-x-5 gap-y-2.5">
              {['Kredi kartı gerekmez', '5 dakikada kurulum', 'İstediğin zaman iptal'].map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">{t}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="w-full">
            <CargoGrid />
          </div>
        </div>
      </div>
      <ScrollIndicator />
    </section>
  );
}

// ─── Container Scroll ───────────────────────────────────────────────────────

function DashboardScrollSection() {
  return (
    <div className="overflow-hidden">
      <ContainerScroll
        titleComponent={
          <div className="mb-4">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-3">
              Platform'a Göz Atın
            </p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground leading-tight">
              Gerçek zamanlı operasyonel
              <br />
              <span className="text-muted-foreground">kontrol paneli</span>
            </h2>
          </div>
        }
      >
        <img
          src="/dashboard-light.png"
          alt="Cargo Pilot Dashboard"
          className="w-full h-full object-cover object-top block dark:hidden"
          draggable={false}
        />
        <img
          src="/dashboard-dark.png"
          alt="Cargo Pilot Dashboard"
          className="w-full h-full object-cover object-top hidden dark:block"
          draggable={false}
        />
      </ContainerScroll>
    </div>
  );
}

// ─── Features ───────────────────────────────────────────────────────────────

interface TiltCardProps {
  children: ReactNode;
  className?: string;
}

function TiltCard({ children, className }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [spot, setSpot] = useState({ x: 50, y: 50, opacity: 0 });

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      const { left, top, width, height } = el.getBoundingClientRect();
      const nx = (e.clientX - left) / width;
      const ny = (e.clientY - top) / height;
      const rx = (0.5 - ny) * 14;
      const ry = (nx - 0.5) * 14;
      setStyle({
        transform: `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.025)`,
        transition: 'transform 0.08s ease-out',
      });
      setSpot({ x: nx * 100, y: ny * 100, opacity: 0.12 });
    });
  }

  function onMouseLeave() {
    cancelAnimationFrame(frameRef.current);
    setStyle({
      transform: 'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)',
      transition: 'transform 0.5s ease-out',
    });
    setSpot((s) => ({ ...s, opacity: 0 }));
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ ...style, transformStyle: 'preserve-3d' }}
      className={cn('relative overflow-hidden rounded-xl', className)}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 rounded-xl transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at ${spot.x}% ${spot.y}%, rgba(255,255,255,${spot.opacity}), transparent 65%)`,
          opacity: spot.opacity > 0 ? 1 : 0,
        }}
      />
      {children}
    </div>
  );
}

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="p-5 sm:p-6 rounded-xl border border-border bg-card hover:border-foreground/20 transition-colors duration-200 h-full">
      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-card-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function Features() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      // Curtain reveal on the section
      gsap.from(el, {
        clipPath: 'inset(6% 0 0 0)',
        y: 48,
        opacity: 0,
        duration: 1.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'restart none none reverse',
        },
      });
      // Cards stagger
      gsap.from('.feature-card', {
        y: 36,
        opacity: 0,
        duration: 0.75,
        stagger: 0.08,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 72%',
          toggleActions: 'restart none none reverse',
        },
      });
    }, el);
    return () => ctx.revert();
  }, []);

  const features = [
    {
      icon: <Layers className="w-5 h-5 text-foreground" />,
      title: '3D Kargo Görselleştirme',
      description:
        'Araçların içine ürünlerin tam olarak nasıl yerleştirileceğini interaktif 3D sahnesiyle katman katman, ürün ürün görün.',
    },
    {
      icon: <Zap className="w-5 h-5 text-foreground" />,
      title: 'Otomatik Optimizasyon',
      description:
        'Motorumuz, ağırlık, denge, kırılganlık, istifleme kuralları ve yükleme yönü için en uygun yerleştirme düzenini hesaplar.',
    },
    {
      icon: <Package className="w-5 h-5 text-foreground" />,
      title: 'Ürün ve Araç Kütüphanesi',
      description:
        'Ürün kataloğunuzu ve araç filonuzu bir kez tanımlayın — kısıtlama şablonlarıyla istediğiniz yükleme planında yeniden kullanın.',
    },
    {
      icon: <FileText className="w-5 h-5 text-foreground" />,
      title: 'PDF ve Excel Raporları',
      description:
        'Sürücüler, depo ekipleri ve uyumluluk belgeleri için PDF veya Excel formatında profesyonel yükleme raporları alın.',
    },
    {
      icon: <Share2 className="w-5 h-5 text-foreground" />,
      title: 'Paylaşılabilir Plan Bağlantıları',
      description:
        'Güvenli bağlantıyla paydaşlarınızla salt okunur 3D plan görünümleri paylaşın — alıcılar için giriş gerekmez.',
    },
    {
      icon: <Users className="w-5 h-5 text-foreground" />,
      title: 'Ekip ve Rol Yönetimi',
      description:
        'Rol tabanlı erişimle ekibinizi davet edin. Operatörler, yöneticiler ve adminler tam olarak ihtiyaç duydukları görünümü alır.',
    },
  ];

  return (
    <section
      ref={sectionRef}
      id="features"
      className="relative py-16 sm:py-20 md:py-24 px-4 sm:px-6 bg-background overflow-hidden"
    >
      {/* Perspective grid background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute inset-x-[-30%] bottom-[-10%] h-[90%]"
          style={{
            backgroundImage: `
              linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
            `,
            backgroundSize: '36px 36px',
            transform: 'perspective(700px) rotateX(72deg)',
            transformOrigin: 'center top',
          }}
        />
        {/* Horizon fade */}
        <div className="absolute inset-x-0 top-0 h-3/4 bg-gradient-to-b from-background via-background/80 to-transparent" />
        {/* Bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto">
        <div className="text-center mb-10 sm:mb-14 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">
            Ekibinizin daha akıllı yüklemesi için gereken her şey
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            İlk taramadan son teslimata kadar — Cargo Pilot yükleme sürecinin her adımını kapsar.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
          {features.map((f) => (
            <div key={f.title} className="feature-card">
              <TiltCard>
                <FeatureCard {...f} />
              </TiltCard>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ───────────────────────────────────────────────────────────

function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark')),
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.from('.how-title', {
        y: 24,
        opacity: 0,
        duration: 0.7,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 82%',
          toggleActions: 'restart none none reverse',
        },
      });
      gsap.from('.how-step', {
        y: 32,
        opacity: 0,
        duration: 0.7,
        stagger: 0.15,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 75%',
          toggleActions: 'restart none none reverse',
        },
      });
    }, el);
    return () => ctx.revert();
  }, []);

  const steps = [
    {
      number: '01',
      title: 'Hesabınızı oluşturun',
      description:
        'Dakikalar içinde ücretsiz hesap açın. Kredi kartı gerekmez, kurulum için teknik bilgi şart değil.',
    },
    {
      number: '02',
      title: "ERP'den veriyi çekin",
      description:
        'SAP, Logo, Netsis veya benzeri ERP sisteminizle entegre olun. Ürün boyutları, ağırlıklar ve sipariş miktarları otomatik olarak aktarılır.',
    },
    {
      number: '03',
      title: 'Yükleme planı oluşturun',
      description:
        'Bir araç seçin, optimizasyon kriterini belirleyin. Motor saniyeler içinde hacim, ağırlık dengesi, kırılganlık ve istifleme kurallarını göz önünde bulundurarak en uygun planı hesaplar.',
    },
    {
      number: '04',
      title: 'İnceleyin, düzenleyin ve paylaşın',
      description:
        'Anında 3D plan alın. Gerekirse yerleşimleri manuel olarak ayarlayın, ardından PDF / Excel olarak dışa aktarın ya da ekibinizle canlı 3D bağlantısı paylaşın.',
    },
  ];

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="relative py-16 sm:py-20 md:py-24 px-4 sm:px-6 bg-page-background overflow-hidden"
    >
      {/* Globe background */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden
      >
        <div className="w-[640px] h-[640px] opacity-30 dark:opacity-20">
          <CobeGlobe
            dark={isDark ? 1 : 0}
            baseColor={isDark ? [0.08, 0.08, 0.14] : [1, 1, 1]}
            markerColor={isDark ? [1, 1, 1] : [0, 0, 0]}
            arcColor={isDark ? [1, 1, 1] : [0, 0, 0]}
            glowColor={isDark ? [1, 1, 1] : [0.1, 0.1, 0.1]}
            mapBrightness={isDark ? 4 : 9}
            speed={0.003}
          />
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto">
        <div className="how-title text-center mb-10 sm:mb-14 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">
            Nasıl Çalışır?
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
            Hesap oluşturmaktan mükemmel, ihlalsiz bir yükleme planına dört adımda ulaşın.
          </p>
        </div>

        <div className="grid sm:grid-cols-4 gap-8 sm:gap-6 lg:gap-8">
          {steps.map(({ number, title, description }, idx) => (
            <div key={number} className="how-step flex sm:block gap-5 sm:gap-0 relative">
              {/* Desktop: horizontal connector to next step */}
              {idx < steps.length - 1 && (
                <div className="hidden sm:block absolute h-px bg-border top-[1.375rem] left-12 -right-[1.5rem] lg:-right-[2rem]" />
              )}
              {/* Mobile: vertical connector */}
              {idx < steps.length - 1 && (
                <div className="sm:hidden absolute left-6 top-12 bottom-0 w-px bg-border -mb-8" />
              )}
              <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center shrink-0 sm:mb-6 relative z-10">
                <span className="text-sm font-bold text-foreground">{number}</span>
              </div>
              <div className="pb-8 sm:pb-0">
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ────────────────────────────────────────────────────────────────

interface PricingCardProps {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  ctaLabel: string;
}

function PricingCard({
  name,
  price,
  period,
  description,
  features,
  highlighted = false,
  ctaLabel,
}: PricingCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-5 sm:p-6 flex flex-col relative bg-card',
        highlighted ? 'border-foreground ring-1 ring-foreground' : 'border-border',
      )}
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-foreground text-background text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
            En Popüler
          </span>
        </div>
      )}
      <div className="mb-5">
        <div className="text-sm font-medium text-muted-foreground mb-2">{name}</div>
        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-2xl sm:text-3xl font-bold text-foreground">{price}</span>
          {period && <span className="text-sm text-muted-foreground">{period}</span>}
        </div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>
      <ul className="space-y-2.5 mb-6 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-foreground" />
            <span className="text-muted-foreground">{f}</span>
          </li>
        ))}
      </ul>
      <Button asChild variant={highlighted ? 'default' : 'outline'} className="w-full">
        <Link to="/auth/register">{ctaLabel}</Link>
      </Button>
    </div>
  );
}

function Pricing() {
  const plans: PricingCardProps[] = [
    {
      name: 'Ücretsiz',
      price: '₺0',
      period: '/ ay',
      description: 'Başlamak için ihtiyacınız olan her şey.',
      features: ['3 yükleme planı / ay', '1 araç', '50 ürün', 'Temel raporlama'],
      ctaLabel: 'Ücretsiz Başla',
    },
    {
      name: 'Starter',
      price: '₺499',
      period: '/ ay',
      description: 'Büyüyen ekipler için güçlü araçlar.',
      features: [
        '30 yükleme planı / ay',
        '5 araç',
        '500 ürün',
        'Excel & PDF export',
        'E-posta desteği',
      ],
      ctaLabel: 'Başla',
    },
    {
      name: 'Pro',
      price: '₺1.299',
      period: '/ ay',
      description: 'Profesyonel operasyonlar için sınırsız güç.',
      highlighted: true,
      features: [
        'Sınırsız yükleme planı',
        'Sınırsız araç',
        'Sınırsız ürün',
        'ERP entegrasyonu',
        'Öncelikli destek',
        'Paylaşım linki',
      ],
      ctaLabel: "Pro'ya Geç",
    },
    {
      name: 'Enterprise',
      price: 'Özel',
      period: '',
      description: 'Kurumsal ihtiyaçlara özel çözüm.',
      features: [
        'Pro özelliklerin tamamı',
        'Özel SLA',
        'Dedicated destek',
        'SSO / SAML',
        'Özel entegrasyonlar',
      ],
      ctaLabel: 'Bize Ulaşın',
    },
  ];

  return (
    <section id="pricing" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10 sm:mb-14 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">
            Basit, şeffaf fiyatlandırma
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
            Ücretsiz başlayın. Filonuz büyüdükçe ölçeklendirin.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6 items-start pt-4">
          {plans.map((p) => (
            <PricingCard key={p.name} {...p} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA Banner ─────────────────────────────────────────────────────────────

function CtaBanner() {
  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 bg-page-background border-t border-border">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">
          Daha akıllı yüklemeye hazır mısınız?
        </h2>
        <p className="text-base sm:text-lg text-muted-foreground mb-7 sm:mb-8">
          Cargo Pilot kullanan lojistik ekiplerine katılın, alan israfını ve yükleme hatalarını
          ortadan kaldırın.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <Button size="lg" asChild className="w-full sm:w-auto">
            <Link to="/auth/register">
              Ücretsiz Başla <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild className="w-full sm:w-auto">
            <Link to="/auth/login">
              Giriş Yap <ChevronRight className="ml-1 w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-border bg-background py-8 sm:py-10 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
        <div className="flex items-center gap-2">
          <img src="/favicon.svg" alt="Cargo Pilot" className="w-6 h-6 shrink-0" />
          <span className="font-semibold text-foreground text-sm">Cargo Pilot</span>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          {[
            { label: 'Gizlilik', href: '#' },
            { label: 'Kullanım Koşulları', href: '#' },
            { label: 'İletişim', href: '#' },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150"
            >
              {label}
            </a>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Cargo Pilot. Tüm hakları saklıdır.
        </span>
      </div>
    </footer>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-background font-sans antialiased">
      <Navbar />
      <main>
        <Hero />
        <DashboardScrollSection />
        <Features />
        <HowItWorks />
        <Pricing />
        <CtaBanner />
      </main>
      <Footer />
    </div>
  );
}
