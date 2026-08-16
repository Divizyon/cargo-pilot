import { useRef, useState, type ChangeEvent } from 'react';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { Download, FileUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useCreateVehicle } from '@/lib/api/useVehicles';
import { downloadVehicleImportTemplate } from '@/lib/utils/export/export-utils';
import { DoorType, DoorFace, type VehicleDoor } from '@/lib/types/vehicle';

interface VehicleBulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Row model ─────────────────────────────────────────────────────────────────

const VEHICLE_TYPE_OPTIONS = ['Tir', 'Kamyon', 'Kamposet', 'Konteyner'] as const;
const VEHICLE_TYPE_LABELS: Record<string, string> = {
  Tir: 'Tır',
  Kamyon: 'Kamyon',
  Kamposet: 'Römork',
  Konteyner: 'Konteyner',
};
// Kapı kümesi tek sütunda taşınır; seçenekler formdaki geçerli beş
// kombinasyonun aynısıdır (docs/COORDINATE_STANDARD.md §4).
const DOOR_SET_OPTIONS = ['small', 'small+left', 'small+right', 'left', 'right'] as const;

type DoorSetKey = (typeof DOOR_SET_OPTIONS)[number];

const DOOR_SET_LABELS: Record<string, string> = {
  small: 'Küçük kapı',
  'small+left': 'Küçük ve büyük kapı (sol)',
  'small+right': 'Küçük ve büyük kapı (sağ)',
  left: 'Büyük kapı (sol)',
  right: 'Büyük kapı (sağ)',
};

const DOOR_SET_TO_DOORS: Record<DoorSetKey, VehicleDoor[]> = {
  small: [{ type: DoorType.Small, face: DoorFace.LengthZ }],
  'small+left': [
    { type: DoorType.Small, face: DoorFace.LengthZ },
    { type: DoorType.Big, face: DoorFace.ZeroX },
  ],
  'small+right': [
    { type: DoorType.Small, face: DoorFace.LengthZ },
    { type: DoorType.Big, face: DoorFace.WidthX },
  ],
  left: [{ type: DoorType.Big, face: DoorFace.ZeroX }],
  right: [{ type: DoorType.Big, face: DoorFace.WidthX }],
};

const editableRowSchema = z.object({
  _id: z.string(),
  vehicleType: z.string(),
  name: z.string(),
  plate: z.string(),
  serialNumber: z.string(),
  length: z.string(),
  width: z.string(),
  height: z.string(),
  maxCargoWeight: z.string(),
  doorSet: z.string(),
});

type EditableRow = z.infer<typeof editableRowSchema>;

type RowErrors = Partial<
  Record<
    | 'vehicleType'
    | 'name'
    | 'plate'
    | 'serialNumber'
    | 'length'
    | 'width'
    | 'height'
    | 'maxCargoWeight'
    | 'doorSet',
    string
  >
>;

// ─── Validation ─────────────────────────────────────────────────────────────────

function validateRow(row: EditableRow): RowErrors {
  const e: RowErrors = {};
  if (!VEHICLE_TYPE_OPTIONS.includes(row.vehicleType as (typeof VEHICLE_TYPE_OPTIONS)[number])) {
    e.vehicleType = 'Tır / Kamyon / Kamposet / Konteyner';
  }
  if (!row.name.trim()) e.name = 'Zorunlu alan';
  if (row.vehicleType !== 'Konteyner' && !row.plate.trim())
    e.plate = 'Zorunlu alan (Konteyner hariç)';
  if (row.vehicleType === 'Konteyner' && !row.serialNumber.trim())
    e.serialNumber = 'Zorunlu alan (Konteyner)';
  if (!row.length || Number(row.length) <= 0) e.length = 'Pozitif sayı';
  if (!row.width || Number(row.width) <= 0) e.width = 'Pozitif sayı';
  if (!row.height || Number(row.height) <= 0) e.height = 'Pozitif sayı';
  if (!row.maxCargoWeight || Number(row.maxCargoWeight) <= 0) e.maxCargoWeight = 'Pozitif sayı';
  if (!DOOR_SET_OPTIONS.includes(row.doorSet as DoorSetKey)) {
    e.doorSet = 'küçük / küçük+sol / küçük+sağ / sol / sağ';
  }
  return e;
}

// ─── Parsing ─────────────────────────────────────────────────────────────────

const TYPE_MAP: Record<string, string> = {
  tır: 'Tir',
  tir: 'Tir',
  kamyon: 'Kamyon',
  kamposet: 'Kamposet',
  konteyner: 'Konteyner',
};

function normalizeType(raw: unknown): string {
  const s = String(raw ?? '')
    .toLowerCase()
    .trim();
  return TYPE_MAP[s] ?? String(raw ?? '');
}

const DOOR_SET_ALIASES: Record<string, DoorSetKey> = {
  // Standart yazım: kapı tipi boyuta göre, büyük kapıda taraf ayrı.
  küçük: 'small',
  kucuk: 'small',
  small: 'small',
  'küçük+sol': 'small+left',
  'kucuk+sol': 'small+left',
  'küçük + sol': 'small+left',
  'küçük+sağ': 'small+right',
  'kucuk+sag': 'small+right',
  'küçük + sağ': 'small+right',
  sol: 'left',
  left: 'left',
  sağ: 'right',
  sag: 'right',
  right: 'right',

  // Eski şablonların yön adları. Tanınmasalardı satır sessizce varsayılana
  // düşüyordu; büyük kapılı araç filo dosyasından küçük kapılı olarak içeri
  // giriyordu (denetim S-27).
  arka: 'small',
  rear: 'small',
  'arka+sol': 'small+left',
  'arka + sol': 'small+left',
  'rear+left': 'small+left',
  'arka+sağ': 'small+right',
  'arka + sağ': 'small+right',
  'arka+sag': 'small+right',
  'rear+right': 'small+right',
  yan: 'small+right',
  side: 'small+right',
  'arka + yan': 'small+right',
  'arka+yan': 'small+right',
  rearandside: 'small+right',

  // Taraf belirtilmemiş "küçük + büyük" yazımı: standardın varsayılanı olan
  // origin'e değmeyen yüz (sağ) uygulanır — DEFAULT_BIG_DOOR_FACE ile aynı.
  'küçük + büyük': 'small+right',
  'küçük+büyük': 'small+right',
  üst: 'small',
  ust: 'small',
  top: 'small',
};

/**
 * Şablon değerini geçerli anahtara çevirir.
 *
 * Tanınmayan değer olduğu gibi geri döner ve `validateRow` onu hata olarak
 * işaretler. Eskiden `?? 'arka'` ile sessizce varsayılana düşüyordu, yani
 * yanlış yazılmış bir sütun kullanıcıya hiç gösterilmeden kabul ediliyordu.
 */
function normalizeDoorSet(raw: unknown): string {
  const s = String(raw ?? '')
    .toLowerCase()
    .trim();
  return DOOR_SET_ALIASES[s] ?? String(raw ?? '');
}

function xlsxToRows(ws: XLSX.WorkSheet): EditableRow[] {
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
  return raw.map((r) =>
    editableRowSchema.parse({
      _id: crypto.randomUUID(),
      vehicleType: normalizeType(
        r['Araç Tipi (Tır/Kamyon/Kamposet/Konteyner)'] ?? r['Araç Tipi'] ?? '',
      ),
      name: String(r['Araç Adı'] ?? ''),
      plate: String(r['Plaka (Tır/Kamyon/Kamposet için zorunlu)'] ?? r['Plaka'] ?? ''),
      serialNumber: String(r['Seri No (Konteyner için zorunlu)'] ?? r['Seri No'] ?? ''),
      length: String(r['Uzunluk (cm)'] ?? ''),
      width: String(r['Genişlik (cm)'] ?? ''),
      height: String(r['Yükseklik (cm)'] ?? ''),
      maxCargoWeight: String(r['Maks Yük (kg)'] ?? ''),
      // Eski şablonun "Kapı Yönü" sütunu da okunur; boş bırakılan hücre
      // varsayılana düşer ama tanınmayan bir DEĞER hata olarak gösterilir.
      doorSet: normalizeDoorSet(
        r['Kapılar (küçük/küçük+sol/küçük+sağ/sol/sağ)'] ??
          r['Kapılar (arka/arka+sol/arka+sağ/sol/sağ)'] ??
          r['Kapılar'] ??
          r['Kapı Yönü (rear/side/top/rearAndSide)'] ??
          r['Kapı Yönü'] ??
          'küçük',
      ),
    }),
  );
}

function emptyRow(): EditableRow {
  return editableRowSchema.parse({
    _id: crypto.randomUUID(),
    vehicleType: 'Tir',
    name: '',
    plate: '',
    serialNumber: '',
    length: '',
    width: '',
    height: '',
    maxCargoWeight: '',
    doorSet: 'small',
  });
}

// ─── Cell components ──────────────────────────────────────────────────────────

interface TextCellProps {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
}

function TextCell({ value, onChange, error, type = 'text' }: TextCellProps) {
  return (
    <Input
      type={type}
      value={value}
      title={error}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'h-7 min-w-0 rounded border px-1.5 text-xs',
        error
          ? 'border-destructive bg-destructive/5 text-destructive focus-visible:ring-destructive/30'
          : 'border-border bg-background focus-visible:ring-primary/20',
      )}
    />
  );
}

// ─── Main dialog ──────────────────────────────────────────────────────────────

export function VehicleBulkImportDialog({ open, onOpenChange }: VehicleBulkImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const createVehicle = useCreateVehicle();

  function patchRow(id: string, patch: Partial<EditableRow>) {
    setRows((prev) => prev.map((r) => (r._id === id ? { ...r, ...patch } : r)));
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: 'array' });
      setRows(xlsxToRows(wb.Sheets[wb.SheetNames[0]]));
      setImportErrors([]);
    };
    reader.readAsArrayBuffer(file);
    if (e.target) e.target.value = '';
  }

  async function handleImport() {
    const hasClientErrors = rows.some((r) => Object.keys(validateRow(r)).length > 0);
    if (hasClientErrors || rows.length === 0) return;
    setImportErrors([]);
    setIsImporting(true);

    const errors: string[] = [];
    for (const row of rows) {
      await new Promise<void>((resolve) => {
        createVehicle.mutate(
          {
            vehicleType: row.vehicleType as 'Tir' | 'Kamyon' | 'Kamposet' | 'Konteyner',
            name: row.name.trim(),
            description: undefined,
            plate: row.vehicleType !== 'Konteyner' ? row.plate.trim() : undefined,
            serialNumber: row.vehicleType === 'Konteyner' ? row.serialNumber.trim() : undefined,
            length: Number(row.length),
            width: Number(row.width),
            height: Number(row.height),
            maxCargoWeight: Number(row.maxCargoWeight),
            doors: DOOR_SET_TO_DOORS[row.doorSet as DoorSetKey],
            // Şablon sütunları cm/kg etiketli, yani satırlar zaten kayıt
            // biriminde. Bu bayrak olmadan `buildCreateVehiclePayload` değerleri
            // kullanıcının görüntü birimiyle bir daha çeviriyordu: mm+ton ayarlı
            // kullanıcıda 1360 cm'lik dorse 136 cm, 26.000 kg 26.000.000 kg
            // olarak kaydediliyordu (S-10).
            unitsAreStorage: true,
          },
          {
            onSuccess: () => resolve(),
            onError: () => {
              errors.push(`"${row.name}" eklenemedi.`);
              resolve();
            },
          },
        );
      });
    }

    setIsImporting(false);
    if (errors.length > 0) {
      setImportErrors(errors);
    } else {
      handleClose();
    }
  }

  function handleClose() {
    onOpenChange(false);
    setRows([]);
    setImportErrors([]);
    setIsImporting(false);
  }

  const validations = rows.map((r) => ({ id: r._id, errors: validateRow(r) }));
  const errorRowCount = validations.filter((v) => Object.keys(v.errors).length > 0).length;
  const canImport = rows.length > 0 && errorRowCount === 0 && !isImporting;

  // ─── Empty state ──────────────────────────────────────────────────────────

  if (rows.length === 0) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Toplu Araç İçe Aktar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Excel şablonunu indirin, doldurun ve yükleyin. Yüklenen veriler düzenlenebilir tabloda
              gösterilir.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs"
              onClick={downloadVehicleImportTemplate}
              type="button"
            >
              <Download className="h-3.5 w-3.5" />
              Şablonu İndir
            </Button>
            <div
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-4 py-10 transition-colors hover:bg-muted/50"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Excel veya CSV dosyası seçin</p>
              <p className="text-xs text-muted-foreground">ya da sürükleyip bırakın</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={handleClose} type="button">
                İptal
              </Button>
              <Button
                size="sm"
                type="button"
                onClick={() => setRows([emptyRow()])}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Dosya Ekle
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ─── Table state ──────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex h-[78vh] w-[95vw] max-w-[1100px] flex-col gap-0 overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="flex-none border-b px-6 py-4 pr-14">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Toplu Araç İçe Aktar</DialogTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Hücreleri tıklayarak doğrudan düzenleyin. Kırmızı alanları düzeltin, ardından içe
                aktarın.
              </p>
            </div>
            <div className="mr-4">
              {errorRowCount > 0 ? (
                <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
                  {errorRowCount} satırda hata var
                </span>
              ) : (
                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                  {rows.length} satır hazır
                </span>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* API errors */}
        {importErrors.length > 0 && (
          <div className="flex-none border-b border-destructive/20 bg-destructive/5 px-6 py-2">
            <p className="mb-1 text-xs font-semibold text-destructive">
              {importErrors.length} araç eklenemedi:
            </p>
            <ul className="list-inside list-disc space-y-0.5">
              {importErrors.map((e, i) => (
                <li key={i} className="text-xs text-destructive">
                  {e}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Scrollable table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full table-fixed border-separate border-spacing-0 text-xs">
            <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur-sm">
              <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="w-7 border-b px-1 py-1.5 text-center">#</th>
                <th className="w-[12%] whitespace-nowrap border-b px-2 py-1.5">Tip *</th>
                <th className="w-[15%] whitespace-nowrap border-b px-2 py-1.5">Araç Adı *</th>
                <th className="w-[11%] whitespace-nowrap border-b px-2 py-1.5">Plaka</th>
                <th className="w-[10%] whitespace-nowrap border-b px-2 py-1.5">Seri No</th>
                <th className="w-[8%] whitespace-nowrap border-b px-2 py-1.5">Uzunluk *</th>
                <th className="w-[8%] whitespace-nowrap border-b px-2 py-1.5">Genişlik *</th>
                <th className="w-[8%] whitespace-nowrap border-b px-2 py-1.5">Yükseklik *</th>
                <th className="w-[9%] whitespace-nowrap border-b px-2 py-1.5">Maks Yük *</th>
                <th className="w-[13%] whitespace-nowrap border-b px-2 py-1.5">Kapılar *</th>
                <th className="w-8 border-b px-1 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const errs = validations.find((v) => v.id === row._id)?.errors ?? {};
                const hasRowError = Object.keys(errs).length > 0;
                return (
                  <tr
                    key={row._id}
                    className={cn(
                      'transition-colors',
                      hasRowError ? 'bg-destructive/[0.04]' : 'hover:bg-muted/30',
                    )}
                  >
                    <td className="border-b border-border/40 px-1 py-0.5 text-center text-[10px] text-muted-foreground">
                      {idx + 1}
                    </td>

                    {/* Tip */}
                    <td className="border-b border-border/40 px-2 py-0.5">
                      <Select
                        value={row.vehicleType}
                        onValueChange={(v) => patchRow(row._id, { vehicleType: v })}
                      >
                        <SelectTrigger
                          className={cn(
                            'h-7 border px-1 text-xs',
                            errs.vehicleType
                              ? 'border-destructive bg-destructive/5 text-destructive'
                              : 'border-border bg-background',
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VEHICLE_TYPE_OPTIONS.map((t) => (
                            <SelectItem key={t} value={t}>
                              {VEHICLE_TYPE_LABELS[t]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>

                    {/* Araç Adı */}
                    <td className="border-b border-border/40 px-2 py-0.5">
                      <TextCell
                        value={row.name}
                        onChange={(v) => patchRow(row._id, { name: v })}
                        error={errs.name}
                      />
                    </td>

                    {/* Plaka */}
                    <td className="border-b border-border/40 px-2 py-0.5">
                      <TextCell
                        value={row.plate}
                        onChange={(v) => patchRow(row._id, { plate: v })}
                        error={errs.plate}
                      />
                    </td>

                    {/* Seri No */}
                    <td className="border-b border-border/40 px-2 py-0.5">
                      <TextCell
                        value={row.serialNumber}
                        onChange={(v) => patchRow(row._id, { serialNumber: v })}
                        error={errs.serialNumber}
                      />
                    </td>

                    {/* Uzunluk */}
                    <td className="border-b border-border/40 px-2 py-0.5">
                      <TextCell
                        value={row.length}
                        onChange={(v) => patchRow(row._id, { length: v })}
                        error={errs.length}
                        type="number"
                      />
                    </td>

                    {/* Genişlik */}
                    <td className="border-b border-border/40 px-2 py-0.5">
                      <TextCell
                        value={row.width}
                        onChange={(v) => patchRow(row._id, { width: v })}
                        error={errs.width}
                        type="number"
                      />
                    </td>

                    {/* Yükseklik */}
                    <td className="border-b border-border/40 px-2 py-0.5">
                      <TextCell
                        value={row.height}
                        onChange={(v) => patchRow(row._id, { height: v })}
                        error={errs.height}
                        type="number"
                      />
                    </td>

                    {/* Maks Yük */}
                    <td className="border-b border-border/40 px-2 py-0.5">
                      <TextCell
                        value={row.maxCargoWeight}
                        onChange={(v) => patchRow(row._id, { maxCargoWeight: v })}
                        error={errs.maxCargoWeight}
                        type="number"
                      />
                    </td>

                    {/* Kapılar */}
                    <td className="border-b border-border/40 px-2 py-0.5">
                      <Select
                        value={row.doorSet}
                        onValueChange={(v) => patchRow(row._id, { doorSet: v })}
                      >
                        <SelectTrigger
                          className={cn(
                            'h-7 border px-1 text-xs',
                            errs.doorSet
                              ? 'border-destructive bg-destructive/5 text-destructive'
                              : 'border-border bg-background',
                          )}
                        >
                          <SelectValue>{DOOR_SET_LABELS[row.doorSet] ?? row.doorSet}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {DOOR_SET_OPTIONS.map((d) => (
                            <SelectItem key={d} value={d}>
                              {DOOR_SET_LABELS[d]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>

                    {/* Sil */}
                    <td className="border-b border-border/40 px-1 py-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Satırı sil"
                        onClick={() => setRows((p) => p.filter((r) => r._id !== row._id))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex flex-none items-center justify-between border-t bg-background px-6 py-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs"
              type="button"
              onClick={() => setRows((p) => [...p, emptyRow()])}
            >
              <Plus className="h-3.5 w-3.5" />
              Satır Ekle
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs"
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp className="h-3.5 w-3.5" />
              Dosya Değiştir
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs"
              type="button"
              onClick={downloadVehicleImportTemplate}
            >
              <Download className="h-3.5 w-3.5" />
              Şablonu İndir
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleClose} type="button">
              İptal
            </Button>
            <Button size="sm" onClick={handleImport} disabled={!canImport} type="button">
              {isImporting ? 'Yükleniyor…' : `${rows.length} Araç Ekle`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
