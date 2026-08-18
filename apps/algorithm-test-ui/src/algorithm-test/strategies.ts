import { SequencerKind } from '@/lib/types/loadingPlan';

/**
 * Sıralayıcı etiketleri.
 *
 * Kriterden ayrı dosyada duruyor çünkü ayrı bir eksen: kriter "neyi optimize
 * et", sıralayıcı "kutu sırasını kim üretsin" sorusunu yanıtlar.
 *
 * Yerleştirici ekseni kaldırıldı (`DR-39`): greedy silindi ve tek yerleştirici
 * kaldı, dolayısıyla seçilecek bir şey yok.
 */
export const SEQUENCER_ORDER = [
  SequencerKind.Static,
  SequencerKind.Gwca,
  SequencerKind.Ga,
  SequencerKind.Grasp,
] as const;

export const SEQUENCER_LABEL: Record<SequencerKind, string> = {
  [SequencerKind.Static]: 'Statik sıralama',
  [SequencerKind.Gwca]: 'GWCA',
  [SequencerKind.Ga]: 'Genetik algoritma',
  [SequencerKind.Grasp]: 'GRASP',
};

export function isSequencerKind(value: number): value is SequencerKind {
  return (SEQUENCER_ORDER as readonly number[]).includes(value);
}
