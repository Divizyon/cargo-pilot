import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PlugZap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { QueryErrorState } from '@/components/shared/QueryErrorState';
import { useERPConnection } from '@/lib/api/useERPIntegration';
import { ERP_SETTINGS_ROUTE } from '@/lib/config/erpTerms';

interface RequiresErpConnectionProps {
  /** Bağlantı varken çizilen içerik; entegrasyon kimliği garanti edilir. */
  children: (integrationId: string) => ReactNode;
}

/**
 * ERP sekmelerinin ortak ön koşulu. Bağlantı yokken 'kayıt yok' demek yanıltıcıdır;
 * kullanıcı bunun yerine bağlantı ekranına yönlendirilir.
 */
export function RequiresErpConnection({ children }: RequiresErpConnectionProps) {
  const { data: connection, isLoading, isError, error, refetch } = useERPConnection();

  if (isError) {
    return (
      <QueryErrorState
        error={error}
        title="ERP bağlantısı okunamadı"
        fallbackMessage="Bağlantı bilgisi alınamadı; bu kayıt olmadığı anlamına gelmez."
        onRetry={() => void refetch()}
      />
    );
  }

  if (isLoading) return null;

  if (!connection) {
    return (
      <EmptyState
        icon={PlugZap}
        title="Önce ERP bağlantısını kaydedin"
        description="Bu sekme kayıtlı bir ERP bağlantısı olduğunda veri gösterir."
      >
        <Button asChild size="sm">
          <Link to={ERP_SETTINGS_ROUTE.connection}>ERP Bağlantısı Kur</Link>
        </Button>
      </EmptyState>
    );
  }

  return <>{children(connection.id)}</>;
}
