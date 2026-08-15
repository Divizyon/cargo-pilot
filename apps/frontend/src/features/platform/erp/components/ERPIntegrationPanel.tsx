import type { ReactNode } from 'react';
import { Separator } from '@/components/ui/separator';
import { ERPConnectionForm } from '@/features/platform/erp/components/ERPConnectionForm';
import { ERPSyncHistory } from '@/features/platform/erp/components/ERPSyncHistory';
import { ErpSyncSettingsSection } from '@/features/platform/erp/components/ErpSyncSettingsSection';

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
 * ERP entegrasyonu ayarları tek ekranda: bağlantı, birimler ve senkronizasyon, geçmiş.
 *
 * Ayrı sekmelerdeyken kullanıcı bağlantıyı kurup sonucunu görmek için sekme değiştirmek
 * zorundaydı. Birim ve sıklık ayarları ERP Ürünleri ekranındaki senkronizasyon
 * diyaloğunda da duruyor; ikisi de sunucudaki aynı kaydı yazar.
 */
export function ERPIntegrationPanel({ onDirtyChange }: ERPIntegrationPanelProps) {
  return (
    <div className="space-y-6">
      <Section title="Bağlantı">
        <ERPConnectionForm onDirtyChange={onDirtyChange} />
      </Section>

      <Separator />

      <Section title="Birimler ve Senkronizasyon">
        <ErpSyncSettingsSection />
      </Section>

      <Separator />

      <Section title="Geçmiş">
        <ERPSyncHistory />
      </Section>
    </div>
  );
}
