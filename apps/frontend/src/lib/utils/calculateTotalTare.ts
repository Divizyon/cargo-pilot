interface TareEntry {
  tareWeight?: number | null;
}

export function calculateTotalTare(entries: TareEntry[]): number {
  return entries.reduce((sum, e) => sum + (e.tareWeight ?? 0), 0);
}
