import { format } from 'date-fns';
import { Link2, Trash2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useShareLinks, useDeleteShareLink } from '@/lib/api/useShareLinks';
import type { ShareLink } from '@/lib/types/share';

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Süresiz';
  try {
    return format(new Date(dateStr), 'dd.MM.yyyy HH:mm');
  } catch {
    return '—';
  }
}

const VALIDITY_LABELS: Record<string, string> = {
  '24h': '24 Saat',
  '7d': '7 Gün',
  unlimited: 'Süresiz',
};

function ShareLinkRow({ link }: { link: ShareLink }) {
  const { mutate: deleteLink, isPending } = useDeleteShareLink();

  return (
    <TableRow>
      <TableCell className="font-medium text-sm max-w-[180px] truncate">{link.planName}</TableCell>
      <TableCell className="text-xs text-zinc-500">{formatDate(link.createdAt)}</TableCell>
      <TableCell>
        <span className="text-xs">{VALIDITY_LABELS[link.validity] ?? link.validity}</span>
      </TableCell>
      <TableCell className="text-xs text-zinc-500">{formatDate(link.expiresAt)}</TableCell>
      <TableCell className="text-center text-sm">{link.viewCount}</TableCell>
      <TableCell>
        {link.isExpired ? (
          <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50 text-[10px]">
            Süresi Doldu
          </Badge>
        ) : (
          <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-[10px]">
            Aktif
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-zinc-400 hover:text-rose-600"
          onClick={() => deleteLink(link.id)}
          disabled={isPending}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function ShareLinksManager() {
  const { data: links = [], isLoading, isError } = useShareLinks();

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-zinc-50">
      <div className="px-6 py-5 border-b border-zinc-200 bg-white">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-zinc-600" />
          <h1 className="text-xl font-semibold text-zinc-900">Paylaşım Bağlantıları</h1>
        </div>
        <p className="text-sm text-zinc-500 mt-1">
          Tüm aktif ve süresi dolmuş paylaşım bağlantılarını görüntüleyin ve yönetin.
        </p>
      </div>

      <div className="flex-1 px-6 py-6">
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <XCircle className="w-8 h-8 text-zinc-300 mb-2" />
            <p className="text-sm text-zinc-500">Paylaşım bağlantıları yüklenemedi.</p>
            <p className="text-xs text-zinc-400 mt-1">
              Bu özellik için backend desteği bekleniyor.
            </p>
          </div>
        )}

        {!isLoading && !isError && links.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Link2 className="w-8 h-8 text-zinc-300 mb-2" />
            <p className="text-sm text-zinc-500">Henüz paylaşım bağlantısı oluşturulmamış.</p>
          </div>
        )}

        {!isLoading && !isError && links.length > 0 && (
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="text-xs text-zinc-500">
                  <TableHead>Plan</TableHead>
                  <TableHead>Oluşturulma</TableHead>
                  <TableHead>Süre</TableHead>
                  <TableHead>Bitiş</TableHead>
                  <TableHead className="text-center">Görüntüleme</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map((link) => (
                  <ShareLinkRow key={link.id} link={link} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
