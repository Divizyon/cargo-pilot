import { useState, useEffect, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  Box,
  Share2,
  Truck,
  Package,
  CheckCircle2,
  Layers,
  Zap,
  FileText,
  Users,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';

// ─── Navbar ────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: 'Özellikler', href: '#features' },
  { label: 'Nasıl Çalışır', href: '#how-it-works' },
  { label: 'Fiyatlandırma', href: '#pricing' },
];

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 inset-x-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4 lg:gap-8">
          <Link
            to="/"
            className="flex items-center gap-2.5 shrink-0 transition-opacity hover:opacity-80"
          >
            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center shrink-0 border border-border">
              <Box className="w-4 h-4 text-foreground" />
            </div>
            <span className="font-bold text-foreground text-base sm:text-lg tracking-tight">
              Cargo Pilot
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6 lg:gap-8 flex-1 justify-center">
            {NAV_LINKS.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
              >
                {label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
            <ThemeToggle />
            <div className="hidden md:flex items-center gap-2 lg:gap-3">
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
      </nav>

      {menuOpen && (
        <div className="fixed top-16 inset-x-0 z-40 bg-background border-b border-border shadow-lg md:hidden">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
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
            <div className="pt-3 mt-2 border-t border-border flex flex-col gap-2">
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
        </div>
      )}
    </>
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
  const CL = 589, CW = 235, CH = 239;
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
        if (placed.some(b =>
          x < b.x+b.dx && x+dx > b.x &&
          y < b.y+b.dy && y+dy > b.y &&
          z < b.z+b.dz && z+dz > b.z,
        )) return false;
        if (z === 0) return true;
        let sup = 0;
        for (const b of placed)
          if (Math.abs(b.z + b.dz - z) < 0.001) {
            const ox = Math.min(x+dx, b.x+b.dx) - Math.max(x, b.x);
            const oy = Math.min(y+dy, b.y+b.dy) - Math.max(y, b.y);
            if (ox > 0 && oy > 0) sup += ox * oy;
          }
        return sup / (dx * dy) >= 0.5;
      })
      .sort((a, b) => a[2]-b[2] || a[0]-b[0] || a[1]-b[1]);

    if (!valid.length) continue;
    const [x, y, z] = valid[0];
    placed.push({ ...box, x, y, z });

    const seen = new Set<string>();
    eps = [
      ...eps.filter(e => !(e[0]===x && e[1]===y && e[2]===z)),
      [x+dx, y, z] as EP,
      [x, y+dy, z] as EP,
      [x, y, z+dz] as EP,
    ].filter(([ex, ey, ez]) => {
      if (ex < 0 || ey < 0 || ez < 0 || ex >= CL || ey >= CW || ez >= CH) return false;
      if (placed.some(b =>
        b.x <= ex && ex < b.x+b.dx &&
        b.y <= ey && ey < b.y+b.dy &&
        b.z <= ez && ez < b.z+b.dz,
      )) return false;
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

    const CL = 589, CW = 235, CH = 239;

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
    const contFillMat = new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.04, side: THREE.BackSide });
    scene.add(new THREE.LineSegments(contEdgeGeom, contLineMat));
    scene.add(new THREE.Mesh(contGeom, contFillMat));

    // Floor
    const floorGeom = new THREE.PlaneGeometry(CL, CW);
    const floorMat = new THREE.MeshBasicMaterial({ color: 0xd0cec4, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
    const floorMesh = new THREE.Mesh(floorGeom, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -CH / 2 + 0.5;
    scene.add(floorMesh);

    // Door face — green plane at algX = CL (scene x = CL/2)
    const doorGeom = new THREE.PlaneGeometry(CW, CH);
    const doorMat = new THREE.MeshBasicMaterial({ color: 0x1D9E75, transparent: true, opacity: 0.12, side: THREE.DoubleSide });
    const doorMesh = new THREE.Mesh(doorGeom, doorMat);
    doorMesh.rotation.y = Math.PI / 2;
    doorMesh.position.x = CL / 2;
    scene.add(doorMesh);

    // Shared box geometry — BoxGeometry(dx, dz, dy) per reference HTML
    const geomA = new THREE.BoxGeometry(60, 60, 60);
    const geomB = new THREE.BoxGeometry(200, 100, 100);
    const edgeGeomA = new THREE.EdgesGeometry(geomA);
    const edgeGeomB = new THREE.EdgesGeometry(geomB);
    const matA = new THREE.MeshLambertMaterial({ color: 0xE24B4A, transparent: true, opacity: 1 });
    const matB = new THREE.MeshLambertMaterial({ color: 0x378ADD, transparent: true, opacity: 1 });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x111111 });

    interface BoxRef { mesh: THREE.Mesh; edges: THREE.LineSegments; tx: number; ty: number; tz: number }
    const boxRefs: BoxRef[] = [];

    loadOrder.forEach(b => {
      const geom = b.type === 'A' ? geomA : geomB;
      const eGeom = b.type === 'A' ? edgeGeomA : edgeGeomB;
      const mat  = b.type === 'A' ? matA : matB;

      const mesh  = new THREE.Mesh(geom, mat);
      const edges = new THREE.LineSegments(eGeom, edgeMat);
      const sc    = toS(b.x + b.dx/2, b.y + b.dy/2, b.z + b.dz/2);

      mesh.position.set(sc.x, sc.y, sc.z);
      edges.position.set(sc.x, sc.y, sc.z);
      mesh.visible  = false;
      edges.visible = false;

      scene.add(mesh);
      scene.add(edges);
      boxRefs.push({ mesh, edges, tx: sc.x, ty: sc.y, tz: sc.z });
    });

    // Fixed camera position
    const theta     = -Math.PI / 4;
    const phi       = Math.PI / 5;
    const camRadius = Math.max(CL, 600) * 2.0;
    camera.position.set(
      camRadius * Math.cos(phi) * Math.cos(theta),
      camRadius * Math.sin(phi),
      camRadius * Math.cos(phi) * Math.sin(theta),
    );
    camera.lookAt(0, 0, 0);

    // Animation parameters
    const N        = boxRefs.length;
    const ANIM_MS  = Math.min(4500, Math.max(2500, 2000 + N * 70));
    const STAGGER  = ANIM_MS / N;
    const FLIGHT   = Math.max(500, Math.min(900, STAGGER * 1.8));
    const HOLD_MS  = 1800;
    const EXIT_MS  = 600;
    // Boxes spawn / exit outside the door in scene coords
    const spawnX   = CL / 2 + 220;

    type Phase = 'loading' | 'hold' | 'exit';
    let phase: Phase = 'loading';
    let phaseStart   = performance.now();

    function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }
    function easeIn(t: number)  { return t * t * t; }

    let rafId: number;
    function tick() {
      rafId = requestAnimationFrame(tick);
      const now = performance.now();

      if (phase === 'loading') {
        const elapsed = now - phaseStart;
        let allDone = true;
        boxRefs.forEach((br, i) => {
          const lt = elapsed - i * STAGGER;
          if (lt < 0) { br.mesh.visible = false; br.edges.visible = false; allDone = false; return; }
          br.mesh.visible  = true;
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
        if (allDone) { phase = 'hold'; phaseStart = now; }

      } else if (phase === 'hold') {
        if (now - phaseStart >= HOLD_MS) { phase = 'exit'; phaseStart = now; }

      } else {
        // All boxes exit with identical velocity: shift every box by the same delta.
        // Delta = distance needed to push the furthest-back box out the door.
        const minTx   = Math.min(...boxRefs.map(br => br.tx));
        const exitDelta = spawnX - minTx;
        const t = Math.min(1, (now - phaseStart) / EXIT_MS);
        const e = easeIn(t);
        boxRefs.forEach(br => {
          const x = br.tx + exitDelta * e;
          br.mesh.position.set(x, br.ty, br.tz);
          br.edges.position.set(x, br.ty, br.tz);
        });
        if (t >= 1) {
          boxRefs.forEach(br => { br.mesh.visible = false; br.edges.visible = false; });
          phase      = 'loading';
          phaseStart = now;
        }
      }

      renderer.render(scene, camera);
    }

    rafId = requestAnimationFrame(tick);

    const ro = new ResizeObserver(() => {
      const nW = el.clientWidth, nH = el.clientHeight;
      if (!nW || !nH) return;
      camera.aspect = nW / nH;
      camera.updateProjectionMatrix();
      renderer.setSize(nW, nH);
    });
    ro.observe(el);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      [contGeom, contEdgeGeom, floorGeom, doorGeom, geomA, geomB, edgeGeomA, edgeGeomB].forEach(g => g.dispose());
      [contLineMat, contFillMat, floorMat, doorMat, matA, matB, edgeMat].forEach(m => m.dispose());
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
    <section className="min-h-dvh px-4 sm:px-6 bg-background flex items-center">
      <div className="max-w-7xl mx-auto w-full pt-16">
        <div className="grid lg:grid-cols-2 gap-10 sm:gap-12 lg:gap-16 items-center">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] tracking-tight mb-5 sm:mb-6">
              Her yükü planla.{' '}
              <span className="text-muted-foreground">Mükemmel şekilde.</span>
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
    </section>
  );
}


// ─── Features ───────────────────────────────────────────────────────────────

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="p-5 sm:p-6 rounded-xl border border-border bg-card hover:border-foreground/20 transition-colors duration-200">
      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-card-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function Features() {
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
    <section id="features" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 bg-background">
      <div className="max-w-7xl mx-auto">
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
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ───────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'ERP\'den veriyi çekin',
      description:
        'SAP, Logo, Netsis veya benzeri ERP sisteminizle entegre olun. Ürün boyutları, ağırlıklar ve sipariş miktarları otomatik olarak aktarılır — manuel giriş gerekmez.',
    },
    {
      number: '02',
      title: 'Yükleme planı oluşturun',
      description:
        'Bir araç seçin, optimizasyon kriterini belirleyin. Motor saniyeler içinde hacim, ağırlık dengesi, kırılganlık ve istifleme kurallarını göz önünde bulundurarak en uygun planı hesaplar.',
    },
    {
      number: '03',
      title: 'İnceleyin, düzenleyin ve paylaşın',
      description:
        'Anında 3D plan alın. Gerekirse yerleşimleri manuel olarak ayarlayın, ardından PDF / Excel olarak dışa aktarın ya da ekibinizle canlı 3D bağlantısı paylaşın.',
    },
  ];

  return (
    <section id="how-it-works" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 bg-page-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10 sm:mb-14 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">
            Nasıl Çalışır?
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
            ERP entegrasyonundan mükemmel, ihlalsiz bir yükleme planına üç adımda ulaşın.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-8 sm:gap-6 lg:gap-8 relative">
          <div className="hidden sm:block absolute top-6 left-[calc(33%+1rem)] right-[calc(33%+1rem)] h-px bg-border" />
          {steps.map(({ number, title, description }, idx) => (
            <div key={number} className="flex sm:block gap-5 sm:gap-0 relative">
              {idx < steps.length - 1 && (
                <div className="sm:hidden absolute left-6 top-12 bottom-0 w-px bg-border -mb-8" />
              )}
              <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center shrink-0 sm:mb-6 relative z-10">
                <span className="text-sm font-bold text-foreground">{number}</span>
              </div>
              <div className="pb-8 sm:pb-0">
                <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2 sm:mb-3">
                  {title}
                </h3>
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
      features: ['30 yükleme planı / ay', '5 araç', '500 ürün', 'Excel & PDF export', 'E-posta desteği'],
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
      features: ['Pro özelliklerin tamamı', 'Özel SLA', 'Dedicated destek', 'SSO / SAML', 'Özel entegrasyonlar'],
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
          <div className="w-6 h-6 bg-muted border border-border rounded-md flex items-center justify-center">
            <Box className="w-3 h-3 text-foreground" />
          </div>
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

        <Features />
        <HowItWorks />
        <Pricing />
        <CtaBanner />
      </main>
      <Footer />
    </div>
  );
}
