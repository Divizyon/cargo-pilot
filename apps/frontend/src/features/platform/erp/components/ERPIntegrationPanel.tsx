import type { ReactNode } from 'react';
import { Separator } from '@/components/ui/separator';
import { ERPConnectionForm } from '@/features/platform/erp/components/ERPConnectionForm';
import { ERPSyncHistory } from '@/features/platform/erp/components/ERPSyncHistory';

interface ERPIntegrationPanelProps {
  onDirtyChange?: (dirty: boolean) => void;
}

interface SectionProps {
  title: string;
  children: ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * ERP entegrasyonu ayarları tek ekranda: bağlantı ve geçmiş.
 *
 * Ayrı sekmelerdeyken kullanıcı bağlantıyı kurup sonucunu görmek için sekme değiştirmek
 * zorundaydı. Çekim ve sıklık ayarı buraya değil, ERP Ürünleri ekranındaki çekim
 * diyaloğuna taşındı: ikisi de aynı işin parçası ve aksiyonun yanında duruyor.
 */
export function ERPIntegrationPanel({ onDirtyChange }: ERPIntegrationPanelProps) {
  return (
    <div className="space-y-6">
      <Section title="Bağlantı">
        <ERPConnectionForm onDirtyChange={onDirtyChange} />
      </Section>

      <Separator />

      <Section title="Geçmiş">
        <ERPSyncHistory />
      </Section>
    </div>
  );
}
