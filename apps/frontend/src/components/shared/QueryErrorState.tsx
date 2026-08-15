import { AlertTriangle, RotateCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api/apiError';
import { cn } from '@/lib/utils';

interface QueryErrorStateProps {
  /** TanStack Query'nin `error` alani; backend Result zarfindan mesaj cikarilir. */
  error: unknown;
  title: string;
  fallbackMessage?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Veri cekme hatasini "boş liste" gorunumunden ayiran ortak hata kutusu.
 * Sessiz basarisizlik yerine kullaniciya neden ve yeniden deneme sunar.
 */
export function QueryErrorState({
  error,
  title,
  fallbackMessage = 'Veriler yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.',
  onRetry,
  className,
}: QueryErrorStateProps) {
  return (
    <Alert variant="destructive" className={cn('text-left', className)}>
      <AlertTriangle className="h-4 w-4" />
      <div className="space-y-2">
        <p className="text-sm font-medium">{title}</p>
        <AlertDescription className="text-muted-foreground">
          {getApiErrorMessage(error, fallbackMessage)}
        </AlertDescription>
        {onRetry && (
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            <RotateCw className="mr-2 h-3.5 w-3.5" />
            Tekrar dene
          </Button>
        )}
      </div>
    </Alert>
  );
}
