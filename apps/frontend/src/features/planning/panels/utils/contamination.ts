import type { Item } from '@/lib/types/item';
import { INCOMPATIBLE_BY_GROUP } from '@/lib/api/itemMappers';

export interface GroupVolume {
  name: string;
  volumeM3: number;
  pct: number;
}

export interface ContaminationConflict {
  groupA: string;
  groupB: string;
}

export function detectContaminationConflicts(
  items: Array<{ item: Item; quantity: number }>,
): ContaminationConflict[] {
  const presentGroups = new Set(
    items.map((si) => si.item.stackGroup).filter((g): g is string => !!g),
  );
  if (presentGroups.size < 2) return [];

  const seen = new Set<string>();
  const conflicts: ContaminationConflict[] = [];

  for (const si of items) {
    const { stackGroup } = si.item;
    if (!stackGroup) continue;

    const incompatible =
      (si.item.incompatibleGroups ?? []).length > 0
        ? si.item.incompatibleGroups!
        : (INCOMPATIBLE_BY_GROUP[stackGroup] ?? []);

    for (const other of incompatible) {
      if (!presentGroups.has(other)) continue;
      const key = [stackGroup, other].sort().join('||');
      if (!seen.has(key)) {
        seen.add(key);
        conflicts.push({ groupA: stackGroup, groupB: other });
      }
    }
  }
  return conflicts;
}

export function computeGroupVolumes(
  items: Array<{ item: Item; quantity: number }>,
  groups: string[],
): GroupVolume[] {
  const volumes: Record<string, number> = {};
  for (const g of groups) volumes[g] = 0;

  for (const si of items) {
    const g = si.item.stackGroup;
    if (!g || !(g in volumes)) continue;
    volumes[g] += si.item.width * si.item.height * si.item.length * si.quantity;
  }

  const total = Object.values(volumes).reduce((s, v) => s + v, 0);
  return groups.map((name) => ({
    name,
    volumeM3: volumes[name] / 1_000_000,
    pct: total > 0 ? Math.round((volumes[name] / total) * 100) : 0,
  }));
}
