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
import { useLoadingAnimation } from '@/features/planning/components/scene/useLoadingAnimation';
import { buildLoadOrder } from '@/lib/utils/loadOrder';
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
  readOnly?: boolean;
}

// ─── InstancedBoxes ────────────────────────────────────────────────────────────

function InstancedBoxes({ readOnly = false }: { readOnly?: boolean }) {
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
  const animationMode = useSceneStore((s) => s.animationMode);
  const setSelectedItemId = useSceneStore((s) => s.setSelectedItemId);
  const setSelectedInstanceId = useSceneStore((s) => s.setSelectedInstanceId);
  const { startDrag } = useDragBox();
  const [dragState, setDragState] = useState<DragState | null>(null);

  // Animasyon için: globalIdx → geçerli pozisyon (cm, merkez)
  // Animasyon aktif değilken placements'tan hedef pozisyon kullanılır
  const animPositionsRef = useRef<Map<number, THREE.Vector3>>(new Map());

  // Animasyon için yükleme sırası (arka→ön, alt→üst, sol→sağ)
  const loadOrder = useMemo(() => buildLoadOrder(placements), [placements]);

  const isAnimActive = animationMode === 'playing' || animationMode === 'stepped';

  // setPosition callback — useLoadingAnimation tarafından her frame'de çağrılır
  const setAnimPosition = useCallback((globalIdx: number, x: number, y: number, z: number) => {
    let v = animPositionsRef.current.get(globalIdx);
    if (!v) {
      v = new THREE.Vector3();
      animPositionsRef.current.set(globalIdx, v);
    }
    v.set(x, y, z);
  }, []);

  // onFrameUpdate — animasyon her frame bittikten sonra InstancedMesh matrislerini güncelle
  const onFrameUpdate = useCallback(() => {
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

    const currentAnimMode = useSceneStore.getState().animationMode;
    const currentAnimStep = useSceneStore.getState().animationStep;
    const isPlaying = currentAnimMode === 'playing';
    const isStepped = currentAnimMode === 'stepped';

    function writeAnimInstance(globalIdx: number, instanceIdx: number, isVaril: boolean) {
      const p = placements[globalIdx];
      if (!p) return;

      const oRef = isVaril ? opaqueCylRef : opaqueRef;
      const gRef = isVaril ? ghostWireCylRef : ghostWireRef;
      const vRef = isVaril ? violationCylRef : violationRef;

      const base = rotatedDimensions(p.width, p.height, p.depth, p.orientationIndex);
      const radius = Math.min(p.width, p.depth) / 2;
      applyOrientationQuaternion(quaternion, p.orientationIndex);

      const sw = isVaril ? radius * 2 : base.width;
      const sh = isVaril ? p.height : base.height;
      const sd = isVaril ? radius * 2 : base.depth;

      // stepped: sadece animationStep'e kadar olanlar görünür
      const seqIdx = loadOrder.indexOf(globalIdx);
      const visibleInStep = isStepped ? seqIdx < currentAnimStep : true;
      const visibleInPlay = isPlaying; // playing modda hook pozisyon set ettiğinde görünür

      const show = visibleInStep || visibleInPlay;

      if (show) {
        const animPos = animPositionsRef.current.get(globalIdx);
        if (animPos) {
          position.copy(animPos);
        } else {
          position.set(
            p.positionX + p.width / 2,
            p.positionY + p.height / 2,
            p.positionZ + p.depth / 2,
          );
        }
        scale.set(sw, sh, sd);
      } else {
        position.set(
          p.positionX + p.width / 2,
          p.positionY + p.height / 2,
          p.positionZ + p.depth / 2,
        );
        scale.copy(SCALE_ZERO);
      }

      matrix.compose(position, quaternion, scale);
      oRef.current!.setMatrixAt(instanceIdx, matrix);

      // Ghost ve violation her zaman gizli animasyon sırasında
      scale.copy(SCALE_ZERO);
      matrix.compose(position, quaternion, scale);
      gRef.current!.setMatrixAt(instanceIdx, matrix);
      vRef.current!.setMatrixAt(instanceIdx, matrix);

      color.copy(p.isViolation ? COLOR_VIOLATION : p.color ? color.set(p.color) : COLOR_NORMAL);
      oRef.current!.setColorAt(instanceIdx, color);
    }

    boxIndices.forEach((globalIdx, instanceIdx) =>
      writeAnimInstance(globalIdx, instanceIdx, false),
    );
    cylIndices.forEach((globalIdx, instanceIdx) => writeAnimInstance(globalIdx, instanceIdx, true));

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
  }, [placements, boxIndices, cylIndices, loadOrder]);

  useLoadingAnimation(placements, loadOrder, setAnimPosition, onFrameUpdate, vehicle?.length);

  // Animasyon idle'a döndüğünde pozisyon cache'ini temizle
  useEffect(() => {
    if (animationMode === 'idle') {
      animPositionsRef.current.clear();
    }
  }, [animationMode]);

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
    // Animasyon aktifken useFrame içindeki onFrameUpdate matris yazıyor — çift yazımı önle
    if (isAnimActive) return;

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
    isAnimActive,
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
          if (readOnly) return;
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
          if (readOnly) return;
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

      {/* Edge lines — animasyon sırasında gizle, kutular hareket ederken statik durmasın */}
      <lineSegments geometry={edgesLineGeo} visible={!isAnimActive}>
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
              if (readOnly || !vehicle) return;
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
              if (readOnly || !vehicle) return;
              startDrag(idx, placements, vehicle, setDragState, e);
            }}
          />
        );
      })}
    </>
  );
}

// ─── BoxPathBoxes ──────────────────────────────────────────────────────────────
// < INSTANCED_THRESHOLD senaryosu için BoxWrapper tabanlı render.
// BoxWrapper'da edge geo group pozisyonuna relatif olduğundan
// animasyonu position prop'larından geçirmek yeterli — ayrı wireframe gizleme gerekmez.

function BoxPathBoxes({ readOnly = false }: { readOnly?: boolean }) {
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
  const animationMode = useSceneStore((s) => s.animationMode);
  const setSelectedItemId = useSceneStore((s) => s.setSelectedItemId);
  const setSelectedInstanceId = useSceneStore((s) => s.setSelectedInstanceId);
  const { startDrag } = useDragBox();
  const [dragState, setDragState] = useState<DragState | null>(null);

  const handleAllSettled = useCallback(() => clearPreview(), [clearPreview]);
  const landingMeshRefs = useLandingAnimation(
    previewPlacements,
    rawPlacements.length,
    handleAllSettled,
  );

  const loadOrder = useMemo(() => buildLoadOrder(placements), [placements]);
  const isAnimActive = animationMode === 'playing' || animationMode === 'stepped';

  // Animasyonlu pozisyon state: globalIdx → merkez koordinatları
  // useState olarak tutulur — render sırasında okunabilir (ref kuralı ihlali yok)
  const [animPositions, setAnimPositions] = useState<
    Map<number, { x: number; y: number; z: number }>
  >(() => new Map());

  const setAnimPosition = useCallback((globalIdx: number, x: number, y: number, z: number) => {
    setAnimPositions((prev) => {
      const next = new Map(prev);
      next.set(globalIdx, { x, y, z });
      return next;
    });
  }, []);

  const onFrameUpdate = useCallback(() => {
    // setAnimPosition zaten state update tetikliyor — ek forceUpdate gerekmez
  }, []);

  useLoadingAnimation(placements, loadOrder, setAnimPosition, onFrameUpdate, vehicle?.length);

  return (
    <>
      {placements.map((p, i) => {
        const isInstanceSelected = selectedInstanceId === i;
        const isItemSelected = p.itemId === selectedItemId;
        const ghosted = isGhosted(p, activeLayer, focusedGroupItemIds);
        const ds = dragState?.idx === i ? dragState : null;

        // Animasyon aktifken stepped modda henüz gelmemiş kutuları gizle
        const seqIdx = isAnimActive ? loadOrder.indexOf(i) : -1;
        const hiddenByAnim =
          animationMode === 'stepped' &&
          seqIdx >= 0 &&
          seqIdx >= useSceneStore.getState().animationStep;

        // Animasyon pozisyonunu al (playing modunda hook tarafından set edilir)
        const animPos = isAnimActive ? animPositions.get(i) : undefined;

        // AnimPos merkez koordinatı — BoxWrapper bottom-left-rear bekliyor, ters çevir
        let px: number, py: number, pz: number;
        if (animPos) {
          px = animPos.x - p.width / 2;
          py = animPos.y - p.height / 2;
          pz = animPos.z - p.depth / 2;
        } else {
          px = ds ? ds.x : p.positionX;
          py = ds ? ds.y : p.positionY;
          pz = ds ? ds.z : p.positionZ;
        }

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
            isHidden={hiddenItemIds.includes(p.itemId) || hiddenByAnim}
            isGhosted={ghosted}
            productType={p.productType}
            onClick={() => {
              setSelectedItemId(null);
              setSelectedInstanceId(selectedInstanceId === i ? null : i);
            }}
            onPointerDown={(e) => {
              if (readOnly || !vehicle) return;
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
              if (node) landingMeshRefs.current.set(key, node);
              else landingMeshRefs.current.delete(key);
            }}
          />
        );
      })}
    </>
  );
}

// ─── CargoMeshInstanced ────────────────────────────────────────────────────────

export function CargoMeshInstanced({ planId: _planId, readOnly = false }: CargoMeshInstancedProps) {
  const rawPlacements = usePlanStore((s) => s.placements);
  const previewItemId = usePlanStore((s) => s.previewItemId);
  const previewPlacements = usePlanStore((s) => s.previewPlacements);

  const placements = useMemo(
    () =>
      previewItemId
        ? [...rawPlacements.filter((p) => p.itemId !== previewItemId), ...previewPlacements]
        : rawPlacements,
    [rawPlacements, previewItemId, previewPlacements],
  );

  if (placements.length === 0) return null;
  if (placements.length < INSTANCED_THRESHOLD) return <BoxPathBoxes readOnly={readOnly} />;
  return <InstancedBoxes readOnly={readOnly} />;
}
