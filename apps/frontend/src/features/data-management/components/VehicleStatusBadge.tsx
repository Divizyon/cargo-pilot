import { Badge } from '@/components/ui/badge';

interface VehicleStatusBadgeProps {
  status: 'active' | 'draft';
}

export function VehicleStatusBadge({ status }: VehicleStatusBadgeProps) {
  if (status !== 'draft') return null;
  return <Badge variant="secondary">Taslak</Badge>;
}
