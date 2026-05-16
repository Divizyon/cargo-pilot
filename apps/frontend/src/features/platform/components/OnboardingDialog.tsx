import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sparkles, Package, Truck, LayoutDashboard, Share2, PlugZap } from 'lucide-react';

const STEPS = [
  {
    icon: Sparkles,
    title: "Cargo Pilot'a Hoş Geldiniz",
    description:
      'Ürünlerinizi tanımlayın, araç filosunuzu ekleyin ve algoritmamız en verimli yükleme planını saniyeler içinde hesaplasın. 3D olarak görselleştirin, ekibinizle paylaşın.',
  },
  {
    icon: PlugZap,
    title: 'ERP Entegrasyonu (İsteğe Bağlı)',
    description:
      'Logo veya Netsis kullanıyorsanız Ayarlar → ERP Bağlantısı sayfasından sisteminizi bağlayın. Ürün ve sipariş verileriniz otomatik olarak senkronize edilir. ERP kullanmıyorsanız bu adımı atlayabilirsiniz.',
  },
  {
    icon: Package,
    title: 'Ürünlerinizi Ekleyin',
    description:
      'Menüden "Ürünler" sayfasına giderek ürün boyut ve ağırlıklarını girin. Birden fazla ürününüz varsa Excel ile toplu olarak yükleyebilirsiniz.',
  },
  {
    icon: Truck,
    title: 'Araç Filosunuzu Tanımlayın',
    description:
      '"Araçlar" sayfasından kamyon, konteyner veya römork ekleyin. İç boyutlar, kapasite ve kapı yönünü girdikten sonra araçlarınız planlarda kullanıma hazır olur.',
  },
  {
    icon: LayoutDashboard,
    title: 'Yükleme Planı Oluşturun',
    description:
      'Dashboard\'daki "Yeni Plan" sihirbazını başlatın: önce aracınızı seçin, ardından yüklemek istediğiniz ürünleri ekleyin. Optimize Et\'e tıklayın, gerisini biz halledelim.',
  },
  {
    icon: Share2,
    title: '3D Görüntüleyin ve Paylaşın',
    description:
      'Plan hazır! Yüklemeyi 3D sahnede inceleyin, kural ihlallerini anında görün. PDF veya Excel raporu indirin, ya da bağlantı paylaşarak ekibinizle senkronize olun.',
  },
] as const;

interface OnboardingDialogProps {
  open: boolean;
  onClose: () => void;
}

export function OnboardingDialog({ open, onClose }: OnboardingDialogProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  function goNext() {
    if (isLast) { onClose(); return; }
    setDirection(1);
    setStep((s) => s + 1);
  }

  function goPrev() {
    setDirection(-1);
    setStep((s) => s - 1);
  }

  function handleOpenChange(value: boolean) {
    if (!value) onClose();
  }

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md p-0 overflow-hidden gap-0"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* Progress bar */}
        <div className="h-1 bg-muted w-full">
          <motion.div
            className="h-full bg-primary"
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>

        <div className="px-6 pt-8 pb-5 flex flex-col gap-5">
          {/* Header row — mr-8 keeps "Atla" clear of the X button */}
          <div className="flex items-center justify-between mr-8">
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {step + 1} / {STEPS.length}
            </span>
            <button
              onClick={onClose}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5"
            >
              Atla
            </button>
          </div>

          {/* Animated content */}
          <div className="min-h-[168px]">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                className="flex flex-col gap-4"
              >
                {/* Monochrome icon */}
                <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-muted ring-1 ring-border">
                  <Icon className="w-5 h-5 text-foreground" />
                </div>

                <div className="space-y-1.5">
                  <DialogTitle className="text-base font-semibold leading-snug text-foreground">
                    {current.title}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                    {current.description}
                  </DialogDescription>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setDirection(i > step ? 1 : -1);
                  setStep(i);
                }}
                aria-label={`${i + 1}. adıma git`}
                className={cn(
                  'rounded-full transition-all duration-300',
                  i === step
                    ? 'w-4 h-1.5 bg-primary'
                    : 'w-1.5 h-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50',
                )}
              />
            ))}
          </div>

          {/* Navigation — consistent size, left-aligned */}
          <div className="flex items-center gap-2 pt-1">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={goPrev}>
                Geri
              </Button>
            )}
            <Button size="sm" onClick={goNext} className="gap-1.5">
              {isLast ? 'Başlayalım' : 'Devam Et'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
