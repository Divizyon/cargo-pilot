import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { useToggleFavorite } from '@/lib/api/useVehicles';

interface Props {
  vehicleId: string;
  isFavorite: boolean;
}

export function VehicleFavoriteButton({ vehicleId, isFavorite }: Props) {
  const { mutate, isPending } = useToggleFavorite();

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={isPending}
      onClick={(e) => {
        e.stopPropagation();
        mutate({ id: vehicleId, isFavorite: !isFavorite });
      }}
      aria-label={isFavorite ? 'Favoriden kaldır' : 'Favoriye ekle'}
    >
      <Star
        className={cn(
          'h-4 w-4 transition-colors',
          isFavorite ? 'fill-yellow-400 stroke-yellow-400' : 'stroke-muted-foreground',
        )}
      />
    </Button>
  );
}
