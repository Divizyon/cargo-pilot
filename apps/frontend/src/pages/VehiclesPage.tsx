import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Download, SlidersHorizontal, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VehicleListTable } from '@/features/data-management/components/VehicleListTable';
import { VehicleDeleteDialog } from '@/features/data-management/components/VehicleDeleteDialog';
import { VehicleDetailPanel } from '@/features/data-management/components/VehicleDetailPanel';
import { cn } from '@/lib/utils';
import type { Vehicle, VehicleType } from '@/lib/types/vehicle';

const MOCK_VEHICLES: Vehicle[] = [
  {
    id: '11111111-0000-0000-0000-000000000001',
    name: 'Volvo FH16',
    vehicleType: 'Tir',
    plate: '34 ABC 001',
    length: 1360, width: 240, height: 270,
    maxCargoWeight: 24000,
    doorDirection: 'rear',
    isFavorite: false, isActive: true, isDeleted: false,
    status: 'active',
    createdAt: '2025-01-12T09:00:00.000Z',
    createdBy: { id: 'u1', fullName: 'Ahmet Yılmaz' },
  },
  {
    id: '11111111-0000-0000-0000-000000000002',
    name: 'Mercedes Actros',
    vehicleType: 'Kamyon',
    plate: '34 DEF 002',
    length: 720, width: 235, height: 250,
    maxCargoWeight: 12000,
    doorDirection: 'rear',
    isFavorite: false, isActive: true, isDeleted: false,
    status: 'active',
    createdAt: '2025-02-18T09:00:00.000Z',
    createdBy: { id: 'u1', fullName: 'Ahmet Yılmaz' },
  },
  {
    id: '11111111-0000-0000-0000-000000000003',
    name: '20ft Standart',
    vehicleType: 'Konteyner',
    serialNumber: 'CSQU3054383',
    length: 590, width: 235, height: 239,
    maxCargoWeight: 21700,
    doorDirection: 'rear',
    isFavorite: false, isActive: true, isDeleted: false,
    status: 'active',
    createdAt: '2025-03-03T09:00:00.000Z',
    createdBy: { id: 'u1', fullName: 'Ahmet Yılmaz' },
  },
  {
    id: '11111111-0000-0000-0000-000000000004',
    name: '40ft Standart',
    vehicleType: 'Konteyner',
    serialNumber: 'MSCU1234567',
    length: 1203, width: 235, height: 239,
    maxCargoWeight: 26500,
    doorDirection: 'rear',
    isFavorite: false, isActive: true, isDeleted: false,
    status: 'active',
    createdAt: '2025-03-03T10:00:00.000Z',
    createdBy: { id: 'u1', fullName: 'Ahmet Yılmaz' },
  },
  {
    id: '11111111-0000-0000-0000-000000000005',
    name: 'Schmitz Cargobull',
    vehicleType: 'Romork',
    plate: '06 GHI 005',
    length: 1360, width: 248, height: 270,
    maxCargoWeight: 27000,
    doorDirection: 'side',
    doorSide: 'right',
    isFavorite: false, isActive: true, isDeleted: false,
    status: 'active',
    createdAt: '2025-03-27T09:00:00.000Z',
    createdBy: { id: 'u2', fullName: 'Sena Durmuş' },
  },
  {
    id: '11111111-0000-0000-0000-000000000006',
    name: 'DAF XF 530',
    vehicleType: 'Tir',
    plate: '34 JKL 006',
    length: 1360, width: 240, height: 270,
    maxCargoWeight: 24000,
    doorDirection: 'rear',
    isFavorite: false, isActive: true, isDeleted: false,
    status: 'active',
    createdAt: '2025-04-10T09:00:00.000Z',
    createdBy: { id: 'u2', fullName: 'Sena Durmuş' },
  },
  {
    id: '11111111-0000-0000-0000-000000000007',
    name: 'MAN TGX 26.470',
    vehicleType: 'Kamyon',
    plate: '35 MNO 007',
    length: 810, width: 240, height: 260,
    maxCargoWeight: 15000,
    doorDirection: 'rear',
    isFavorite: false, isActive: true, isDeleted: false,
    status: 'active',
    createdAt: '2025-04-15T09:00:00.000Z',
    createdBy: { id: 'u2', fullName: 'Sena Durmuş' },
  },
  {
    id: '11111111-0000-0000-0000-000000000008',
    name: 'Krone Mega Liner',
    vehicleType: 'Romork',
    plate: '06 PQR 008',
    length: 1360, width: 248, height: 300,
    maxCargoWeight: 28000,
    doorDirection: 'top',
    isFavorite: false, isActive: true, isDeleted: false,
    status: 'active',
    createdAt: '2025-04-20T09:00:00.000Z',
    createdBy: { id: 'u1', fullName: 'Ahmet Yılmaz' },
  },
  {
    id: '11111111-0000-0000-0000-000000000009',
    name: 'Scania R500',
    vehicleType: 'Tir',
    plate: '34 STU 009',
    length: 1360, width: 240, height: 270,
    maxCargoWeight: 24000,
    doorDirection: 'rear',
    isFavorite: false, isActive: true, isDeleted: false,
    status: 'active',
    createdAt: '2025-05-17T09:00:00.000Z',
    createdBy: { id: 'u1', fullName: 'Ahmet Yılmaz' },
  },
  {
    id: '11111111-0000-0000-0000-000000000010',
    name: 'Ford Cargo 3530',
    vehicleType: 'Kamyon',
    plate: '16 VWX 010',
    length: 650, width: 235, height: 245,
    maxCargoWeight: 10000,
    doorDirection: 'side',
    doorSide: 'left',
    isFavorite: false, isActive: true, isDeleted: false,
    status: 'active',
    createdAt: '2025-05-18T09:00:00.000Z',
    createdBy: { id: 'u2', fullName: 'Sena Durmuş' },
  },
];

const TYPE_TABS: { label: string; value: VehicleType | 'all' }[] = [
  { label: 'Tümü', value: 'all' },
  { label: 'Kamyon', value: 'Kamyon' },
  { label: 'Konteyner', value: 'Konteyner' },
  { label: 'Römork', value: 'Romork' },
  { label: 'Tır', value: 'Tir' },
];

export function VehiclesPage() {
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState<VehicleType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [detailVehicleId, setDetailVehicleId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return MOCK_VEHICLES.filter((v) => {
      const matchesType = activeType === 'all' || v.vehicleType === activeType;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        v.name.toLowerCase().includes(q) ||
        (v.plate ?? '').toLowerCase().includes(q) ||
        (v.serialNumber ?? '').toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [activeType, search]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Araç Yönetimi</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Lojistik operasyonlarda kullanılan tır, kamyon ve konteynerlerin fiziksel kısıtlarını
          tanımlar.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Type tabs */}
        <div className="flex rounded-lg border bg-white p-0.5">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveType(tab.value)}
              className={cn(
                'rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors',
                activeType === tab.value
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-48 max-w-80">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Araç ismine göre ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <SlidersHorizontal className="h-4 w-4" />
            Filtrele
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-4 w-4" />
            Dışa Aktar
          </Button>
          <Button size="sm" className="gap-1.5 bg-foreground text-background hover:bg-foreground/90" onClick={() => navigate('/vehicles/new')}>
            <Plus className="h-4 w-4" />
            Yeni Araç Ekle
          </Button>
        </div>
      </div>

      <VehicleListTable
        vehicles={filtered}
        isLoading={false}
        onDelete={setVehicleToDelete}
        onDetail={(v) => setDetailVehicleId(v.id)}
      />

      <VehicleDeleteDialog vehicle={vehicleToDelete} onClose={() => setVehicleToDelete(null)} />
      <VehicleDetailPanel vehicleId={detailVehicleId} onClose={() => setDetailVehicleId(null)} />
    </div>
  );
}
