import { describe, expect, it } from 'vitest';
import { DoorType, DoorFace, type VehicleDoor } from '@/lib/types/vehicle';
import { buildDoors, resolveSetKey } from './vehicleDoorSelection';

const SMALL: VehicleDoor = { type: DoorType.Small, face: DoorFace.LengthZ };
const BIG_LEFT: VehicleDoor = { type: DoorType.Big, face: DoorFace.ZeroX };
const BIG_RIGHT: VehicleDoor = { type: DoorType.Big, face: DoorFace.WidthX };
const TOP: VehicleDoor = { type: DoorType.Top, face: DoorFace.HeightY };

describe('buildDoors — formda sorulmabüyük kapılar korunur', () => {
  /** Denetim S-26: üst kapı ilk tıklamada sessizce siliniyordu. */
  it('mevcut üst kapı seçim değiştirilince kaybolmaz', () => {
    expect(buildDoors('small', DoorFace.WidthX, [SMALL, TOP])).toEqual([SMALL, TOP]);
    expect(buildDoors('big', DoorFace.ZeroX, [SMALL, TOP])).toEqual([BIG_LEFT, TOP]);
    expect(buildDoors('both', DoorFace.WidthX, [TOP])).toEqual([SMALL, BIG_RIGHT, TOP]);
  });

  it('arka ve büyük kapı seçime göre yeniden kurulur', () => {
    expect(buildDoors('small', DoorFace.WidthX, [BIG_LEFT])).toEqual([SMALL]);
    expect(buildDoors('big', DoorFace.WidthX, [SMALL])).toEqual([BIG_RIGHT]);
  });

  it('aynı tipten iki kapı üretmez', () => {
    const doors = buildDoors('both', DoorFace.ZeroX, [SMALL, BIG_RIGHT, TOP]);
    expect(doors.filter((d) => d.type === DoorType.Big)).toHaveLength(1);
    expect(doors.filter((d) => d.type === DoorType.Small)).toHaveLength(1);
  });
});

describe('resolveSetKey', () => {
  it('üç seçeneği kapı listesinden bulur', () => {
    expect(resolveSetKey([SMALL])).toBe('small');
    expect(resolveSetKey([BIG_LEFT])).toBe('big');
    expect(resolveSetKey([SMALL, BIG_RIGHT])).toBe('both');
  });

  /** Üst kapı seçenekleri etkilemez; formda sorulmuyor. */
  it('üst kapı seçimi değiştirmez', () => {
    expect(resolveSetKey([SMALL, TOP])).toBe('small');
    expect(resolveSetKey([TOP])).toBeNull();
    expect(resolveSetKey([])).toBeNull();
  });
});
