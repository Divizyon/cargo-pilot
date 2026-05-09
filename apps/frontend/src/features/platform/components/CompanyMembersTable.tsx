import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useCompanyMembers } from '@/lib/api/useCompanyMembers';
import { useAuthStore } from '@/lib/store/useAuthStore';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Yönetici',
  viewer: 'Görüntüleyici',
};

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-primary/10 text-primary',
  manager: 'bg-amber-500/10 text-amber-600',
  viewer: 'bg-muted text-muted-foreground',
};

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function MembersTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          {['w-36', 'w-48', 'w-24', 'w-20'].map((w, i) => (
            <TableHead key={i}>
              <Skeleton className={cn('h-3', w)} />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRow key={i} className="h-12 hover:bg-transparent">
            <TableCell className="px-3 py-0">
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-3 w-28" />
              </div>
            </TableCell>
            <TableCell className="px-3 py-0">
              <Skeleton className="h-3 w-40" />
            </TableCell>
            <TableCell className="px-3 py-0">
              <Skeleton className="h-5 w-20 rounded-full" />
            </TableCell>
            <TableCell className="px-3 py-0">
              <Skeleton className="h-4 w-12 rounded-full" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function CompanyMembersTable() {
  const { data: members, isLoading } = useCompanyMembers();
  const currentUserId = useAuthStore((s) => s.user?.id);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background">
      {isLoading ? (
        <MembersTableSkeleton />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="h-9 bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-48 px-3 py-0 text-[10px] font-semibold uppercase tracking-widest">
                Ad Soyad
              </TableHead>
              <TableHead className="px-3 py-0 text-[10px] font-semibold uppercase tracking-widest">
                E-posta
              </TableHead>
              <TableHead className="w-28 px-3 py-0 text-[10px] font-semibold uppercase tracking-widest">
                Rol
              </TableHead>
              <TableHead className="w-24 px-3 py-0 text-[10px] font-semibold uppercase tracking-widest">
                Durum
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!members?.length ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="py-12 text-center text-sm text-muted-foreground">
                  Firma çalışanı bulunamadı.
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => {
                const isMe = member.id === currentUserId;
                return (
                  <TableRow key={member.id} className={cn('h-12', isMe && 'bg-muted/30')}>
                    <TableCell className="px-3 py-0">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                          {getInitials(member.fullName)}
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="truncate text-xs font-medium text-foreground">
                            {member.fullName}
                          </span>
                          {isMe && (
                            <span className="shrink-0 rounded bg-primary/10 px-1 py-0.5 text-[9px] font-semibold text-primary">
                              Siz
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-0">
                      <span className="text-xs text-muted-foreground">{member.email}</span>
                    </TableCell>
                    <TableCell className="px-3 py-0">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          ROLE_STYLES[member.role],
                        )}
                      >
                        {ROLE_LABELS[member.role] ?? member.role}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-0">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-xs',
                          member.isActive ? 'text-emerald-600' : 'text-muted-foreground',
                        )}
                      >
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            member.isActive ? 'bg-emerald-500' : 'bg-muted-foreground',
                          )}
                        />
                        {member.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
