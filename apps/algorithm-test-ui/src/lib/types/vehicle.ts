export const DoorDirection = {
  Front: 'front',
  Rear: 'rear',
  Side: 'side',
  Top: 'top',
} as const;

export type DoorDirection = (typeof DoorDirection)[keyof typeof DoorDirection];

/**
 * Motorun okuduğu araç alanları.
 *
 * `CreatePlanCommandHandler.BuildInput` motora yalnızca iç ölçüler, azami
 * ağırlık ve kapı yönünü geçirir; dingil yükleri, katman sınırı ve envanter
 * alanları (durum, sahip, tarih) motoru hiç etkilemez ve burada tutulmaz.
 */
export interface Vehicle {
  id: string;
  name: string;
  plate?: string;
  width: number;
  height: number;
  length: number;
  maxCargoWeight: number;
  doorDirection: DoorDirection;
}
