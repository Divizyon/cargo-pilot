import { formatAuditDate } from '@/lib/utils/formatAuditDate';
import { useUnitStore } from '@/lib/store/useUnitStore';

interface AuditUser {
  id: string;
  fullName: string;
}

interface Props {
  createdAt: string;
  createdBy: AuditUser;
  updatedAt?: string;
  updatedBy?: AuditUser;
}

export function VehicleAuditSection({ createdAt, createdBy, updatedAt, updatedBy }: Props) {
  const dateFormat = useUnitStore((s) => s.dateFormat);

  return (
    <div className="space-y-1 text-sm text-muted-foreground">
      <p>
        <span className="font-medium text-foreground">Oluşturan:</span> {createdBy.fullName} —{' '}
        {formatAuditDate(createdAt, dateFormat, true)}
      </p>
      {updatedAt && updatedBy ? (
        <p>
          <span className="font-medium text-foreground">Son Güncelleme:</span> {updatedBy.fullName}{' '}
          — {formatAuditDate(updatedAt, dateFormat, true)}
        </p>
      ) : (
        <p className="text-muted-foreground">Güncelleme yapılmadı</p>
      )}
    </div>
  );
}
