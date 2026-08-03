import { Badge } from '@/components/ui/badge';

interface Props {
  isActive: boolean;
  status?: 'active' | 'draft' | 'taslak';
}

export function VehicleStatusBadge({ isActive, status }: Props) {
  if (status === 'taslak') {
    return <Badge variant="secondary">Taslak</Badge>;
  }
  if (!isActive) {
    return <Badge variant="secondary">Pasif</Badge>;
  }
  return <Badge variant="default">Aktif</Badge>;
}
