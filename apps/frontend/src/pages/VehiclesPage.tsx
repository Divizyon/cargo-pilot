import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function VehiclesPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Araç Yönetimi</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Yükleme planlarında kullanılacak araçları tanımlayın.
          </p>
        </div>
        <Button onClick={() => navigate('/vehicles/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Araç Ekle
        </Button>
      </div>
    </div>
  );
}
