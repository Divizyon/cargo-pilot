import { ClipboardList, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ERP_NETWORK_PRECONDITIONS } from '@/features/platform/erp/utils/erpFieldGuidance';

interface ErpSetupHelpProps {
  onCopyChecklist: () => void;
}

function PreconditionList() {
  return (
    <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground">
      {ERP_NETWORK_PRECONDITIONS.map((precondition) => (
        <li key={precondition}>{precondition}</li>
      ))}
    </ul>
  );
}

function CopyChecklistButton({ onCopyChecklist }: ErpSetupHelpProps) {
  return (
    <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onCopyChecklist}>
      <ClipboardList className="h-4 w-4" aria-hidden="true" />
      IT&apos;ye gönderilecek listeyi kopyala
    </Button>
  );
}

/**
 * İlk kurulumda görünen yardım içeriği. Bağlantı yokken kullanıcı bu ekranda ne yapacağını
 * bilmiyor; yardım bir düğmenin arkasında dururken bulunması kullanıcıya kalıyordu.
 * Kabuğu <c>ErpConnectionStatusCard</c> verir ki bağlantılı ve bağlantısız hâl aynı kartta
 * dursun. Bağlantı kurulduktan sonra aynı içerik <c>ErpSetupHelpPopover</c> ile düğmenin
 * arkasına çekilir.
 */
export function ErpSetupHelpContent({ onCopyChecklist }: ErpSetupHelpProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Henüz bir ERP bağlantınız yok</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Aşağıdaki alanları doldurduğunuzda ERP&apos;nizdeki ürünler Cargo Pilot&apos;a
          çekilebilir hale gelir. Bu bilgiler sizde değil, ERP sunucunuzu yöneten IT ekibinde
          bulunur — listeyi kopyalayıp onlara iletebilirsiniz.
        </p>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-foreground">
          IT ekibinizin ayrıca şunları açması gerekir:
        </p>
        <PreconditionList />
      </div>

      <CopyChecklistButton onCopyChecklist={onCopyChecklist} />
    </div>
  );
}

/**
 * Bağlantı kurulduktan sonraki hâli: aynı içerik düğmenin arkasında durur, forma her
 * bakışta yer kaplamaz.
 */
export function ErpSetupHelpPopover({ onCopyChecklist }: ErpSetupHelpProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs">
          <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
          Kurulum yardımı
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(26rem,calc(100vw-2rem))] space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Bu bilgileri nereden bulacaksınız?</p>
          <p className="text-xs text-muted-foreground">
            Alanların tamamı ERP sunucunuzu yöneten IT ekibinde bulunur.
          </p>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-foreground">Ağ ön koşulları</p>
          <PreconditionList />
        </div>

        <CopyChecklistButton onCopyChecklist={onCopyChecklist} />
      </PopoverContent>
    </Popover>
  );
}
