import { describe, expect, it } from 'vitest';
import type { Item } from '@/lib/types/item';
import { OptimizationCriteria } from '@/lib/types/loadingPlan';
import { DoorDirection, type Vehicle } from '@/lib/types/vehicle';
import { GENERATOR_VERSION, generateSuite } from '../utils/suiteGenerator';
import { SUITE_RUN_VERSION } from '../utils/suiteStorage';
import { runSuite, type SuiteClock } from './runSuite';
import type { SuiteClient } from './suiteClient';

/**
 * Koşu motorunun sözleşmesi. Sunucu sahte: burada sınanan şey motorun yerleştirme
 * kalitesi değil, koşunun kendisi — kaç satır üretiyor, hatayı nasıl raporluyor,
 * iptali nasıl yorumluyor, plan kaydını temizliyor mu.
 */

const PLAN_ID = '11111111-1111-4111-8111-111111111111';

function vehicle(): Vehicle {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Test Tır',
    width: 240,
    height: 260,
    length: 1360,
    maxCargoWeight: 20000,
    doorDirection: DoorDirection.Rear,
  };
}

function item(): Item {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Koli',
    sku: 'KOLI-1',
    width: 100,
    height: 100,
    length: 100,
    weight: 10,
    isStackable: true,
    maxStackCount: 0,
    maxWeightOnTop: null,
    fragility: 0,
    allowedRotations: 0,
    stackGroup: null,
    incompatibleGroups: [],
  };
}

const vehicles = [vehicle()];
const items = [item()];

const clock: SuiteClock = {
  nowIso: () => '2026-08-15T12:00:00.000Z',
  monotonicMs: () => 0,
};

/** Tek kutu yerleşmiş, kalanı yer bulamamış bir plan yanıtı. */
function planDetail(requestedQuantity: number): unknown {
  const box = items[0];
  return {
    isSuccess: true,
    data: {
      id: PLAN_ID,
      planName: 'Sahte plan',
      vehicle: {
        id: vehicles[0].id,
        vehicleName: vehicles[0].name,
        internalWidth: vehicles[0].width,
        internalHeight: vehicles[0].height,
        internalLength: vehicles[0].length,
        maxWeightCapacity: vehicles[0].maxCargoWeight,
        loadingType: 0,
      },
      placements: [
        {
          itemId: box.id,
          positionX: 0,
          positionY: 0,
          positionZ: 0,
          rotation: 0,
          item: { id: box.id, name: box.name, width: 100, height: 100, length: 100, weight: 10 },
        },
      ],
      inputItems: [
        {
          itemId: box.id,
          quantity: requestedQuantity,
          item: { id: box.id, name: box.name, width: 100, height: 100, length: 100, weight: 10 },
        },
      ],
      unplacedItems: [{ itemId: box.id, quantity: requestedQuantity - 1, reason: 1 }],
      fillRate: 0.25,
      totalWeight: 10,
      placedQuantity: 1,
      unplacedQuantity: requestedQuantity - 1,
      centerOfGravityX: 50,
      centerOfGravityY: 50,
      centerOfGravityZ: 50,
      weightBalanceOffsetX: 58.3,
      weightBalanceOffsetZ: 92.6,
    },
  };
}

interface FakeClient extends SuiteClient {
  createdBodies: unknown[];
  deletedIds: string[];
}

function fakeClient(options: { failOnCall?: number } = {}): FakeClient {
  const createdBodies: unknown[] = [];
  const deletedIds: string[] = [];
  let calls = 0;

  return {
    createdBodies,
    deletedIds,
    async createPlan(body) {
      calls += 1;
      createdBodies.push(body);
      if (options.failOnCall === calls) {
        throw { response: { status: 422, data: { detail: 'Kutu sınırı aşıldı' } } };
      }
      return PLAN_ID;
    },
    async getPlanDetail() {
      const requested = totalOf(createdBodies[createdBodies.length - 1]);
      return planDetail(requested);
    },
    async deletePlan(planId) {
      deletedIds.push(planId);
    },
  };
}

function totalOf(body: unknown): number {
  const planItems = (body as { items?: Array<{ quantity: number }> }).items ?? [];
  return planItems.reduce((sum, entry) => sum + entry.quantity, 0);
}

describe('runSuite', () => {
  it('her senaryo × kriter için bir satır üretir', async () => {
    const outcome = await runSuite({
      seed: 1,
      count: 3,
      vehicles,
      items,
      client: fakeClient(),
      clock,
      concurrency: 1,
    });

    expect(outcome.status).toBe('ok');
    if (outcome.status !== 'ok') return;

    expect(outcome.run.results).toHaveLength(9);
    expect(outcome.run.requestedScenarios).toBe(3);
    expect(outcome.run.aggregates).toHaveLength(3);
  });

  it('koşuyu sürüm ve kapsama bilgisiyle damgalar', async () => {
    const outcome = await runSuite({
      seed: 5,
      count: 1,
      vehicles,
      items,
      client: fakeClient(),
      clock,
      engineVersion: 'abc1234',
      concurrency: 1,
    });

    expect(outcome.status).toBe('ok');
    if (outcome.status !== 'ok') return;

    expect(outcome.run.version).toBe(SUITE_RUN_VERSION);
    expect(outcome.run.generatorVersion).toBe(GENERATOR_VERSION);
    expect(outcome.run.engineVersion).toBe('abc1234');
    expect(outcome.run.completedAt).toBe('2026-08-15T12:00:00.000Z');
    expect(outcome.run.coverage.length).toBeGreaterThan(0);
  });

  /**
   * Eskiden düşen senaryo sessizce listeden siliniyordu: motorun belirli bir
   * girdide patlaması "eksik satır" olarak görünüyor, hata olarak görünmüyordu.
   */
  it('hata veren senaryoyu düşürmez, sebebini satıra yazar', async () => {
    const outcome = await runSuite({
      seed: 1,
      count: 2,
      vehicles,
      items,
      client: fakeClient({ failOnCall: 1 }),
      clock,
      concurrency: 1,
    });

    expect(outcome.status).toBe('ok');
    if (outcome.status !== 'ok') return;

    const failed = outcome.run.results.filter((row) => row.error !== null);
    expect(failed).toHaveLength(1);
    expect(failed[0].error).toBe('Kutu sınırı aşıldı');
    expect(outcome.run.results).toHaveLength(6);
  });

  it('yerleşememe sebeplerini ve doluluğu satıra taşır', async () => {
    const outcome = await runSuite({
      seed: 1,
      count: 1,
      vehicles,
      items,
      client: fakeClient(),
      clock,
      concurrency: 1,
    });

    expect(outcome.status).toBe('ok');
    if (outcome.status !== 'ok') return;

    const row = outcome.run.results[0];
    expect(row.fillPercent).toBeCloseTo(25);
    expect(row.placedCount).toBe(1);
    expect(row.unplacedReasons[0].reason).toBe(1);
    expect(row.error).toBeNull();
  });

  // Yüz senaryo × üç kriter paylaşılan veritabanına üç yüz kayıt bırakırdı.
  it('okunan her planı siler', async () => {
    const client = fakeClient();
    await runSuite({ seed: 1, count: 2, vehicles, items, client, clock, concurrency: 1 });

    expect(client.deletedIds).toHaveLength(6);
  });

  it('katalog boşsa koşmaz', async () => {
    const outcome = await runSuite({
      seed: 1,
      count: 5,
      vehicles: [],
      items,
      client: fakeClient(),
      clock,
    });

    expect(outcome.status).toBe('empty-catalog');
  });

  /**
   * Kısmi sonuç kaydedilirse eksik örneklemin ortalaması tam bir koşuyla
   * karşılaştırılır ve fark motorun değil, senaryo sayısının farkı olur.
   */
  it('iptal edilen koşuyu kaydetmez', async () => {
    const outcome = await runSuite({
      seed: 1,
      count: 5,
      vehicles,
      items,
      client: fakeClient(),
      clock,
      concurrency: 1,
      shouldCancel: () => true,
    });

    expect(outcome.status).toBe('cancelled');
  });

  it('ilerlemeyi toplam iş sayısıyla bildirir', async () => {
    const seen: number[] = [];
    await runSuite({
      seed: 1,
      count: 2,
      vehicles,
      items,
      client: fakeClient(),
      clock,
      concurrency: 1,
      onProgress: ({ completed, total }) => {
        expect(total).toBe(6);
        seen.push(completed);
      },
    });

    expect(seen[seen.length - 1]).toBe(6);
  });

  /**
   * Bozuk sayacı koşu sürerken okunur: 200 senaryoluk bir koşuda sonucun
   * bozulduğunu bitişi beklemeden görmek gerekiyor.
   */
  it('ilerlemede o ana kadarki bozuk iş sayısını bildirir', async () => {
    const seen: number[] = [];
    await runSuite({
      seed: 1,
      count: 2,
      vehicles,
      items,
      client: fakeClient({ failOnCall: 1 }),
      clock,
      concurrency: 1,
      onProgress: ({ failed }) => seen.push(failed),
    });

    expect(seen[0]).toBe(0);
    expect(seen[seen.length - 1]).toBe(1);
  });

  /**
   * Motorun iki sürümü ancak birebir aynı yüke karşı kıyaslanabilir; gönderilen
   * gövde üretilen senaryodan sapmamalı.
   */
  it('gönderilen gövde üretilen senaryoyla birebir aynı', async () => {
    const client = fakeClient();
    await runSuite({ seed: 9, count: 1, vehicles, items, client, clock, concurrency: 1 });

    const scenario = generateSuite(9, 1, vehicles, items)[0];
    const body = client.createdBodies[0] as {
      vehicleId: string;
      items: Array<{ itemId: string; quantity: number }>;
    };

    expect(body.vehicleId).toBe(scenario.vehicleId);
    expect(body.items.map((entry) => entry.quantity)).toEqual(
      scenario.items.map((entry) => entry.quantity),
    );
  });

  /**
   * İşçiler kuyruktan sırasız çekiyor; sıralama olmadan iki koşunun JSON farkı
   * gerçekten değişen ölçümleri değil, satır yer değiştirmelerini gösterirdi.
   */
  it('satırları sıra ve kritere göre sıralar', async () => {
    const outcome = await runSuite({
      seed: 1,
      count: 3,
      vehicles,
      items,
      client: fakeClient(),
      clock,
      concurrency: 3,
    });

    expect(outcome.status).toBe('ok');
    if (outcome.status !== 'ok') return;

    const keys = outcome.run.results.map((row) => row.index * 10 + row.criteria);
    expect(keys).toEqual([...keys].sort((a, b) => a - b));
  });

  it('yalnızca istenen kriterleri koşar', async () => {
    const outcome = await runSuite({
      seed: 1,
      count: 2,
      vehicles,
      items,
      client: fakeClient(),
      clock,
      concurrency: 1,
      criteriaList: [OptimizationCriteria.Lifo],
    });

    expect(outcome.status).toBe('ok');
    if (outcome.status !== 'ok') return;

    expect(outcome.run.results).toHaveLength(2);
    expect(outcome.run.results.every((row) => row.criteria === OptimizationCriteria.Lifo)).toBe(
      true,
    );
  });
});
