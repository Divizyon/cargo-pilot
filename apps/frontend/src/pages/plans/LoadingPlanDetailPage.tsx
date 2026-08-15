import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ChevronRight,
  Home,
  Settings,
  Search,
  Zap,
  Package,
  BarChart3,
  Scale,
  Layers3,
  Box,
  AlertCircle,
  RotateCcw,
  MoveHorizontal,
  ArrowUpDown,
  Copy,
  CheckCircle2,
  Loader2,
  Play,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  useLoadingPlanListItem,
  useLoadingPlanProducts,
  useLoadingPlanDetail,
  useApprovePlan,
  useDeleteLoadingPlan,
  useUploadPlanThumbnail,
} from '@/lib/api/useLoadingPlans';
import { PlanCanvas } from '@/features/planning/scene/components/PlanCanvas';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { PlanStatus, ErpExportStatus } from '@/lib/types/loadingPlan';
import type {
  LoadingPlanListItem,
  PlanProductGroup,
  PlanProductItem,
} from '@/lib/types/loadingPlan';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPlanDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr), 'dd.MM.yyyy');
  } catch {
    return '—';
  }
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  [PlanStatus.Tamamlandi]: {
    label: 'Tamamlandı',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  [PlanStatus.Aktif]: {
    label: 'Aktif',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  [PlanStatus.Taslak]: {
    label: 'Taslak',
    className: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  },
  [PlanStatus.Iptal]: {
    label: 'İptal',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

// ─── Tab types ────────────────────────────────────────────────────────────────

type PlanTab = 'cargo' | 'equipment' | 'rules' | '3d-planner';

const PLAN_TABS: { id: PlanTab; label: string; step: number }[] = [
  { id: 'cargo', label: 'Kargo', step: 1 },
  { id: 'equipment', label: 'Ekipman', step: 2 },
  { id: 'rules', label: 'Kurallar', step: 3 },
  { id: '3d-planner', label: '3D Planlayıcı', step: 4 },
];

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface UtilizationCardProps {
  icon: ReactNode;
  label: string;
  pct: number;
  loadedLabel: string;
  loadedValue: string;
  remainingLabel: string;
  remainingValue: string;
}

function UtilizationCard({
  icon,
  label,
  pct,
  loadedLabel,
  loadedValue,
  remainingLabel,
  remainingValue,
}: UtilizationCardProps) {
  const isHigh = pct >= 85;
  const isMed = pct >= 60 && pct < 85;

  return (
    <div className="bg-white rounded-xl border border-zinc-200 px-4 py-3 flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">{label}</span>
        <span className="text-zinc-300">{icon}</span>
      </div>
      <p
        className={cn(
          'text-2xl font-bold leading-none',
          isHigh ? 'text-emerald-600' : isMed ? 'text-yellow-600' : 'text-zinc-900',
        )}
      >
        {pct.toFixed(1)}%
      </p>
      <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full',
            isHigh ? 'bg-emerald-500' : isMed ? 'bg-yellow-400' : 'bg-zinc-400',
          )}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <div className="flex items-center gap-3 text-[11px] text-zinc-500">
        <span>
          {loadedLabel}: <span className="font-medium text-zinc-700">{loadedValue}</span>
        </span>
        <span>
          {remainingLabel}: <span className="font-medium text-zinc-700">{remainingValue}</span>
        </span>
      </div>
    </div>
  );
}

interface InfoCardProps {
  icon: ReactNode;
  label: string;
  primary: string;
  children?: ReactNode;
}

function InfoCard({ icon, label, primary, children }: InfoCardProps) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 px-4 py-3 flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">{label}</span>
        <span className="text-zinc-300">{icon}</span>
      </div>
      <p className="text-2xl font-bold leading-none text-zinc-900">{primary}</p>
      {children && <div className="text-[11px] text-zinc-500 space-y-0.5">{children}</div>}
    </div>
  );
}

// ─── Constraint icons ─────────────────────────────────────────────────────────

const CONSTRAINT_ICON_MAP: Record<string, ReactNode> = {
  fragile: <AlertCircle className="w-3 h-3 text-rose-500" />,
  liquid: <RotateCcw className="w-3 h-3 text-blue-500" />,
  bottom_only: <ArrowUpDown className="w-3 h-3 text-amber-500" />,
  no_rotate: <MoveHorizontal className="w-3 h-3 text-zinc-500" />,
  heavy_side: <Scale className="w-3 h-3 text-purple-500" />,
  hazmat: <AlertCircle className="w-3 h-3 text-orange-500" />,
};

// ─── Product row ──────────────────────────────────────────────────────────────

interface ContainerProductRowProps {
  product: PlanProductItem;
}

function ContainerProductRow({ product }: ContainerProductRowProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-50 rounded-md transition-colors">
      <span className="w-2 h-2 rounded-full bg-zinc-300 shrink-0" />
      <span className="flex-1 text-xs text-zinc-700 truncate">
        {product.name} <span className="text-zinc-400">x{product.quantity}</span>
      </span>
      <div className="flex items-center gap-1 shrink-0">
        <Scale className="w-3 h-3 text-zinc-400" />
        <span className="text-[10px] text-zinc-400">{product.unitWeightKg} kg</span>
        <Layers3 className="w-3 h-3 text-zinc-400 ml-1" />
        <span className="text-[10px] text-zinc-400">{product.layerCount}</span>
        {product.constraints.map((c) => (
          <span key={c} title={c}>
            {CONSTRAINT_ICON_MAP[c] ?? null}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Container Panel ──────────────────────────────────────────────────────────

interface ContainerPanelProps {
  plan: LoadingPlanListItem;
  index: number;
  productGroups: PlanProductGroup[];
  cogText: string;
}

function ContainerPanel({ plan, index, productGroups, cogText }: ContainerPanelProps) {
  const [activeGroup, setActiveGroup] = useState(productGroups[0]?.id ?? '');
  const statusCfg = STATUS_CONFIG[plan.status] ?? STATUS_CONFIG[PlanStatus.Taslak];

  const selectedGroup = productGroups.find((g) => g.id === activeGroup) ?? productGroups[0];

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-2">
      {/* 3D Viewport — planId dışarıdan gelecek, ContainerPanel bunu bilmiyor;
          ThreeDPlannerContent seviyesinde canvas render ediliyor */}

      {/* CoG indicator */}
      <p className="text-[11px] font-medium text-amber-600 px-1">{cogText}</p>

      {/* Container header row */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-100">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-900 text-white text-[10px] font-bold shrink-0">
            {index}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-800 truncate">{plan.vehicleName}</p>
            <p className="text-[10px] text-zinc-400">{plan.planCode}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border',
                statusCfg.className,
              )}
            >
              Hacim: {plan.volumeFillPercentage.toFixed(0)}%
            </span>
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border',
                statusCfg.className,
              )}
            >
              Ağırlık: {plan.fillPercentage.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Group tabs */}
        {productGroups.length > 0 && (
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-zinc-100 overflow-x-auto">
            {productGroups.map((g) => (
              <button
                key={g.id}
                onClick={() => setActiveGroup(g.id)}
                className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors shrink-0',
                  activeGroup === g.id
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100',
                )}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: g.color }}
                />
                {g.name}
              </button>
            ))}
          </div>
        )}

        {/* Product list */}
        <div className="py-1 max-h-[200px] overflow-y-auto">
          {selectedGroup?.products.map((product) => (
            <ContainerProductRow key={product.id} product={product} />
          ))}
          {!selectedGroup && (
            <p className="text-xs text-zinc-400 text-center py-4">Ürün bulunamadı.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 3D Planner Tab Content ───────────────────────────────────────────────────

interface ThreeDPlannerContentProps {
  planId: string;
  plan: LoadingPlanListItem;
  productGroups: PlanProductGroup[];
  search: string;
  onSearchChange: (v: string) => void;
  editMode: boolean;
  onEditModeChange: (v: boolean) => void;
}

function ThreeDPlannerContent({
  planId,
  plan,
  productGroups,
  search,
  onSearchChange,
  editMode,
  onEditModeChange,
}: ThreeDPlannerContentProps) {
  // Backend'den gelen placement verilerini store'a yükle
  const { data: detail } = useLoadingPlanDetail(planId);
  const setVehicle = usePlanStore((s) => s.setVehicle);
  const initItems = usePlanStore((s) => s.initItems);
  const setPlacements = usePlanStore((s) => s.setPlacements);
  const startAnimation = useSceneStore((s) => s.startAnimation);
  const animationMode = useSceneStore((s) => s.animationMode);
  const storePlacements = usePlanStore((s) => s.placements);
  const appliedRef = useRef(false);
  const snapshotTakenRef = useRef(false);
  const snapshotFnRef = useRef<(() => string) | null>(null);
  const { mutate: uploadThumbnail } = useUploadPlanThumbnail();
  const uploadThumbnailRef = useRef(uploadThumbnail);
  useEffect(() => {
    uploadThumbnailRef.current = uploadThumbnail;
  }, [uploadThumbnail]);

  useEffect(() => {
    return () => {
      usePlanStore.getState().reset();
      useSceneStore.getState().reset();
    };
  }, []);

  useEffect(() => {
    if (appliedRef.current || !detail?.vehicle) return;
    appliedRef.current = true;
    setVehicle(detail.vehicle);
    initItems(detail.inputItems, detail.skuColorMap);
    setPlacements(detail.placements);
    useSceneStore.getState().setAnimationMode('idle');
    useSceneStore.getState().setAnimationStep(0);
  }, [detail, setVehicle, initItems, setPlacements]);

  // Snapshot: thumbnail yoksa placements yüklendikten 2.5s sonra canvas'tan yakala
  useEffect(() => {
    if (plan.thumbnailUrl) return;
    if (storePlacements.length === 0) return;
    if (snapshotTakenRef.current) return;

    const timerId = window.setTimeout(() => {
      if (snapshotTakenRef.current) return;
      snapshotTakenRef.current = true;
      const dataUrl =
        snapshotFnRef.current?.() ??
        (document.querySelector('canvas') as HTMLCanvasElement | null)?.toDataURL(
          'image/jpeg',
          0.7,
        );
      if (dataUrl) {
        uploadThumbnailRef.current({ id: planId, dataUrl });
      }
    }, 2500);

    return () => window.clearTimeout(timerId);
  }, [planId, plan.thumbnailUrl, storePlacements.length]);

  function handlePlay() {
    startAnimation();
  }
  const totalVolume = plan.interiorWidthCm * plan.interiorHeightCm * plan.interiorLengthCm;
  const loadedVolume = (plan.volumeFillPercentage / 100) * totalVolume;
  const remainingVolume = totalVolume - loadedVolume;
  const remainingWeight = plan.vehicleCapacityKg - plan.totalWeightKg;

  const isLoaded = storePlacements.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* 3D Canvas + Yükle butonu */}
      <div
        className="relative rounded-xl overflow-hidden border border-zinc-200 bg-white"
        style={{ height: 400 }}
      >
        {isLoaded ? (
          <>
            <PlanCanvas planId={planId} snapshotRef={snapshotFnRef} />
            {animationMode !== 'playing' && animationMode !== 'stepped' && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
                <Button
                  size="sm"
                  className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700 shadow-md"
                  onClick={handlePlay}
                >
                  <Play className="h-3.5 w-3.5 fill-white" />
                  Yükle
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-400">
            <Box className="w-8 h-8 text-zinc-300" strokeWidth={1.5} />
            <span className="text-xs font-medium">{plan.vehicleName} — 3D Görünüm</span>
            <span className="text-[10px] text-zinc-300">Yükleniyor…</span>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3">
        <UtilizationCard
          icon={<BarChart3 className="w-4 h-4" />}
          label="Hacim Kullanımı"
          pct={plan.volumeFillPercentage}
          loadedLabel="Yüklü"
          loadedValue={`${loadedVolume.toFixed(2)} m³`}
          remainingLabel="Kalan"
          remainingValue={`${remainingVolume.toFixed(2)} m³`}
        />
        <UtilizationCard
          icon={<Scale className="w-4 h-4" />}
          label="Ağırlık Kullanımı"
          pct={plan.fillPercentage}
          loadedLabel="Yüklü"
          loadedValue={`${plan.totalWeightKg.toLocaleString('tr-TR')} kg`}
          remainingLabel="Kalan"
          remainingValue={`${remainingWeight.toLocaleString('tr-TR')} kg`}
        />
        <InfoCard
          icon={<Package className="w-4 h-4" />}
          label="Kullanılan Ekipman"
          primary={String(plan.productCount)}
        >
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span className="text-zinc-600">{plan.vehicleName}</span>
              <span className="font-medium text-zinc-700">x1</span>
            </div>
          </div>
        </InfoCard>
        <InfoCard
          icon={<Layers3 className="w-4 h-4" />}
          label="Yüklenemeyen Kargo"
          primary={`${remainingVolume.toFixed(2)} m³`}
        >
          <span>
            Ağırlık:{' '}
            <span className="font-medium text-zinc-700">
              {Math.max(0, plan.vehicleCapacityKg - plan.totalWeightKg).toLocaleString('tr-TR')} kg
            </span>
          </span>
        </InfoCard>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 bg-white rounded-xl border border-zinc-200 px-3 py-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Kargo öğelerini ara..."
            className="pl-8 h-8 text-xs border-zinc-200"
          />
        </div>

        <div className="flex items-center gap-2 ml-2">
          <Label htmlFor="edit-mode" className="text-xs text-zinc-500 cursor-pointer">
            Düzenleme Modu
          </Label>
          <Switch
            id="edit-mode"
            checked={editMode}
            onCheckedChange={onEditModeChange}
            className="scale-75"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Button
            size="sm"
            className="h-8 bg-zinc-900 hover:bg-zinc-800 text-white text-xs gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            Otomatik Plan
          </Button>

          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-zinc-200">
            <Package className="w-3.5 h-3.5" />
            Yüklenemeyen
            <span className="inline-flex items-center justify-center rounded-full bg-zinc-900 text-white text-[9px] font-bold w-4 h-4">
              {plan.productCount}
            </span>
          </Button>
        </div>
      </div>

      {/* Right-side floating action bar hint */}
      <div className="flex gap-4">
        {/* Containers */}
        <div className="flex-1 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Konteynerler (1)
            </span>
          </div>
          <div className="flex gap-4">
            <ContainerPanel
              plan={plan}
              index={1}
              productGroups={productGroups}
              cogText="Ağırlık Merkezi: %7 ön, %6 sağ"
            />
          </div>
        </div>

        {/* Floating right panel */}
        <div className="flex flex-col gap-1.5 pt-[220px]">
          {[Copy, BarChart3, Package].map((Icon, i) => (
            <button
              key={i}
              className="w-7 h-7 flex items-center justify-center rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Shared detail content (used both inline and as standalone page) ──────────

interface PlanDetailContentProps {
  id: string;
  onBack?: () => void;
}

const ERP_BADGE_CLASS =
  'flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium';

/**
 * Aktarım durumu sunucudan okunur; onay isteğinden hemen sonra plan sorgusu tazelenene
 * kadar iyimser 'kuyrukta' göstergesi için {@link justQueued} kullanılır.
 */
interface ErpExportBadgeProps {
  status: ErpExportStatus | null | undefined;
  message: string | null | undefined;
  justQueued: boolean;
}

function ErpExportBadge({ status, message, justQueued }: ErpExportBadgeProps) {
  if (status === ErpExportStatus.Sent) {
    return (
      <span className={cn(ERP_BADGE_CLASS, 'border-emerald-200 bg-emerald-50 text-emerald-700')}>
        <CheckCircle2 className="h-3 w-3" />
        ERP'ye aktarıldı
      </span>
    );
  }

  if (status === ErpExportStatus.Failed) {
    const reason = message?.trim() || 'Aktarım başarısız oldu; nedeni kaydedilmedi.';
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              tabIndex={0}
              title={reason}
              className={cn(ERP_BADGE_CLASS, 'border-red-200 bg-red-50 text-red-700')}
            >
              <AlertCircle className="h-3 w-3" />
              ERP'ye aktarılamadı
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-80 whitespace-pre-wrap break-words">
            {reason}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (status === ErpExportStatus.Pending || justQueued) {
    return (
      <span className={cn(ERP_BADGE_CLASS, 'border-blue-200 bg-blue-50 text-blue-700')}>
        <Loader2 className="h-3 w-3 animate-spin" />
        ERP aktarımı kuyrukta…
      </span>
    );
  }

  return null;
}

export function PlanDetailContent({ id, onBack }: PlanDetailContentProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<PlanTab>('3d-planner');
  const [search, setSearch] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [justQueued, setJustQueued] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: plan, isLoading, isError } = useLoadingPlanListItem(id);
  const { data: productGroups = [] } = useLoadingPlanProducts(id);
  const { mutateAsync: approvePlan, isPending: isApproving } = useApprovePlan();
  const { mutate: deletePlan, isPending: isDeleting } = useDeleteLoadingPlan();

  async function handleApprove() {
    try {
      // ERP aktarımı sunucudaki özellik anahtarına bağlıdır; kuyruğa alındı bilgisi
      // yalnızca yanıttaki erpExportQueued true iken gösterilir.
      const outcome = await approvePlan(id);
      if (outcome.erpExportQueued) setJustQueued(true);
      toast.success(outcome.message, { position: 'bottom-right' });
    } catch {
      // approvePlan mutation handles its own error toast
    }
  }

  function handleBack() {
    if (onBack) {
      onBack();
    } else {
      navigate('/planning');
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-5xl">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (isError || !plan) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
        <p className="text-sm text-zinc-500">Plan bulunamadı.</p>
        <Button variant="outline" size="sm" onClick={handleBack}>
          Planlara dön
        </Button>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[plan.status] ?? STATUS_CONFIG[PlanStatus.Taslak];
  const planDate = formatPlanDate(plan.plannedAt ?? plan.createdAt);

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-zinc-50">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="px-6 pt-5 pb-4 bg-white border-b border-zinc-200">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5 text-xs text-zinc-400 mb-3">
          <Link to="/dashboard" className="hover:text-zinc-600 transition-colors">
            <Home className="w-3.5 h-3.5" />
          </Link>
          <ChevronRight className="w-3 h-3" />
          <Link to="/planning" className="hover:text-zinc-600 transition-colors">
            Projeler
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-zinc-600 font-medium truncate max-w-[200px]">{plan.planName}</span>
        </nav>

        {/* Title row */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-zinc-900 leading-tight truncate max-w-xl">
                {plan.planName}
              </h1>
              <span
                className={cn(
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border',
                  statusCfg.className,
                )}
              >
                {statusCfg.label}
              </span>
            </div>
            <p className="text-sm text-zinc-500 mt-1">
              {plan.vehicleName}
              {plan.vehiclePlate ? ` · ${plan.vehiclePlate}` : ''} · {planDate} ·{' '}
              <span className="font-mono text-zinc-400 text-xs">{plan.planCode}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* ERP aktarım durumu — sunucudaki plan durumundan okunur */}
            <ErpExportBadge
              status={plan.erpExportStatus}
              message={plan.erpExportMessage}
              justQueued={justQueued}
            />

            {/* Onayla butonu — sadece 'aktif' planlarda */}
            {plan.status === PlanStatus.Aktif && (
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={
                  isApproving ||
                  justQueued ||
                  plan.erpExportStatus === ErpExportStatus.Pending ||
                  plan.erpExportStatus === ErpExportStatus.Sent
                }
                onClick={() => void handleApprove()}
              >
                {isApproving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                Onayla
              </Button>
            )}

            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-zinc-200">
              <Settings className="w-3.5 h-3.5" />
              Ayarlar
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteOpen(true)}
              aria-label="Planı sil"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0.5 mt-4">
          {PLAN_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100',
              )}
            >
              <span
                className={cn(
                  'inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold',
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-500',
                )}
              >
                {tab.step}
              </span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ──────────────────────────────────────────────────── */}
      <div className="flex-1 px-6 py-5">
        {activeTab === '3d-planner' && (
          <ThreeDPlannerContent
            planId={id}
            plan={plan}
            productGroups={productGroups}
            search={search}
            onSearchChange={setSearch}
            editMode={editMode}
            onEditModeChange={setEditMode}
          />
        )}

        {activeTab !== '3d-planner' && (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-400 gap-2">
            <Package className="w-8 h-8 text-zinc-200" />
            <p className="text-sm">Bu sekme henüz hazır değil.</p>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setActiveTab('3d-planner')}
            >
              3D Planlayıcıya geç
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Planı sil</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{plan.planName}</strong> planı silinecek. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={() =>
                deletePlan(id, {
                  onSuccess: () => navigate('/planning'),
                })
              }
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── LoadingPlanDetailPage (standalone route: /planning/:id) ──────────────────

export function LoadingPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <PlanDetailContent id={id ?? ''} />;
}
