import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ERP_SETTINGS_ROUTE, ERP_TERM } from '@/lib/config/erpTerms';

interface ErpSyncRequirementsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missing: readonly string[];
}

export function ErpSyncRequirementsDialog({
  open,
  onOpenChange,
  missing,
}: ErpSyncRequirementsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Senkronizasyon için ERP ayarları eksik</DialogTitle>
          <DialogDescription>
            "{ERP_TERM.sync}" işlemi için aşağıdaki bilgiler gerekiyor. Ayarlar ekranında
            tamamladıktan sonra bu ekrana dönüp tekrar deneyin.
          </DialogDescription>
        </DialogHeader>

        <ul className="list-inside list-disc space-y-1 text-sm text-foreground">
          {missing.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button asChild>
            <Link to={ERP_SETTINGS_ROUTE.connection}>{ERP_TERM.connect}</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
