import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FieldHintProps {
  /** Ekran okuyucuya gidecek ad; hangi alanın açıklaması olduğunu söyler. */
  label: string;
  children: ReactNode;
}

/**
 * Alan açıklamasını etiketin yanındaki bilgi simgesine taşır. Açıklamalar form altında
 * paragraf olarak dururken ekran okunamayacak kadar uzuyordu; içerik aynı kalır, yalnızca
 * isteyen kullanıcıya gösterilir.
 *
 * Etiketin kendisi kaldırılmaz: yer tutucu tek başına etiket yerine geçmez, alan
 * doldurulduğunda kaybolur ve ekran okuyucu için karşılığı olmaz.
 *
 * Buton `FormLabel` içine değil yanına konur; etiketin içindeki buton tıklandığında
 * odağı input'a kaydırırdı.
 */
export function FieldHint({ label, children }: FieldHintProps) {
  // Kendi saglayicisini tasir: bilesen App agacinin disinda (or. testte) render
  // edildiginde Radix saglayici bulamayip hata firlatiyordu.
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            className="-my-1 inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          >
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" align="start" className="max-w-[280px] leading-relaxed">
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface FieldLabelProps {
  children: ReactNode;
  hint?: ReactNode;
  hintLabel?: string;
}

/** Etiket + isteğe bağlı ipucu; kompakt formlarda tekrar eden satır. */
export function FieldLabelRow({ children, hint, hintLabel }: FieldLabelProps) {
  return (
    <div className="flex items-center gap-1">
      {children}
      {hint && <FieldHint label={hintLabel ?? 'Alan hakkında bilgi'}>{hint}</FieldHint>}
    </div>
  );
}
