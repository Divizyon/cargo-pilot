import { PlacementStrategy, SequencerKind } from '@/lib/types/loadingPlan';

/**
 * Strateji ve sıralayıcı etiketleri.
 *
 * Kriterden ayrı dosyada duruyorlar çünkü ayrı bir eksenler: kriter "neyi
 * optimize et", strateji "hangi yerleştirici koşsun", sıralayıcı "kutu sırasını
 * kim üretsin" sorusunu yanıtlar. Üçünü tek listeye toplamak, üç kriterin
 * yanına dördüncü bir "kriter" gibi WallBuilder eklemek olurdu — rulebook
 * DR-01 bunu açıkça reddediyor.
 */
export const STRATEGY_ORDER = [
  PlacementStrategy.Greedy,
  PlacementStrategy.WallBuilder,
] as const;

export const STRATEGY_LABEL: Record<PlacementStrategy, string> = {
  [PlacementStrategy.Greedy]: 'Greedy',
  [PlacementStrategy.WallBuilder]: 'Wall-Builder',
};

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

export function isPlacementStrategy(value: number): value is PlacementStrategy {
  return (STRATEGY_ORDER as readonly number[]).includes(value);
}

export function isSequencerKind(value: number): value is SequencerKind {
  return (SEQUENCER_ORDER as readonly number[]).includes(value);
}
