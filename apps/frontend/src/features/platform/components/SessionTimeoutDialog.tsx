import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SessionTimeoutDialogProps {
  open: boolean;
  countdown: number;
  onExtend: () => void;
}

export function SessionTimeoutDialog({ open, countdown, onExtend }: SessionTimeoutDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500 shrink-0" />
            <DialogTitle>Oturum Süresi Dolmak Üzere</DialogTitle>
          </div>
          <DialogDescription className="pt-1">
            Oturumunuz 1 dakika içinde sona erecektir. Devam etmek ister misiniz?
          </DialogDescription>
          <p className="text-xs text-muted-foreground tabular-nums">
            Kalan süre: {countdown} saniye
          </p>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onExtend} className="w-full sm:w-auto">
            Oturumu Uzat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
