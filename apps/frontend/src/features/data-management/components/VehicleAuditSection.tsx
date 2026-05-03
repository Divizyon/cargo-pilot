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
}

export function VehicleAuditSection({ createdAt, createdBy, updatedAt, updatedBy }: Props) {
  return (
    <div className="space-y-1 text-sm text-muted-foreground">
      <p>
        <span className="font-medium text-foreground">Oluşturan:</span> {createdBy.fullName} —{' '}
        {formatAuditDate(createdAt, true)}
      </p>
      {updatedAt && updatedBy ? (
        <p>
          <span className="font-medium text-foreground">Son Güncelleme:</span> {updatedBy.fullName}{' '}
          — {formatAuditDate(updatedAt, true)}
        </p>
      ) : (
        <p className="text-muted-foreground">Güncelleme yapılmadı</p>
      )}
    </div>
  );
}
