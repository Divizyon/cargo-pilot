import { useState } from 'react';
import { AlertTriangle, Loader2, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useCompanyMembers,
  useUpdateMemberRole,
  useRemoveMemberAccess,
  type CompanyMember,
} from '@/lib/api/useCompanyMembers';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useSubscriptionStore } from '@/lib/store/useSubscriptionStore';
import { PLAN_MAX_MEMBERS } from '@/lib/config/plan-features';
import { AddMemberDialog } from '@/features/platform/components/AddMemberDialog';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Yönetici',
  viewer: 'Görüntüleyici',
  operator: 'Operatör',
};

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-primary/10 text-primary',
  manager: 'bg-amber-500/10 text-amber-600',
  viewer: 'bg-muted text-muted-foreground',
  operator: 'bg-emerald-500/10 text-emerald-700',
};

const ROLE_OPTIONS: { value: CompanyMember['role']; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'operator', label: 'Operatör' },
  { value: 'manager', label: 'Yönetici' },
  { value: 'viewer', label: 'Görüntüleyici' },
];

interface CompanyMembersTableProps {
  onNavigateToBilling: () => void;
}

const LAST_ADMIN_ERROR = 'Firmada en az bir admin bulunması zorunludur.';

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
          {['w-36', 'w-48', 'w-24', 'w-20', 'w-8'].map((w, i) => (
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
              <Skeleton className="h-7 w-28 rounded-full" />
            </TableCell>
            <TableCell className="px-3 py-0">
              <Skeleton className="h-4 w-12 rounded-full" />
            </TableCell>
            <TableCell className="px-3 py-0">
              <Skeleton className="h-7 w-7 rounded-md" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function CompanyMembersTable({ onNavigateToBilling }: CompanyMembersTableProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

  const { data: members, isLoading } = useCompanyMembers();
  const updateRoleMutation = useUpdateMemberRole();
  const removeMutation = useRemoveMemberAccess();

  const currentUserId = useAuthStore((s) => s.user?.id);
  const currentUserRole = useAuthStore((s) => s.user?.role);
  const currentPlan = useSubscriptionStore((s) => s.plan);

  const isCurrentUserAdmin = currentUserRole === 'admin';
  const memberCount = members?.length ?? 0;
  const maxMembers = PLAN_MAX_MEMBERS[currentPlan];
  const isAtLimit = memberCount >= maxMembers;

  const adminCount = members?.filter((m) => m.role === 'admin').length ?? 0;

  function isLastAdmin(member: CompanyMember) {
    return member.role === 'admin' && adminCount === 1;
  }

  function handleRoleChange(member: CompanyMember, newRole: CompanyMember['role']) {
    if (newRole === member.role) return;
    if (isLastAdmin(member)) {
      toast.error(LAST_ADMIN_ERROR, { position: 'bottom-right' });
      return;
    }
    updateRoleMutation.mutate(
      { id: member.id, role: newRole },
      {
        onSuccess: () =>
          toast.success(`${member.fullName} rolü güncellendi.`, { position: 'bottom-right' }),
        onError: () =>
          toast.error('Rol güncellenirken bir hata oluştu.', { position: 'bottom-right' }),
      },
    );
  }

  function handleRemoveClick(member: CompanyMember) {
    if (isLastAdmin(member)) {
      toast.error(LAST_ADMIN_ERROR, { position: 'bottom-right' });
      return;
    }
    setPendingRemoveId(member.id);
  }

  function confirmRemove() {
    if (!pendingRemoveId) return;
    const target = members?.find((m) => m.id === pendingRemoveId);
    removeMutation.mutate(pendingRemoveId, {
      onSuccess: () => {
        toast.success(`${target?.fullName ?? 'Kullanıcı'} erişimi kaldırıldı.`, {
          position: 'bottom-right',
        });
        setPendingRemoveId(null);
      },
      onError: () => {
        toast.error('Erişim kaldırılırken bir hata oluştu.', { position: 'bottom-right' });
        setPendingRemoveId(null);
      },
    });
  }

  const pendingRemoveMember = members?.find((m) => m.id === pendingRemoveId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-1.5">
            <p className="text-sm font-semibold text-foreground">Firma Çalışanları</p>
            {!isLoading && (
              <span className="text-xs text-muted-foreground">({memberCount} kullanıcı)</span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Firmanızdaki tüm aktif ve pasif kullanıcılar.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setAddDialogOpen(true)}
          disabled={isAtLimit || !isCurrentUserAdmin}
          className="gap-1.5"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Kullanıcı Ekle
        </Button>
      </div>

      {isAtLimit && !isLoading && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Plan limitinize ulaştınız.{' '}
            <button
              type="button"
              className="font-semibold underline underline-offset-2 hover:opacity-80"
              onClick={onNavigateToBilling}
            >
              Planınızı yükseltin.
            </button>
          </span>
        </div>
      )}

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
                <TableHead className="w-32 px-3 py-0 text-[10px] font-semibold uppercase tracking-widest">
                  Rol
                </TableHead>
                <TableHead className="w-24 px-3 py-0 text-[10px] font-semibold uppercase tracking-widest">
                  Durum
                </TableHead>
                {isCurrentUserAdmin && <TableHead className="w-12 px-3 py-0" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {!members?.length ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={isCurrentUserAdmin ? 5 : 4}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    Firma çalışanı bulunamadı.
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => {
                  const isMe = member.id === currentUserId;
                  const isRoleUpdating =
                    updateRoleMutation.isPending && updateRoleMutation.variables?.id === member.id;
                  const isRemoving =
                    removeMutation.isPending && removeMutation.variables === member.id;

                  return (
                    <TableRow key={member.id} className={cn('h-12', isMe && 'bg-muted/30')}>
                      <TableCell className="px-3 py-0">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                            {getInitials(member.fullName)}
                          </div>
                          <div className="flex min-w-0 items-center gap-1.5">
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
                        {isCurrentUserAdmin ? (
                          <div className="relative w-fit">
                            <Select
                              value={member.role}
                              onValueChange={(v) =>
                                handleRoleChange(member, v as CompanyMember['role'])
                              }
                              disabled={isRoleUpdating}
                            >
                              <SelectTrigger
                                className={cn(
                                  'h-6 w-auto gap-1 rounded-full border-0 px-2 py-0 text-[10px] font-semibold focus:ring-0 focus:ring-offset-0',
                                  ROLE_STYLES[member.role] ?? 'bg-muted text-muted-foreground',
                                )}
                              >
                                {isRoleUpdating ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <SelectValue />
                                )}
                              </SelectTrigger>
                              <SelectContent>
                                {ROLE_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                              ROLE_STYLES[member.role] ?? 'bg-muted text-muted-foreground',
                            )}
                          >
                            {ROLE_LABELS[member.role] ?? member.role}
                          </span>
                        )}
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

                      {isCurrentUserAdmin && (
                        <TableCell className="px-3 py-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveClick(member)}
                            disabled={isRemoving}
                            aria-label={`${member.fullName} erişimini kaldır`}
                          >
                            {isRemoving ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <AddMemberDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />

      <AlertDialog
        open={pendingRemoveId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemoveId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Erişimi Kaldır</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{pendingRemoveMember?.fullName}</strong> adlı kullanıcının platforma erişimi
              kaldırılacak ve tüm aktif oturumları sonlandırılacak. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMutation.isPending}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmRemove}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Kaldırılıyor...
                </>
              ) : (
                'Erişimi Kaldır'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
