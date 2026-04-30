import { useRef, useCallback, useMemo } from 'react';
import { SCENE } from '@/lib/config/scene-config';
import * as THREE from 'three';
const _ndc = new THREE.Vector2();
import { useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';
import type { Vehicle } from '@/lib/types/vehicle';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { useSceneStore } from '@/lib/store/useSceneStore';

function snapXZ(
  rawX: number,
  rawZ: number,
  w: number,
  d: number,
  others: PlacementWithDimensions[],
  threshold: number,
): { x: number; z: number } {
  let bestX = rawX;
  let bestZ = rawZ;
  let minDX = threshold;
  let minDZ = threshold;

  for (const o of others) {
    // dragged {left,right} aligns with other {left,right} → 4 X candidates
    for (const cx of [
      o.positionX,
      o.positionX + o.width - w,
      o.positionX + o.width,
      o.positionX - w,
    ]) {
      const dx = Math.abs(rawX - cx);
      if (dx < minDX) {
        minDX = dx;
        bestX = cx;
      }
    }
    // dragged {front,back} aligns with other {front,back} → 4 Z candidates
    for (const cz of [
      o.positionZ,
      o.positionZ + o.depth - d,
      o.positionZ + o.depth,
      o.positionZ - d,
    ]) {
      const dz = Math.abs(rawZ - cz);
      if (dz < minDZ) {
        minDZ = dz;
        bestZ = cz;
      }
    }
  }

  return { x: bestX, z: bestZ };
}

function gravityY(
  x: number,
  z: number,
  w: number,
  d: number,
  others: PlacementWithDimensions[],
): number {
  let maxY = 0;
  for (const o of others) {
    const xOv = x < o.positionX + o.width && o.positionX < x + w;
    const zOv = z < o.positionZ + o.depth && o.positionZ < z + d;
    if (xOv && zOv && o.positionY + o.height > maxY) {
      maxY = o.positionY + o.height;
    }
  }
  return maxY;
}

export interface DragState {
  idx: number;
  x: number;
  y: number;
  z: number;
}

export function useDragBox() {
  const { gl, camera, raycaster } = useThree();
  const updatePlacementPosition = usePlanStore((s) => s.updatePlacementPosition);
  const setIsDragging = useSceneStore((s) => s.setIsDragging);
  const setDragLivePosition = useSceneStore((s) => s.setDragLivePosition);

  const dragIdxRef = useRef<number | null>(null);
  const hasDragMovedRef = useRef(false);
  const livePosRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const setDragStateRef = useRef<((s: DragState | null) => void) | null>(null);

  const floorPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hitPoint = useMemo(() => new THREE.Vector3(), []);

  const startDrag = useCallback(
    (
      idx: number,
      placements: PlacementWithDimensions[],
      vehicle: Vehicle,
      setDragState: (s: DragState | null) => void,
      e: ThreeEvent<PointerEvent>,
    ) => {
      e.stopPropagation();
      const p = placements[idx];
      if (!p) return;

      dragIdxRef.current = idx;
      hasDragMovedRef.current = false;
      livePosRef.current = { x: p.positionX, y: p.positionY, z: p.positionZ };
      setDragStateRef.current = setDragState;

      const canvas = gl.domElement;
      const snap = placements;

      const onMove = (ev: PointerEvent) => {
        const rect = canvas.getBoundingClientRect();
        _ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
        _ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(_ndc, camera);
        const hit = raycaster.ray.intersectPlane(floorPlane, hitPoint);
        if (!hit) return;

        const rawX = hit.x - p.width / 2;
        const rawZ = hit.z - p.depth / 2;
        const clampedX = Math.max(0, Math.min(rawX, vehicle.width - p.width));
        const clampedZ = Math.max(0, Math.min(rawZ, vehicle.length - p.depth));

        const others = snap.filter((_, i) => i !== idx);
        const snapped = snapXZ(
          clampedX,
          clampedZ,
          p.width,
          p.depth,
          others,
          SCENE.DRAG_SNAP_THRESHOLD_CM,
        );
        const finalX = Math.max(0, Math.min(snapped.x, vehicle.width - p.width));
        const finalZ = Math.max(0, Math.min(snapped.z, vehicle.length - p.depth));
        const gy = gravityY(finalX, finalZ, p.width, p.depth, others);

        livePosRef.current = { x: finalX, y: gy, z: finalZ };
        const next: DragState = { idx, x: finalX, y: gy, z: finalZ };
        dragStateRef.current = next;
        setDragState(next);
        setDragLivePosition({ x: finalX, y: gy, z: finalZ });

        if (!hasDragMovedRef.current) {
          hasDragMovedRef.current = true;
          setIsDragging(true);
        }
      };

      const onUp = () => {
        canvas.removeEventListener('pointermove', onMove);
        canvas.removeEventListener('pointerup', onUp);

        const currentIdx = dragIdxRef.current;
        dragIdxRef.current = null;
        setIsDragging(false);
        setDragLivePosition(null);
        setDragState(null);
        dragStateRef.current = null;

        if (hasDragMovedRef.current && currentIdx !== null && livePosRef.current) {
          updatePlacementPosition(
            currentIdx,
            livePosRef.current.x,
            livePosRef.current.y,
            livePosRef.current.z,
          );
        }
      };

      canvas.addEventListener('pointermove', onMove);
      canvas.addEventListener('pointerup', onUp);
    },
    [
      gl,
      camera,
      raycaster,
      floorPlane,
      hitPoint,
      updatePlacementPosition,
      setIsDragging,
      setDragLivePosition,
    ],
  );

  return { startDrag };
}
