import type { Item } from '@/lib/types/item';

/** CargoPilot.Domain/Enums/FragilityType.cs */
const FRAGILITY_LABEL: Record<number, string> = {
  1: 'kırılgan',
  2: 'sıvı/kimyasal',
  3: 'yanıcı',
  4: 'oksitleyici',
  5: 'aşındırıcı',
  6: 'koku hassas',
  7: 'gıda teması',
  8: 'kuru tutulmalı',
  9: 'kimyasal',
};

export interface ItemConstraint {
  label: string;
  /** true ise motor bu kısıt yüzünden doğrudan bir dal seçiyor. */
  affectsEngine: boolean;
}

/**
 * Ürünün hangi algoritma dalını tetikleyebileceğini listeler.
 *
 * Motorun gerçekten dallandığı alanlar: IsStackable, MaxStackCount, MaxWeightOnTop,
 * AllowedRotations, StackGroup/IncompatibleGroups ve yalnızca FragilityType=Fragile.
 * Diğer kırılganlık sınıfları (2-9) motorda okunmuyor; ayrıştırma StackGroup ve
 * IncompatibleGroups üzerinden yürüyor (PlacementValidator.cs:174-185).
 */
export function describeItemConstraints(item: Item): ItemConstraint[] {
  const constraints: ItemConstraint[] = [];

  if (item.fragility === 1) {
    constraints.push({ label: 'kırılgan', affectsEngine: true });
  } else if (item.fragility >= 2) {
    constraints.push({
      label: FRAGILITY_LABEL[item.fragility] ?? `kırılganlık ${item.fragility}`,
      affectsEngine: false,
    });
  }

  if (!item.isStackable) {
    constraints.push({ label: 'istiflenemez', affectsEngine: true });
  } else if (item.maxStackCount > 0) {
    // Backend'de 0 = sınırsız.
    constraints.push({ label: `istif ≤ ${item.maxStackCount}`, affectsEngine: true });
  }

  if (item.maxWeightOnTop !== null && item.maxWeightOnTop > 0) {
    constraints.push({ label: `üst ≤ ${item.maxWeightOnTop} kg`, affectsEngine: true });
  }

  // AllowedRotations: 0=All (kısıt yok), 2=Fixed (tümü kilitli), diğerleri kısmi.
  if (item.allowedRotations === 2) {
    constraints.push({ label: 'rotasyon kilitli', affectsEngine: true });
  } else if (item.allowedRotations !== 0) {
    constraints.push({ label: 'rotasyon kısıtlı', affectsEngine: true });
  }

  if (item.stackGroup) {
    constraints.push({ label: `grup ${item.stackGroup}`, affectsEngine: true });
  }

  if (item.incompatibleGroups && item.incompatibleGroups.length > 0) {
    constraints.push({
      label: `uyumsuz: ${item.incompatibleGroups.join(', ')}`,
      affectsEngine: true,
    });
  }

  return constraints;
}
