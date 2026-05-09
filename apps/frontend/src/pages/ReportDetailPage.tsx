import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileBarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => void navigate('/reports')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Rapor Detayı</h1>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{id}</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-muted/20 py-24">
        <FileBarChart2 className="h-10 w-10 text-muted-foreground/40" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Detay sayfası hazırlanıyor</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ürün detayı ve araç bilgileri endpoint bağlandığında burada görünecek.
          </p>
        </div>
      </div>
    </div>
  );
}
