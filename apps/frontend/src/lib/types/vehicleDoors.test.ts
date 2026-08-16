import { describe, expect, it } from 'vitest';
import {
  DoorType,
  DoorFace,
  DEFAULT_BIG_DOOR_FACE,
  ALLOWED_DOOR_FACES,
  fillsFromMaxX,
  hasReferenceDoor,
  formatDoorSummary,
  validateDoors,
  type VehicleDoor,
} from './vehicle';

const SMALL: VehicleDoor = { type: DoorType.Small, face: DoorFace.LengthZ };
const BIG_LEFT: VehicleDoor = { type: DoorType.Big, face: DoorFace.ZeroX };
const BIG_RIGHT: VehicleDoor = { type: DoorType.Big, face: DoorFace.WidthX };
const TOP: VehicleDoor = { type: DoorType.Top, face: DoorFace.HeightY };

describe('DEFAULT_BIG_DOOR_FACE — origin serbest kalmalı', () => {
  it("varsayılan yüz origin'e değmez", () => {
    // Origin (0,0,0) x = 0 yüzündedir; varsayılan kapı karşı yüzde olmalı.
    expect(DEFAULT_BIG_DOOR_FACE).toBe(DoorFace.WidthX);
    expect(DEFAULT_BIG_DOOR_FACE).not.toBe(DoorFace.ZeroX);
  });

  it('varsayılanla yükleme origin köşesinden başlar', () => {
    // Kullanıcı taraf seçmezse motor doldurmayı x = 0'dan yapar.
    expect(fillsFromMaxX([{ type: DoorType.Big, face: DEFAULT_BIG_DOOR_FACE }])).toBe(false);
    expect(fillsFromMaxX([SMALL, { type: DoorType.Big, face: DEFAULT_BIG_DOOR_FACE }])).toBe(false);
  });

  it('kullanıcı sol tarafı seçerse yükleme karşı köşeye kayar', () => {
    expect(fillsFromMaxX([SMALL, BIG_LEFT])).toBe(true);
  });

  it('varsayılan yüz kendi tipinin izin verilen yüzleri arasında', () => {
    expect(ALLOWED_DOOR_FACES[DoorType.Big]).toContain(DEFAULT_BIG_DOOR_FACE);
  });
});

describe('fillsFromMaxX — yalnızca büyük kapı yön çevirir', () => {
  it('büyük kapı yoksa her zaman origin', () => {
    expect(fillsFromMaxX([])).toBe(false);
    expect(fillsFromMaxX([SMALL])).toBe(false);
    expect(fillsFromMaxX([SMALL, TOP])).toBe(false);
  });
});

describe('hasReferenceDoor — kapı kümesi sorgusu (bölge ön koşulu DEĞİL)', () => {
  it('küçük kapı varsa doğru', () => {
    expect(hasReferenceDoor([SMALL])).toBe(true);
    expect(hasReferenceDoor([SMALL, BIG_LEFT])).toBe(true);
  });

  it('yalnızca büyük kapı varsa yanlış', () => {
    expect(hasReferenceDoor([BIG_RIGHT])).toBe(false);
    expect(hasReferenceDoor([])).toBe(false);
  });
});

describe('validateDoors — formdaki üç seçenek geçerli', () => {
  it.each([
    ['küçük kapı', [SMALL]],
    ['büyük kapı', [BIG_RIGHT]],
    ['küçük ve büyük kapı', [SMALL, BIG_LEFT]],
  ])('%s kabul edilir', (_label, doors) => {
    expect(validateDoors(doors)).toBeNull();
  });

  it('kapısız araç reddedilir', () => {
    expect(validateDoors([])).toBe('Araçta en az bir kapı bulunmalıdır.');
  });

  it('aynı tipten iki kapı reddedilir', () => {
    expect(validateDoors([BIG_LEFT, BIG_RIGHT])).toContain('büyük kapı');
    expect(validateDoors([SMALL, SMALL])).toContain('küçük kapı');
  });

  it('tipe uymayan yüz reddedilir', () => {
    expect(validateDoors([{ type: DoorType.Small, face: DoorFace.ZeroX }])).not.toBeNull();
    expect(validateDoors([{ type: DoorType.Big, face: DoorFace.LengthZ }])).not.toBeNull();
  });
});

describe('formatDoorSummary', () => {
  /**
   * Yazım: tipler `+` ile birleşir, "kapı" tekrarlanmaz, taraf parantez içinde.
   * Adlandırma boyuta göre (docs/COORDINATE_STANDARD.md §4); yön adı
   * ("arka"/"yan") bir kapı tipi değildir.
   */
  it('kapı kümesini tek satıra indirger', () => {
    expect(formatDoorSummary([SMALL])).toBe('Küçük');
    expect(formatDoorSummary([BIG_LEFT])).toBe('Büyük (sol)');
    expect(formatDoorSummary([BIG_RIGHT])).toBe('Büyük (sağ)');
    expect(formatDoorSummary([SMALL, BIG_LEFT])).toBe('Küçük + büyük (sol)');
    expect(formatDoorSummary([SMALL, BIG_RIGHT])).toBe('Küçük + büyük (sağ)');
    expect(formatDoorSummary([SMALL, BIG_RIGHT, TOP])).toBe('Küçük + büyük (sağ) + üst');
    expect(formatDoorSummary([TOP])).toBe('Üst');
  });

  it('tek kapılı araçta da baş harf büyük', () => {
    expect(formatDoorSummary([BIG_LEFT]).startsWith('B')).toBe(true);
    expect(formatDoorSummary([TOP]).startsWith('Ü')).toBe(true);
  });

  it('kapı yoksa tire döner', () => {
    expect(formatDoorSummary([])).toBe('—');
    expect(formatDoorSummary(undefined)).toBe('—');
  });
});
