import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SCENE } from '@/lib/config/scene-config';
import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';

interface LandingEntry {
  placement: PlacementWithDimensions;
  targetY: number;
}

type LandingKey = string;

const _v3 = new THREE.Vector3();

export function useLandingAnimation(
  previewPlacements: PlacementWithDimensions[],
  totalPlacementCount: number,
  onAllSettled: () => void,
) {
  const landingRef = useRef<Map<LandingKey, LandingEntry>>(new Map());
  // currentY değerleri ayrı map'te — immutable LandingEntry kuralını korur
  const currentYRef = useRef<Map<LandingKey, number>>(new Map());
  const meshRefs = useRef<Map<LandingKey, THREE.Mesh>>(new Map());
  const prevKeysRef = useRef<Set<LandingKey>>(new Set());

  useEffect(() => {
    const map = landingRef.current;
    const yMap = currentYRef.current;
    const skip = totalPlacementCount >= SCENE.INSTANCED_THRESHOLD;

    const incomingKeys = new Set<LandingKey>();

    previewPlacements.forEach((p, idx) => {
      const key: LandingKey = `${p.itemId}-${idx}`;
      incomingKeys.add(key);

      if (!map.has(key)) {
        const meshRef = meshRefs.current.get(key);
        if (!meshRef) return;

        const targetY = p.positionY;
        const startY = skip ? targetY : targetY + SCENE.LANDING_START_OFFSET;

        meshRef.position.set(
          p.positionX + p.width / 2,
          startY + p.height / 2,
          p.positionZ + p.depth / 2,
        );

        map.set(key, { placement: p, targetY });
        yMap.set(key, startY);
      }
    });

    for (const key of prevKeysRef.current) {
      if (!incomingKeys.has(key)) {
        map.delete(key);
        yMap.delete(key);
      }
    }
    prevKeysRef.current = incomingKeys;
  }, [previewPlacements, totalPlacementCount]);

  useEffect(() => {
    if (previewPlacements.length === 0) {
      landingRef.current.clear();
      currentYRef.current.clear();
      prevKeysRef.current.clear();
    }
  }, [previewPlacements.length]);

  useFrame(() => {
    const map = landingRef.current;
    const yMap = currentYRef.current;
    if (map.size === 0) return;

    let allSettled = true;

    for (const [key, entry] of map) {
      const meshRef = meshRefs.current.get(key);
      if (!meshRef) continue;

      const { targetY } = entry;
      const cur = yMap.get(key) ?? targetY;
      const diff = targetY - cur;
      const nextY = Math.abs(diff) > 0.5 ? cur + diff * SCENE.DROP_EASING : targetY;

      if (nextY !== targetY) allSettled = false;

      yMap.set(key, nextY);

      _v3.set(
        entry.placement.positionX + entry.placement.width / 2,
        nextY + entry.placement.height / 2,
        entry.placement.positionZ + entry.placement.depth / 2,
      );
      meshRef.position.copy(_v3);
    }

    if (allSettled && map.size > 0) {
      map.clear();
      currentYRef.current.clear();
      prevKeysRef.current.clear();
      onAllSettled();
    }
  });

  return meshRefs;
}
