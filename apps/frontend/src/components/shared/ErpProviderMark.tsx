import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Sağlayıcı → görsel eşlemesi. İkonu olmayan sağlayıcılar metin rozetiyle gösterilir;
 * böylece Netsis kayıtları da sağlayıcı kimliğiyle görünür.
 */
const ERP_PROVIDER_MARKS = [
  { match: 'logo', label: 'Logo', iconSrc: '/icons/erp-logo.png' },
  { match: 'netsis', label: 'Netsis', iconSrc: null },
] as const;

interface ErpProviderMarkProps {
  systemName: string | null | undefined;
  className?: string;
}

export function ErpProviderMark({ systemName, className }: ErpProviderMarkProps) {
  if (!systemName) return null;

  const normalized = systemName.toLowerCase();
  const known = ERP_PROVIDER_MARKS.find((provider) => normalized.includes(provider.match));

  if (known?.iconSrc) {
    return (
      <img
        src={known.iconSrc}
        alt={known.label}
        title={known.label}
        className={cn('h-6 w-auto shrink-0 object-contain', className)}
      />
    );
  }

  const label = known?.label ?? systemName;

  return (
    <Badge
      variant="outline"
      className={cn('shrink-0 px-1.5 text-[10px] font-medium', className)}
      title={label}
    >
      {label}
    </Badge>
  );
}
