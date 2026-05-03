import type { ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatAuditDate } from '@/lib/utils/formatAuditDate';

interface AuditUser {
  id: string;
  fullName: string;
}

interface Props {
  createdAt: string;
  createdBy: AuditUser;
  updatedAt?: string;
  updatedBy?: AuditUser;
  children: ReactNode;
}

export function VehicleAuditInfo({ createdAt, createdBy, updatedAt, updatedBy, children }: Props) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="max-w-xs space-y-1 text-xs">
        <p>
          Oluşturulma: {createdBy.fullName} — {formatAuditDate(createdAt, true)}
        </p>
        {updatedAt && updatedBy ? (
          <p>
            Son Güncelleme: {updatedBy.fullName} — {formatAuditDate(updatedAt, true)}
          </p>
        ) : (
          <p className="text-muted-foreground">Güncelleme yapılmadı</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
