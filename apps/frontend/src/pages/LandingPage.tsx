import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';

// ─── Navbar ────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: 'Özellikler', href: '#features' },
  { label: 'Nasıl Çalışır', href: '#how-it-works' },
  { label: 'Fiyatlandırma', href: '#pricing' },
];

function Navbar() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 border border-border">
            <Box className="w-4 h-4 text-foreground" />
          </div>
          <span className="font-bold text-foreground text-lg tracking-tight">Cargo Pilot</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 cursor-pointer"
            >
              {label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/auth/login">Giriş Yap</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/auth/register">
              Ücretsiz Başla <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ───────────────────────────────────────────────────────────────────

function CargoGrid() {
  const boxes = [
    { w: 2, h: 2, color: 'bg-foreground' },
    { w: 1, h: 1, color: 'bg-muted-foreground/40' },
    { w: 1, h: 2, color: 'bg-muted-foreground/60' },
    { w: 1, h: 1, color: 'bg-muted-foreground/30' },
    { w: 1, h: 1, color: 'bg-muted-foreground/50' },
    { w: 2, h: 1, color: 'bg-foreground/60' },
    { w: 1, h: 1, color: 'bg-muted-foreground/40' },
  ];

  return (
    <div className="relative w-full max-w-md mx-auto aspect-video rounded-2xl border border-border bg-page-background overflow-hidden shadow-sm">
      {/* Başlık çubuğu */}
      <div className="absolute inset-x-0 top-0 h-10 border-b border-border bg-background flex items-center px-4 gap-2">
        <Truck className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground">
          Yükleme Planı — Mercedes Actros 18T
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs text-muted-foreground">%94 verimli</span>
        </div>
      </div>

      {/* Kargo ızgarası */}
      <div className="absolute inset-0 top-10 p-4">
        <div className="h-full grid grid-cols-4 grid-rows-3 gap-1.5">
          {boxes.map((b, i) => (
            <div
              key={i}
              className={cn(
                'rounded-md transition-opacity',
                b.color,
                b.w === 2 && 'col-span-2',
                b.h === 2 && 'row-span-2',
              )}
            />
          ))}
        </div>
      </div>

      {/* Alt rozet */}
      <div className="absolute bottom-3 right-3 bg-background border border-border rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-sm">
        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
        <span className="text-xs font-medium text-foreground">3D görünüm hazır</span>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="pt-32 pb-20 px-6 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Sol */}
          <div>
            <h1 className="text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] tracking-tight mb-6">
              Her yükü planla. <span className="text-muted-foreground">Mükemmel şekilde.</span>
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
              Cargo Pilot, araçlarınız için saniyeler içinde en uygun 3D yükleme planlarını
              oluşturur — alan kaybını azaltır, ihlalleri önler ve ekibinize paylaşılabilir görsel
              raporlar sunar.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Button size="lg" asChild>
                <Link to="/auth/register">
                  Ücretsiz Başla <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/auth/register">Demo Gör</Link>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              {['Kredi kartı gerekmez', '5 dakikada kurulum', 'İstediğin zaman iptal'].map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sağ */}
          <div>
            <CargoGrid />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Stats ──────────────────────────────────────────────────────────────────

function Stats() {
  const items = [
    { value: '%94', label: 'Ortalama alan kullanımı' },
    { value: '<5s', label: 'Plan oluşturma süresi' },
    { value: '3D', label: 'Etkileşimli görselleştirme' },
    { value: '%100', label: 'Kural uyumu garantili' },
  ];

  return (
    <section className="py-16 border-t border-b border-border bg-page-background">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {items.map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-4xl font-bold text-foreground mb-2">{value}</div>
              <div className="text-sm text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Features ───────────────────────────────────────────────────────────────

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="p-6 rounded-xl border border-border bg-card hover:border-foreground/20 transition-colors duration-200">
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
    <section id="features" className="py-24 px-6 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Ekibinizin daha akıllı yüklemesi için gereken her şey
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            İlk taramadan son teslimata kadar — Cargo Pilot yükleme sürecinin her adımını kapsar.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
      title: 'Ürünlerinizi ve araçlarınızı tanımlayın',
      description:
        'Boyutlar, ağırlık, kırılganlık kuralları ve istifleme kısıtlamalarıyla ürün kataloğunuzu oluşturun. Araç filonuzu tam kargo bölmesi boyutlarıyla kaydedin.',
    },
    {
      number: '02',
      title: 'Yükleme planı oluşturun',
      description:
        'Bir araç seçin, hangi ürünleri ve ne miktarda göndereceğinizi belirleyin. Optimizasyon kriterini ayarlayın — hacim, ağırlık dengesi veya öncelik.',
    },
    {
      number: '03',
      title: 'İnceleyin, düzenleyin ve paylaşın',
      description:
        'Anında 3D plan alın. Gerekirse yerleşimleri manuel olarak ayarlayın, ardından PDF / Excel olarak dışa aktarın ya da ekibinizle canlı 3D bağlantısı paylaşın.',
    },
  ];

  return (
    <section id="how-it-works" className="py-24 px-6 bg-page-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">Nasıl Çalışır?</h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Ürün kataloğunuzdan mükemmel, ihlalsiz bir yükleme planına üç adımda ulaşın.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 relative">
          {/* Bağlantı çizgisi */}
          <div className="hidden lg:block absolute top-6 left-[calc(33%+1.5rem)] right-[calc(33%+1.5rem)] h-px bg-border" />

          {steps.map(({ number, title, description }) => (
            <div key={number} className="relative">
              <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center mb-6">
                <span className="text-sm font-bold text-foreground">{number}</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">{title}</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">{description}</p>
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
        'rounded-2xl border p-6 flex flex-col relative bg-card',
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
          <span className="text-3xl font-bold text-foreground">{price}</span>
          {period && <span className="text-sm text-muted-foreground">{period}</span>}
        </div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>

      <ul className="space-y-2.5 mb-6 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-foreground" />
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
    <section id="pricing" className="py-24 px-6 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">Basit, şeffaf fiyatlandırma</h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Ücretsiz başlayın. Filonuz büyüdükçe ölçeklendirin.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start pt-4">
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
    <section className="py-20 px-6 bg-page-background border-t border-border">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-4xl font-bold text-foreground mb-4">
          Daha akıllı yüklemeye hazır mısınız?
        </h2>
        <p className="text-lg text-muted-foreground mb-8">
          Cargo Pilot kullanan lojistik ekiplerine katılın, alan israfını ve yükleme hatalarını
          ortadan kaldırın.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button size="lg" asChild>
            <Link to="/auth/register">
              Ücretsiz Başla <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
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
    <footer className="border-t border-border bg-background py-10 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-muted border border-border rounded-md flex items-center justify-center">
            <Box className="w-3 h-3 text-foreground" />
          </div>
          <span className="font-semibold text-foreground text-sm">Cargo Pilot</span>
        </div>

        <div className="flex items-center gap-6">
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
        <Stats />
        <Features />
        <HowItWorks />
        <Pricing />
        <CtaBanner />
      </main>
      <Footer />
    </div>
  );
}
