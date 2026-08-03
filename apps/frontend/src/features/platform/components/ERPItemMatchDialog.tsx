import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Item } from '@/lib/types/item';

interface ERPItemMatchDialogProps {
  open: boolean;
  erpProductName: string;
  items: Item[];
  currentCargoItemId?: string;
  onConfirm: (cargoItemId: string) => void;
  onClose: () => void;
  isPending?: boolean;
}

export function ERPItemMatchDialog({
  open,
  erpProductName,
  items,
  currentCargoItemId,
  onConfirm,
  onClose,
  isPending = false,
}: ERPItemMatchDialogProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(currentCargoItemId ?? null);

  const filtered = items.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()),
  );

  function handleConfirm() {
    if (!selected) return;
    onConfirm(selected);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ürün Eşleştir</DialogTitle>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{erpProductName}</span> için Cargo Pilot
            ürünü seçin.
          </p>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Ürün adı veya SKU ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <ScrollArea className="h-64 rounded-md border">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Ürün bulunamadı</p>
          ) : (
            <div className="p-1">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item.id)}
                  className={cn(
                    'flex w-full flex-col items-start rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent',
                    selected === item.id && 'bg-accent',
                  )}
                >
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground">{item.sku}</span>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            İptal
          </Button>
          <Button onClick={handleConfirm} disabled={!selected || isPending}>
            Onayla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
