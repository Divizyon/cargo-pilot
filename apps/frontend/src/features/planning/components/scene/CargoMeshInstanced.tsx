import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import * as THREE from 'three';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { BoxWrapper } from '@/components/shared/BoxWrapper';
import { LandingWireframe } from '@/components/shared/LandingWireframe';
import { SCENE } from '@/lib/config/scene-config';
import { applyOrientationQuaternion, rotatedDimensions } from '@/lib/utils/boxOrientations';
import { isGhosted, isPlacementVisible } from '@/lib/utils/sceneFilter';
import { useDragBox } from '@/features/planning/components/scene/useDragBox';
import { useLandingAnimation } from '@/features/planning/components/scene/useLandingAnimation';
import type { DragState } from '@/features/planning/components/scene/useDragBox';
import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';

const INSTANCED_THRESHOLD = SCENE.INSTANCED_THRESHOLD;
const COLOR_VIOLATION = new THREE.Color(SCENE.COLORS.VIOLATION);
const COLOR_NORMAL = new THREE.Color(SCENE.COLORS.NORMAL);
const SCALE_ZERO = new THREE.Vector3(0, 0, 0);

// Unit cube edges centered at origin, 12 edges × 2 endpoints each
const UNIT_EDGES: ReadonlyArray<readonly [number, number, number, number, number, number]> = [
  [-0.5, -0.5, -0.5, 0.5, -0.5, -0.5],
  [0.5, -0.5, -0.5, 0.5, -0.5, 0.5],
  [0.5, -0.5, 0.5, -0.5, -0.5, 0.5],
  [-0.5, -0.5, 0.5, -0.5, -0.5, -0.5],
  [-0.5, 0.5, -0.5, 0.5, 0.5, -0.5],
  [0.5, 0.5, -0.5, 0.5, 0.5, 0.5],
  [0.5, 0.5, 0.5, -0.5, 0.5, 0.5],
  [-0.5, 0.5, 0.5, -0.5, 0.5, -0.5],
  [-0.5, -0.5, -0.5, -0.5, 0.5, -0.5],
  [0.5, -0.5, -0.5, 0.5, 0.5, -0.5],
  [0.5, -0.5, 0.5, 0.5, 0.5, 0.5],
  [-0.5, -0.5, 0.5, -0.5, 0.5, 0.5],
] as const;

function buildEdgesGeometry(
  placements: PlacementWithDimensions[],
  opts: {
    selectedInstanceId: number | null;
    selectedItemId: string | null;
    hiddenItemIds: string[];
    activeLayer: number;
    focusedGroupItemIds: string[] | null;
    dragState: DragState | null;
  },
): THREE.BufferGeometry {
  const {
    selectedInstanceId,
    selectedItemId,
    hiddenItemIds,
    activeLayer,
    focusedGroupItemIds,
    dragState,
  } = opts;
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const point = new THREE.Vector3();
  const positions: number[] = [];

  placements.forEach((p, i) => {
    // Palet kendi BoxWrapper'ı içinde kenar çizgileri çizer
    if (p.productType === 'palet') return;
    const visible = isPlacementVisible(p, i, { selectedInstanceId, selectedItemId, hiddenItemIds });
    const ghosted = isGhosted(p, activeLayer, focusedGroupItemIds);
    if (!visible || ghosted) return;

    const base = rotatedDimensions(p.width, p.height, p.depth, p.orientationIndex);
    const px = dragState?.idx === i ? dragState.x : p.positionX;
    const py = dragState?.idx === i ? dragState.y : p.positionY;
    const pz = dragState?.idx === i ? dragState.z : p.positionZ;

    applyOrientationQuaternion(quaternion, p.orientationIndex);
    position.set(px + p.width / 2, py + p.height / 2, pz + p.depth / 2);
    scale.set(base.width, base.height, base.depth);
    matrix.compose(position, quaternion, scale);

    for (const [x1, y1, z1, x2, y2, z2] of UNIT_EDGES) {
      point.set(x1, y1, z1).applyMatrix4(matrix);
      positions.push(point.x, point.y, point.z);
      point.set(x2, y2, z2).applyMatrix4(matrix);
      positions.push(point.x, point.y, point.z);
    }
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geo;
}

interface CargoMeshInstancedProps {
  planId: string;
}

// ─── InstancedBoxes ────────────────────────────────────────────────────────────

function InstancedBoxes() {
  // Box (koli/palet) refs
  const opaqueRef = useRef<THREE.InstancedMesh>(null);
  const ghostWireRef = useRef<THREE.InstancedMesh>(null);
  const violationRef = useRef<THREE.InstancedMesh>(null);
  // Cylinder (varil) refs
  const opaqueCylRef = useRef<THREE.InstancedMesh>(null);
  const ghostWireCylRef = useRef<THREE.InstancedMesh>(null);
  const violationCylRef = useRef<THREE.InstancedMesh>(null);

  const rawPlacements = usePlanStore((s) => s.placements);
  const previewItemId = usePlanStore((s) => s.previewItemId);
  const previewPlacements = usePlanStore((s) => s.previewPlacements);
  const clearPreview = usePlanStore((s) => s.clearPreview);
  const vehicle = usePlanStore((s) => s.selectedVehicle);

  const handleAllSettled = useCallback(() => {
    clearPreview();
  }, [clearPreview]);

  const landingMeshRefs = useLandingAnimation(
    previewPlacements,
    rawPlacements.length,
    handleAllSettled,
  );

  const placements = useMemo(
    () =>
      previewItemId
        ? [...rawPlacements.filter((p) => p.itemId !== previewItemId), ...previewPlacements]
        : rawPlacements,
    [rawPlacements, previewItemId, previewPlacements],
  );

  // Varil / box / palet index mapping: globalIdx ↔ per-geometry instanceIdx
  // boxIndices[instanceIdx] = globalIdx, cylIndices[instanceIdx] = globalIdx
  // paletIndices: globalIdx listesi (InstancedMesh yerine BoxWrapper ile render edilir)
  const { boxIndices, cylIndices, paletIndices } = useMemo(() => {
    const box: number[] = [];
    const cyl: number[] = [];
    const pal: number[] = [];
    placements.forEach((p, i) => {
      if (p.productType === 'varil') cyl.push(i);
      else if (p.productType === 'palet') pal.push(i);
      else box.push(i);
    });
    return { boxIndices: box, cylIndices: cyl, paletIndices: pal };
  }, [placements]);

  const selectedItemId = useSceneStore((s) => s.selectedItemId);
  const selectedInstanceId = useSceneStore((s) => s.selectedInstanceId);
  const hiddenItemIds = useSceneStore((s) => s.hiddenItemIds);
  const activeLayer = useSceneStore((s) => s.activeLayer);
  const xRayMode = useSceneStore((s) => s.xRayMode);
  const focusedGroupItemIds = useSceneStore((s) => s.focusedGroupItemIds);
  const setSelectedItemId = useSceneStore((s) => s.setSelectedItemId);
  const setSelectedInstanceId = useSceneStore((s) => s.setSelectedInstanceId);
  const { startDrag } = useDragBox();
  const [dragState, setDragState] = useState<DragState | null>(null);

  useEffect(() => {
    for (const ref of [
      opaqueRef,
      ghostWireRef,
      violationRef,
      opaqueCylRef,
      ghostWireCylRef,
      violationCylRef,
    ]) {
      if (ref.current) {
        ref.current.frustumCulled = false;
        ref.current.matrixAutoUpdate = false;
      }
    }
  }, []);

  useEffect(() => {
    if (
      !opaqueRef.current ||
      !ghostWireRef.current ||
      !violationRef.current ||
      !opaqueCylRef.current ||
      !ghostWireCylRef.current ||
      !violationCylRef.current
    )
      return;

    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    const quaternion = new THREE.Quaternion();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();

    function writeInstance(globalIdx: number, instanceIdx: number, isVaril: boolean) {
      const p = placements[globalIdx];
      const visible = isPlacementVisible(p, globalIdx, {
        selectedInstanceId,
        selectedItemId,
        hiddenItemIds,
      });
      const ghosted = isGhosted(p, activeLayer, focusedGroupItemIds);

      const px = dragState?.idx === globalIdx ? dragState.x : p.positionX;
      const py = dragState?.idx === globalIdx ? dragState.y : p.positionY;
      const pz = dragState?.idx === globalIdx ? dragState.z : p.positionZ;

      const base = rotatedDimensions(p.width, p.height, p.depth, p.orientationIndex);
      const radius = Math.min(p.width, p.depth) / 2;
      applyOrientationQuaternion(quaternion, p.orientationIndex);
      position.set(px + p.width / 2, py + p.height / 2, pz + p.depth / 2);

      const oRef = isVaril ? opaqueCylRef : opaqueRef;
      const gRef = isVaril ? ghostWireCylRef : ghostWireRef;
      const vRef = isVaril ? violationCylRef : violationRef;

      // Cylinder: scale.x/z = radius (unit cylinder r=0.5 → ×2r), scale.y = height
      // Box: scale = dimensions
      const sw = isVaril ? radius * 2 : base.width;
      const sh = isVaril ? p.height : base.height;
      const sd = isVaril ? radius * 2 : base.depth;

      if (visible && !ghosted) scale.set(sw, sh, sd);
      else scale.copy(SCALE_ZERO);
      matrix.compose(position, quaternion, scale);
      oRef.current!.setMatrixAt(instanceIdx, matrix);

      if (visible && ghosted) scale.set(sw, sh, sd);
      else scale.copy(SCALE_ZERO);
      matrix.compose(position, quaternion, scale);
      gRef.current!.setMatrixAt(instanceIdx, matrix);

      if (xRayMode && p.isViolation && visible) scale.set(sw, sh, sd);
      else scale.copy(SCALE_ZERO);
      matrix.compose(position, quaternion, scale);
      vRef.current!.setMatrixAt(instanceIdx, matrix);

      color.copy(p.isViolation ? COLOR_VIOLATION : p.color ? color.set(p.color) : COLOR_NORMAL);
      oRef.current!.setColorAt(instanceIdx, color);
    }

    boxIndices.forEach((globalIdx, instanceIdx) => writeInstance(globalIdx, instanceIdx, false));
    cylIndices.forEach((globalIdx, instanceIdx) => writeInstance(globalIdx, instanceIdx, true));

    for (const ref of [
      opaqueRef,
      ghostWireRef,
      violationRef,
      opaqueCylRef,
      ghostWireCylRef,
      violationCylRef,
    ]) {
      if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
    }
    if (opaqueRef.current?.instanceColor) opaqueRef.current.instanceColor.needsUpdate = true;
    if (opaqueCylRef.current?.instanceColor) opaqueCylRef.current.instanceColor.needsUpdate = true;
  }, [
    placements,
    boxIndices,
    cylIndices,
    selectedItemId,
    selectedInstanceId,
    hiddenItemIds,
    activeLayer,
    xRayMode,
    focusedGroupItemIds,
    dragState,
  ]);

  // Build edge lineSegments geometry for all visible non-ghosted boxes.
  // InstancedMesh cannot render EdgesGeometry (line primitives), so we build
  // a single lineSegments with all box edges pre-transformed in world space.
  const edgesLineGeo = useMemo(() => {
    return buildEdgesGeometry(placements, {
      selectedInstanceId,
      selectedItemId,
      hiddenItemIds,
      activeLayer,
      focusedGroupItemIds,
      dragState,
    });
  }, [
    placements,
    selectedInstanceId,
    selectedItemId,
    hiddenItemIds,
    activeLayer,
    focusedGroupItemIds,
    dragState,
  ]);

  useEffect(() => () => edgesLineGeo.dispose(), [edgesLineGeo]);

  // Palet seçimini kendi BoxWrapper render döngüsü yönetir
  const selectedPlacements = useMemo(
    () =>
      placements
        .map((p, idx) => ({ p, idx }))
        .filter(
          ({ p, idx }) =>
            p.productType !== 'palet' &&
            ((selectedInstanceId !== null && idx === selectedInstanceId) ||
              (selectedInstanceId === null && p.itemId === selectedItemId)),
        ),
    [placements, selectedItemId, selectedInstanceId],
  );

  return (
    <>
      {/* ── Box (koli/palet) InstancedMesh'ler ── */}
      <instancedMesh
        key={`opaque-${placements.length}`}
        ref={opaqueRef}
        args={[undefined, undefined, Math.max(1, boxIndices.length)]}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          const iid = e.instanceId;
          if (iid === undefined) return;
          const globalIdx = boxIndices[iid];
          if (globalIdx === undefined) return;
          setSelectedItemId(null);
          setSelectedInstanceId(selectedInstanceId === globalIdx ? null : globalIdx);
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          const iid = e.instanceId;
          if (iid === undefined || !vehicle) return;
          const globalIdx = boxIndices[iid];
          if (globalIdx === undefined) return;
          setSelectedItemId(null);
          setSelectedInstanceId(globalIdx);
          startDrag(globalIdx, placements, vehicle, setDragState, e);
        }}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial transparent opacity={0.85} />
      </instancedMesh>

      <instancedMesh
        key={`ghost-${placements.length}`}
        ref={ghostWireRef}
        args={[undefined, undefined, Math.max(1, boxIndices.length)]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          color="#94a3b8"
          wireframe
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </instancedMesh>

      <instancedMesh
        key={`violation-${placements.length}`}
        ref={violationRef}
        args={[undefined, undefined, Math.max(1, boxIndices.length)]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          color={SCENE.COLORS.VIOLATION}
          wireframe
          depthTest={false}
          transparent
          opacity={0.9}
        />
      </instancedMesh>

      {/* ── Cylinder (varil) InstancedMesh'ler ── */}
      <instancedMesh
        key={`opaque-cyl-${placements.length}`}
        ref={opaqueCylRef}
        args={[undefined, undefined, Math.max(1, cylIndices.length)]}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          const iid = e.instanceId;
          if (iid === undefined) return;
          const globalIdx = cylIndices[iid];
          if (globalIdx === undefined) return;
          setSelectedItemId(null);
          setSelectedInstanceId(selectedInstanceId === globalIdx ? null : globalIdx);
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          const iid = e.instanceId;
          if (iid === undefined || !vehicle) return;
          const globalIdx = cylIndices[iid];
          if (globalIdx === undefined) return;
          setSelectedItemId(null);
          setSelectedInstanceId(globalIdx);
          startDrag(globalIdx, placements, vehicle, setDragState, e);
        }}
      >
        <cylinderGeometry args={[0.5, 0.5, 1, 16]} />
        <meshStandardMaterial transparent opacity={0.85} />
      </instancedMesh>

      <instancedMesh
        key={`ghost-cyl-${placements.length}`}
        ref={ghostWireCylRef}
        args={[undefined, undefined, Math.max(1, cylIndices.length)]}
      >
        <cylinderGeometry args={[0.5, 0.5, 1, 16]} />
        <meshBasicMaterial
          color="#94a3b8"
          wireframe
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </instancedMesh>

      <instancedMesh
        key={`violation-cyl-${placements.length}`}
        ref={violationCylRef}
        args={[undefined, undefined, Math.max(1, cylIndices.length)]}
      >
        <cylinderGeometry args={[0.5, 0.5, 1, 16]} />
        <meshBasicMaterial
          color={SCENE.COLORS.VIOLATION}
          wireframe
          depthTest={false}
          transparent
          opacity={0.9}
        />
      </instancedMesh>

      {/* Edge lines — tüm görünür kutular için tek lineSegments çizimi */}
      <lineSegments geometry={edgesLineGeo}>
        <lineBasicMaterial color="#000000" />
      </lineSegments>

      {/* Landing wireframe — previewPlacements animasyon süresince */}
      {previewPlacements.map((p, idx) => {
        const key = `${p.itemId}-${idx}`;
        return (
          <LandingWireframe
            key={`landing-${key}`}
            placement={p}
            meshRefCallback={(node) => {
              if (node) {
                landingMeshRefs.current.set(key, node);
              } else {
                landingMeshRefs.current.delete(key);
              }
            }}
          />
        );
      })}

      {/* Palet items — InstancedMesh yerine ayrı BoxWrapper (tahtalı yapı için) */}
      {paletIndices.map((globalIdx) => {
        const p = placements[globalIdx];
        const visible = isPlacementVisible(p, globalIdx, {
          selectedInstanceId,
          selectedItemId,
          hiddenItemIds,
        });
        if (!visible) return null;
        const ghosted = isGhosted(p, activeLayer, focusedGroupItemIds);
        const isItemSelected =
          selectedInstanceId === globalIdx ||
          (selectedInstanceId === null && p.itemId === selectedItemId);
        const ds = dragState?.idx === globalIdx ? dragState : null;
        return (
          <BoxWrapper
            key={`palet-${globalIdx}`}
            width={p.width}
            height={p.height}
            depth={p.depth}
            positionX={ds ? ds.x : p.positionX}
            positionY={ds ? ds.y : p.positionY}
            positionZ={ds ? ds.z : p.positionZ}
            color={
              p.isViolation ? SCENE.COLORS.VIOLATION_STR : (p.color ?? SCENE.COLORS.NORMAL_STR)
            }
            itemId={p.itemId}
            isSelected={isItemSelected}
            isGhosted={ghosted}
            productType={p.productType}
            onClick={() => {
              setSelectedItemId(null);
              setSelectedInstanceId(selectedInstanceId === globalIdx ? null : globalIdx);
            }}
            onPointerDown={(e) => {
              if (!vehicle) return;
              setSelectedItemId(null);
              setSelectedInstanceId(globalIdx);
              startDrag(globalIdx, placements, vehicle, setDragState, e);
            }}
          />
        );
      })}

      {/* Selected box — BoxWrapper ile glow */}
      {selectedPlacements.map(({ p, idx }) => {
        const ds = dragState?.idx === idx ? dragState : null;
        const px = ds ? ds.x : p.positionX;
        const py = ds ? ds.y : p.positionY;
        const pz = ds ? ds.z : p.positionZ;
        return (
          <BoxWrapper
            key={`glow-${idx}`}
            width={p.width}
            height={p.height}
            depth={p.depth}
            positionX={px}
            positionY={py}
            positionZ={pz}
            color={
              p.isViolation ? SCENE.COLORS.VIOLATION_STR : (p.color ?? SCENE.COLORS.NORMAL_STR)
            }
            itemId={p.itemId}
            isSelected={true}
            productType={p.productType}
            onClick={() => {
              setSelectedItemId(null);
              setSelectedInstanceId(selectedInstanceId === idx ? null : idx);
            }}
            onPointerDown={(e) => {
              if (!vehicle) return;
              startDrag(idx, placements, vehicle, setDragState, e);
            }}
          />
        );
      })}
    </>
  );
}

// ─── CargoMeshInstanced ────────────────────────────────────────────────────────

export function CargoMeshInstanced({ planId: _planId }: CargoMeshInstancedProps) {
  const rawPlacements = usePlanStore((s) => s.placements);
  const previewItemId = usePlanStore((s) => s.previewItemId);
  const previewPlacements = usePlanStore((s) => s.previewPlacements);
  const clearPreview = usePlanStore((s) => s.clearPreview);
  const vehicle = usePlanStore((s) => s.selectedVehicle);

  const placements = useMemo(
    () =>
      previewItemId
        ? [...rawPlacements.filter((p) => p.itemId !== previewItemId), ...previewPlacements]
        : rawPlacements,
    [rawPlacements, previewItemId, previewPlacements],
  );
  const selectedItemId = useSceneStore((s) => s.selectedItemId);
  const selectedInstanceId = useSceneStore((s) => s.selectedInstanceId);
  const hiddenItemIds = useSceneStore((s) => s.hiddenItemIds);
  const activeLayer = useSceneStore((s) => s.activeLayer);
  const focusedGroupItemIds = useSceneStore((s) => s.focusedGroupItemIds);
  const setSelectedItemId = useSceneStore((s) => s.setSelectedItemId);
  const setSelectedInstanceId = useSceneStore((s) => s.setSelectedInstanceId);
  const { startDrag } = useDragBox();
  const [dragState, setDragState] = useState<DragState | null>(null);

  const handleAllSettled = useCallback(() => {
    clearPreview();
  }, [clearPreview]);

  // < INSTANCED_THRESHOLD yolu için landing animasyonu
  const landingMeshRefs = useLandingAnimation(
    previewPlacements,
    rawPlacements.length,
    handleAllSettled,
  );

  if (placements.length === 0) return null;

  if (placements.length < INSTANCED_THRESHOLD) {
    return (
      <>
        {placements.map((p, i) => {
          const isInstanceSelected = selectedInstanceId === i;
          const isItemSelected = p.itemId === selectedItemId;
          const ghosted = isGhosted(p, activeLayer, focusedGroupItemIds);
          const ds = dragState?.idx === i ? dragState : null;
          const px = ds ? ds.x : p.positionX;
          const py = ds ? ds.y : p.positionY;
          const pz = ds ? ds.z : p.positionZ;
          return (
            <BoxWrapper
              key={`${p.itemId}-${i}`}
              width={p.width}
              height={p.height}
              depth={p.depth}
              positionX={px}
              positionY={py}
              positionZ={pz}
              color={
                p.isViolation ? SCENE.COLORS.VIOLATION_STR : (p.color ?? SCENE.COLORS.NORMAL_STR)
              }
              itemId={p.itemId}
              isSelected={isInstanceSelected || isItemSelected}
              isHidden={hiddenItemIds.includes(p.itemId)}
              isGhosted={ghosted}
              productType={p.productType}
              onClick={() => {
                setSelectedItemId(null);
                setSelectedInstanceId(selectedInstanceId === i ? null : i);
              }}
              onPointerDown={(e) => {
                if (!vehicle) return;
                setSelectedItemId(null);
                setSelectedInstanceId(i);
                startDrag(i, placements, vehicle, setDragState, e);
              }}
            />
          );
        })}
        {/* Landing wireframe — < threshold yolu */}
        {previewPlacements.map((p, idx) => {
          const key = `${p.itemId}-${idx}`;
          return (
            <LandingWireframe
              key={`landing-${key}`}
              placement={p}
              meshRefCallback={(node) => {
                if (node) {
                  landingMeshRefs.current.set(key, node);
                } else {
                  landingMeshRefs.current.delete(key);
                }
              }}
            />
          );
        })}
      </>
    );
  }

  return <InstancedBoxes />;
}
