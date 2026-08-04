import { useState } from 'react';
import { AlertTriangle, Loader2, Package, Trash2, UserX } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useERPRemoteUsers,
  useERPUserMappings,
  useCreateERPUserMapping,
  useUpdateERPUserMapping,
  useDeleteERPUserMapping,
  useERPUnassignedData,
  useAssignUnassignedData,
  useERPRoleConflictLog,
} from '@/lib/api/useERPIntegration';
import { useCompanyMembers } from '@/lib/api/useCompanyMembers';
import { useAuthStore, isCompanyAdminRole } from '@/lib/store/useAuthStore';
import type { ErpUserMapping } from '@/lib/types/erp';

// ─── Role conflict detection ──────────────────────────────────────────────────

const ERP_READONLY_PATTERNS = [
  'readonly',
  'read-only',
  'read_only',
  'okuma',
  'izleme',
  'viewer',
  'view',
  'guest',
];

/** Şirket üyesi rolleri (auth rolünden ayrıdır); yazma yetkisi olanlar. */
const CP_WRITE_ROLES = new Set<string>(['admin', 'manager', 'operator']);

function isRoleConflict(erpRole: string | null | undefined, cpRole: string): boolean {
  if (!erpRole) return false;
  const normalized = erpRole.toLowerCase();
  const erpIsReadonly = ERP_READONLY_PATTERNS.some((p) => normalized.includes(p));
  return erpIsReadonly && (CP_WRITE_ROLES as Set<string>).has(cpRole);
}

function conflictTooltipText(erpRole: string, cpRole: string): string {
  return `ERP rolü "${erpRole}", Cargo Pilot rolü "${cpRole}" ile uyuşmuyor. Devam etmek istediğinizden emin misiniz?`;
}

// ─── Delete confirmation dialog ───────────────────────────────────────────────

interface DeleteMappingDialogProps {
  mapping: ErpUserMapping | null;
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
}

function DeleteMappingDialog({ mapping, onConfirm, onClose, isPending }: DeleteMappingDialogProps) {
  return (
    <AlertDialog open={mapping !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eşleştirmeyi Sil</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{mapping?.erpUserName}</strong> ile <strong>{mapping?.cargoUserName}</strong>{' '}
            arasındaki eşleştirme silinecek. İlgili veriler atanmamış kayıtlara taşınacak; hiçbir
            veri kaybolmayacak.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>İptal</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sil
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Role conflict log (admin-only) ──────────────────────────────────────────

function RoleConflictLog() {
  const { data: log, isLoading } = useERPRoleConflictLog();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    );
  }

  if (!log || log.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Rol uyumsuzluğu kaydı bulunmuyor.
      </p>
    );
  }

  return (
    <div className="divide-y text-sm">
      {log.map((entry) => (
        <div key={entry.id} className="grid grid-cols-[1fr_1fr_auto] gap-x-4 gap-y-0.5 py-3">
          <div>
            <p className="font-medium">{entry.erpUserName}</p>
            <p className="text-xs text-muted-foreground">ERP: {entry.erpRole}</p>
          </div>
          <div>
            <p className="font-medium">{entry.cargoUserName}</p>
            <p className="text-xs text-muted-foreground">CP: {entry.cargoUserRole}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{entry.adminName}</p>
            <p className="text-xs text-muted-foreground">
              {format(parseISO(entry.occurredAt), 'dd.MM.yyyy HH:mm', { locale: tr })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ERPUserMapping() {
  const currentUserRole = useAuthStore((s) => s.user?.role);
  const isAdmin = isCompanyAdminRole(currentUserRole);

  const { data: erpUsers, isLoading: isLoadingErp } = useERPRemoteUsers();
  const { data: mappings, isLoading: isLoadingMappings } = useERPUserMappings();
  const { data: cpMembers, isLoading: isLoadingMembers } = useCompanyMembers();
  const { data: unassignedData, isLoading: isLoadingUnassigned } = useERPUnassignedData();

  const { mutate: createMapping, isPending: isCreating } = useCreateERPUserMapping();
  const { mutate: updateMapping, isPending: isUpdating } = useUpdateERPUserMapping();
  const { mutate: deleteMapping, isPending: isDeleting } = useDeleteERPUserMapping();
  const { mutate: assignData, isPending: isAssigning } = useAssignUnassignedData();

  const [deleteTarget, setDeleteTarget] = useState<ErpUserMapping | null>(null);
  const [assignSelections, setAssignSelections] = useState<Record<string, string>>({});
  const [reassignSelections, setReassignSelections] = useState<Record<string, string>>({});

  const isLoading = isLoadingErp || isLoadingMappings || isLoadingMembers;

  const invalidMappings = mappings?.filter((m) => m.isInvalid) ?? [];
  const validMappings = mappings?.filter((m) => !m.isInvalid) ?? [];
  const mappedCpUserIds = new Set(validMappings.map((m) => m.cargoUserId));
  const validMappedErpUserIds = new Set(validMappings.map((m) => m.erpUserId));
  const mappingByErpUser = new Map(validMappings.map((m) => [m.erpUserId, m]));

  function handleSelect(erpUserId: string, cargoUserId: string) {
    const erpUser = erpUsers?.find((u) => u.erpUserId === erpUserId);
    const cpMember = cpMembers?.find((m) => m.id === cargoUserId);
    const hasRoleConflict = isRoleConflict(erpUser?.erpRole, cpMember?.role ?? '');
    createMapping({ erpUserId, cargoUserId, hasRoleConflict });
  }

  function handleReassign(mappingId: string) {
    const newErpUserId = reassignSelections[mappingId];
    if (!newErpUserId) return;
    updateMapping(
      { mappingId, erpUserId: newErpUserId },
      { onSuccess: () => setReassignSelections((s) => ({ ...s, [mappingId]: '' })) },
    );
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteMapping(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
  }

  function handleAssign(dataId: string) {
    const cargoUserId = assignSelections[dataId];
    if (!cargoUserId) return;
    assignData(
      { dataId, cargoUserId },
      { onSuccess: () => setAssignSelections((s) => ({ ...s, [dataId]: '' })) },
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="grid grid-cols-2 gap-4 items-center">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <DeleteMappingDialog
        mapping={deleteTarget}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
        isPending={isDeleting}
      />

      <div className="divide-y divide-border">
        {/* ── Mapping table ── */}
        <div className="space-y-4 pb-6">
          <div>
            <p className="text-sm font-medium text-foreground">Kullanıcı Eşleştirmeleri</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Her ERP kullanıcısı için yalnızca bir Cargo Pilot kullanıcısı seçilebilir.
            </p>
          </div>
          {/* Invalid mappings — shown before the normal list */}
          {invalidMappings.length > 0 && (
            <div className="mb-4 space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-600">
                Geçersiz Eşleştirmeler ({invalidMappings.length})
              </p>
              {invalidMappings.map((inv) => {
                const availableErpUsers = erpUsers?.filter(
                  (u) => !validMappedErpUserIds.has(u.erpUserId),
                );
                return (
                  <div
                    key={inv.id}
                    className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">{inv.erpUserName}</p>
                          <Badge
                            variant="outline"
                            className="text-xs shrink-0 border-amber-400 text-amber-700 bg-amber-50"
                          >
                            Geçersiz Eşleştirme
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Artık ERP'de mevcut değil</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{inv.cargoUserName}</p>
                        {inv.cargoUserEmail && (
                          <p className="text-xs text-muted-foreground truncate">
                            {inv.cargoUserEmail}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Select
                        value={reassignSelections[inv.id] ?? ''}
                        onValueChange={(val) =>
                          setReassignSelections((s) => ({ ...s, [inv.id]: val }))
                        }
                        disabled={isUpdating}
                      >
                        <SelectTrigger className="flex-1 min-w-[180px] bg-white">
                          <SelectValue placeholder="Yeni ERP Kullanıcısı Seç…" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableErpUsers?.length ? (
                            availableErpUsers.map((u) => (
                              <SelectItem key={u.erpUserId} value={u.erpUserId}>
                                {u.erpUserName}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="_none" disabled>
                              Uygun ERP kullanıcısı yok
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>

                      <Button
                        size="sm"
                        disabled={!reassignSelections[inv.id] || isUpdating}
                        onClick={() => handleReassign(inv.id)}
                      >
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Güncelle'}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="border-destructive text-destructive hover:bg-destructive/10"
                        disabled={isDeleting}
                        onClick={() => setDeleteTarget(inv)}
                      >
                        Eşleştirmeyi Kaldır
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mb-3 grid grid-cols-2 gap-4 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <span>ERP Kullanıcısı</span>
            <span>Cargo Pilot Kullanıcısı</span>
          </div>

          {erpUsers && erpUsers.length > 0 ? (
            <div className="divide-y">
              {erpUsers.map((erpUser) => {
                const existing = mappingByErpUser.get(erpUser.erpUserId);
                const conflict =
                  existing?.hasRoleConflict ??
                  (existing
                    ? isRoleConflict(
                        existing.erpRole ?? erpUser.erpRole,
                        existing.cargoUserRole ?? '',
                      )
                    : false);

                return (
                  <div key={erpUser.erpUserId} className="grid grid-cols-2 gap-4 items-center py-3">
                    {/* Left — ERP user info */}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{erpUser.erpUserName}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {erpUser.erpUserEmail && (
                          <p className="text-xs text-muted-foreground truncate">
                            {erpUser.erpUserEmail}
                          </p>
                        )}
                        {erpUser.erpRole && (
                          <Badge variant="outline" className="text-xs h-4 px-1">
                            {erpUser.erpRole}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Right — CP user select or mapped user */}
                    <div className="flex items-center gap-2">
                      {conflict && existing && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 cursor-default" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            {conflictTooltipText(
                              existing.erpRole ?? erpUser.erpRole ?? '—',
                              existing.cargoUserRole ?? '—',
                            )}
                          </TooltipContent>
                        </Tooltip>
                      )}

                      {existing ? (
                        <>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{existing.cargoUserName}</p>
                            {existing.cargoUserEmail && (
                              <p className="text-xs text-muted-foreground truncate">
                                {existing.cargoUserEmail}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTarget(existing)}
                            title="Eşleştirmeyi sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Select
                          disabled={isCreating}
                          onValueChange={(val) => handleSelect(erpUser.erpUserId, val)}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Kullanıcı seçin…" />
                          </SelectTrigger>
                          <SelectContent>
                            {cpMembers?.map((member) => {
                              const alreadyMapped = mappedCpUserIds.has(member.id);
                              const wouldConflict = isRoleConflict(erpUser.erpRole, member.role);
                              return (
                                <SelectItem
                                  key={member.id}
                                  value={member.id}
                                  disabled={alreadyMapped}
                                >
                                  <span className={alreadyMapped ? 'text-muted-foreground' : ''}>
                                    {wouldConflict && !alreadyMapped && (
                                      <AlertTriangle className="inline-block mr-1 h-3 w-3 text-amber-500" />
                                    )}
                                    {member.fullName}
                                    {alreadyMapped && ' (eşleştirilmiş)'}
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <UserX className="mx-auto mb-2 h-8 w-8 opacity-40" />
              ERP sisteminden kullanıcı bulunamadı.
            </div>
          )}
        </div>

        {/* ── Unassigned data ── */}
        <div className="space-y-4 py-6">
          <div>
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              Atanmamış Veriler
              {(unassignedData?.length ?? 0) > 0 && (
                <Badge variant="secondary">{unassignedData!.length}</Badge>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Eşleştirilmemiş ERP kullanıcılarına ait veriler. İstediğiniz zaman bir kullanıcıya
              atayabilirsiniz.
            </p>
          </div>
          {isLoadingUnassigned ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : unassignedData && unassignedData.length > 0 ? (
            <div className="divide-y">
              {unassignedData.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr_auto_auto] gap-3 items-center py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs shrink-0">
                        {item.entityType === 'Product' ? 'Ürün' : 'Sevkiyat'}
                      </Badge>
                      <p className="text-sm font-medium truncate">{item.entityName}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      ERP: {item.erpUserName} ·{' '}
                      {format(parseISO(item.occurredAt), 'dd.MM.yyyy HH:mm', { locale: tr })}
                    </p>
                  </div>

                  <Select
                    value={assignSelections[item.id] ?? ''}
                    onValueChange={(val) => setAssignSelections((s) => ({ ...s, [item.id]: val }))}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Kullanıcı seçin…" />
                    </SelectTrigger>
                    <SelectContent>
                      {cpMembers?.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    size="sm"
                    disabled={!assignSelections[item.id] || isAssigning}
                    onClick={() => handleAssign(item.id)}
                  >
                    {isAssigning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ata'}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Package className="mx-auto mb-2 h-8 w-8 opacity-40" />
              Atanmamış veri bulunmuyor.
            </div>
          )}
        </div>

        {/* ── Role conflict log (admin-only) ── */}
        {isAdmin && (
          <div className="space-y-4 pt-6">
            <div>
              <p className="text-sm font-medium text-foreground">Rol Uyumsuzluğu Günlüğü</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Rol çakışmasına rağmen kaydedilen eşleştirme geçmişi. Yalnızca Firma Yöneticisi
                görüntüleyebilir.
              </p>
            </div>
            <RoleConflictLog />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
