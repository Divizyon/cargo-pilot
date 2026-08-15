import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { SCENE } from '@/lib/config/scene-config';
import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';
import type { DoorDirection } from '@/lib/types/vehicle';

interface AnimEntry {
  startAt: number;
  flightMs: number;
  target: THREE.Vector3;
  /** Kapı dışı başlangıç — Z ekseninde aracın önü ötesinde */
  from: THREE.Vector3;
}

const _pos = new THREE.Vector3();

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Kutu sayısına göre toplam animasyon süresini ve per-box parametrelerini hesaplar.
 * HTML prototipindeki mantık: az kutuda hızlı, çok kutuda da makul (~4.5s max).
 *
 * totalDuration = clamp(MIN..MAX, BASE + count * PER_BOX)
 * perBoxStagger = totalDuration / count
 * boxFlight     = clamp(FLIGHT_MIN..FLIGHT_MAX, perBoxStagger * FLIGHT_RATIO)
 */
function computeScheduleParams(count: number): { staggerMs: number; flightMs: number } {
  if (count === 0) return { staggerMs: 300, flightMs: 700 };

  const totalMs = Math.min(
    SCENE.ANIM_MAX_MS,
    Math.max(SCENE.ANIM_MIN_MS, SCENE.ANIM_BASE_MS + count * SCENE.ANIM_PER_BOX_MS),
  );
  const staggerMs = totalMs / count;
  const flightMs = Math.min(
    SCENE.ANIM_FLIGHT_MAX_MS,
    Math.max(SCENE.ANIM_FLIGHT_MIN_MS, staggerMs * SCENE.ANIM_FLIGHT_RATIO),
  );

  return { staggerMs, flightMs };
}

/**
 * Kapıdan-içeri yükleme animasyonu — HTML prototipinin adaptive schedule mantığıyla.
 *
 * - `playing` modunda her kutu sırasıyla kapı dışından (Z > araç sonu) hedef konumuna kayar.
 * - `stepped` modunda animasyon yoktur — `animationStep`'e göre snapshot gösterimi yapılır.
 * - Kutu sayısı ne olursa olsun toplam animasyon süresi 2.5–4.5s arasında kalır.
 * - Yükleme sırası: `loadOrder` dizisinin sırası (çağıran buildLoadOrder ile fiziksel sıra verir).
 *
 * Hook caller-agnostic: her kutu için `setPosition(index, x, y, z)` callback'ini çağırır.
 * Caller bunu `setMatrixAt` veya `mesh.position` ile uygular.
 */
export function useLoadingAnimation(
  placements: PlacementWithDimensions[],
  loadOrder: number[],
  setPosition: (globalIdx: number, x: number, y: number, z: number) => void,
  onFrameUpdate: () => void,
  /** Araç Z derinliği (cm) — kapı Z konumu için */
  vehicleDepth?: number,
  /** Araç X genişliği (cm) — kapı merkezi için */
  vehicleWidth?: number,
  /** Araç Y yüksekliği (cm) — üst kapı için */
  vehicleHeight?: number,
  /** Kapı yönü — animasyon başlangıç noktasını belirler */
  doorDirection?: DoorDirection,
  /** Yan kapı tarafı */
  doorSide?: 'right' | 'left',
) {
  const animationMode = useSceneStore((s) => s.animationMode);
  const animationStep = useSceneStore((s) => s.animationStep);
  const setAnimationMode = useSceneStore((s) => s.setAnimationMode);
  const setAnimationStep = useSceneStore((s) => s.setAnimationStep);

  const startTimeRef = useRef<number | null>(null);
  const scheduleRef = useRef<Map<number, AnimEntry>>(new Map());

  useEffect(() => {
    if (animationMode !== 'playing') {
      startTimeRef.current = null;
      return;
    }

    const { staggerMs, flightMs } = computeScheduleParams(loadOrder.length);

    const depth = vehicleDepth ?? 0;
    const width = vehicleWidth ?? 0;
    const height = vehicleHeight ?? 0;
    const OFFSET = SCENE.ANIM_DOOR_OFFSET_CM;

    const schedule = new Map<number, AnimEntry>();
    loadOrder.forEach((globalIdx, seqIdx) => {
      const p = placements[globalIdx];
      if (!p) return;

      const cx = p.positionX + p.width / 2;
      const cy = p.positionY + p.height / 2;
      const cz = p.positionZ + p.depth / 2;

      // Her kutu kapı ekseninde dışarıdan başlar, diğer eksenlerde hedef pozisyonunda.
      // Böylece kutular kapı açıklığından düz çizgi halinde içeri kayar.
      let fromX: number;
      let fromY: number;
      let fromZ: number;

      switch (doorDirection) {
        case 'side':
          // Yan kapı: kapı X ekseninde, kutu Y/Z hedefinde başlar
          fromX = doorSide === 'right' ? width + OFFSET : -OFFSET;
          fromY = cy;
          fromZ = cz;
          break;
        case 'top':
          // Üst kapı: tavan Y + offset'ten iner, X/Z hedefinde
          fromX = cx;
          fromY = height + OFFSET;
          fromZ = cz;
          break;
        default:
          // Referans kapı z = length yüzündedir; kutular kapının önünden girer.
          // 'rear', 'rearAndSide' ve tanımsız değer aynı yüzü paylaşır — z = 0
          // uzak yüzdür (TIR'da kabin ucu), oradan giriş fiziksel olarak imkânsız.
          fromX = cx;
          fromY = cy;
          fromZ = depth + OFFSET;
      }

      schedule.set(globalIdx, {
        startAt: seqIdx * staggerMs,
        flightMs,
        target: new THREE.Vector3(cx, cy, cz),
        from: new THREE.Vector3(fromX, fromY, fromZ),
      });
    });

    scheduleRef.current = schedule;
    startTimeRef.current = null;
  }, [
    animationMode,
    loadOrder,
    placements,
    vehicleDepth,
    vehicleWidth,
    vehicleHeight,
    doorDirection,
    doorSide,
  ]);

  useFrame(() => {
    if (animationMode === 'stepped') {
      loadOrder.forEach((globalIdx, seqIdx) => {
        const p = placements[globalIdx];
        if (!p || seqIdx >= animationStep) return;
        setPosition(
          globalIdx,
          p.positionX + p.width / 2,
          p.positionY + p.height / 2,
          p.positionZ + p.depth / 2,
        );
      });
      onFrameUpdate();
      return;
    }

    if (animationMode !== 'playing') return;

    if (startTimeRef.current === null) {
      startTimeRef.current = performance.now();
    }

    const elapsed = performance.now() - startTimeRef.current;
    let allDone = true;
    let completedCount = 0;

    for (const [globalIdx, entry] of scheduleRef.current) {
      const localT = elapsed - entry.startAt;

      if (localT < 0) {
        _pos.copy(entry.from);
        allDone = false;
      } else if (localT >= entry.flightMs) {
        _pos.copy(entry.target);
        completedCount++;
      } else {
        const eased = easeOutCubic(localT / entry.flightMs);
        _pos.lerpVectors(entry.from, entry.target, eased);
        allDone = false;
      }

      setPosition(globalIdx, _pos.x, _pos.y, _pos.z);
    }

    // Slider'ı canlı güncelle — sadece değer değişince yaz
    if (completedCount !== useSceneStore.getState().animationStep) {
      setAnimationStep(completedCount);
    }

    onFrameUpdate();

    if (allDone && scheduleRef.current.size > 0 && loadOrder.length > 0) {
      setAnimationStep(loadOrder.length);
      setAnimationMode('stepped');
    }
  });

  return {
    play: () => {
      setAnimationStep(0);
      setAnimationMode('playing');
    },
    goToStep: (step: number) => {
      setAnimationMode('stepped');
      setAnimationStep(Math.max(0, Math.min(step, loadOrder.length)));
    },
    totalSteps: loadOrder.length,
  };
}
