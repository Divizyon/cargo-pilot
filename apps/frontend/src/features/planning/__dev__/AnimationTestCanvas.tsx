/**
 * Geliştirme/test bileşeni — animasyon prototipini mock veriyle çalıştırır.
 * Production build'e dahil edilmez; sadece geliştirme ortamında kullanılır.
 */

import { useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { SCENE } from '@/lib/config/scene-config';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { useLoadingAnimation } from '@/features/planning/components/scene/useLoadingAnimation';
import { StepAnimationControls } from '@/features/planning/components/scene/StepAnimationControls';
import {
  MOCK_VEHICLE,
  MOCK_PLACEMENTS,
  sortByLoadOrder,
} from '@/features/planning/__dev__/mockLoadingPlan';
import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';

// ─── Yardımcı: konteyner çerçevesi ───────────────────────────────────────────

function ContainerWireframe() {
  const { length: L, width: W, height: H } = MOCK_VEHICLE;
  // Origin: sol-alt-arka → merkeze kaydır
  return (
    <group position={[L / 2, H / 2, W / 2]}>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(L, H, W)]} />
        <lineBasicMaterial color="#334155" />
      </lineSegments>
      {/* Kapı yüzeyi (Z=0 — ön) */}
      <mesh position={[0, 0, -W / 2]} rotation={[0, 0, 0]}>
        <planeGeometry args={[L, H]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ─── Animasyonlu kutu katmanı ─────────────────────────────────────────────────

const SCALE_ZERO = new THREE.Vector3(0, 0, 0);
const SCALE_ONE = new THREE.Vector3(1, 1, 1);

function AnimatedBoxes({
  placements,
  loadOrder,
}: {
  placements: PlacementWithDimensions[];
  loadOrder: number[];
}) {
  const animationMode = useSceneStore((s) => s.animationMode);
  const animationStep = useSceneStore((s) => s.animationStep);

  // Her kutu için ayrı InstancedMesh yerine basit BoxWrapper mesh ref array kullanıyoruz
  // (bu test sahnesinde kutu sayısı düşük, 50 altı)
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const posRef = useRef<THREE.Vector3[]>(
    placements.map(
      (p) =>
        new THREE.Vector3(
          p.positionX + p.width / 2,
          p.positionY + p.height / 2,
          p.positionZ + p.depth / 2,
        ),
    ),
  );
  const _dummy = new THREE.Object3D();
  void _dummy;

  const setPosition = useCallback((globalIdx: number, x: number, y: number, z: number) => {
    posRef.current[globalIdx]?.set(x, y, z);
  }, []);

  const onFrameUpdate = useCallback(() => {
    meshRefs.current.forEach((mesh, globalIdx) => {
      if (!mesh) return;
      const pos = posRef.current[globalIdx];
      if (!pos) return;

      // stepped modda: loadOrder'daki seq'e göre görünürlük
      if (animationMode === 'stepped') {
        const seqIdx = loadOrder.indexOf(globalIdx);
        const visible = seqIdx < animationStep;
        mesh.scale.copy(visible ? SCALE_ONE : SCALE_ZERO);
        if (visible) mesh.position.copy(pos);
      } else if (animationMode === 'playing') {
        mesh.scale.copy(SCALE_ONE);
        mesh.position.copy(pos);
      } else {
        // idle — hepsi görünür, hedef konumda
        mesh.scale.copy(SCALE_ONE);
        mesh.position.copy(pos);
      }
    });
  }, [animationMode, animationStep, loadOrder]);

  const { play, goToStep, totalSteps } = useLoadingAnimation(
    placements,
    loadOrder,
    setPosition,
    onFrameUpdate,
  );

  // idle modda her frame'de hedef pozisyonları uygula
  useFrame(() => {
    if (animationMode === 'idle') {
      meshRefs.current.forEach((mesh, globalIdx) => {
        if (!mesh) return;
        const p = placements[globalIdx];
        if (!p) return;
        mesh.scale.copy(SCALE_ONE);
        mesh.position.set(
          p.positionX + p.width / 2,
          p.positionY + p.height / 2,
          p.positionZ + p.depth / 2,
        );
      });
    }
  });

  return (
    <>
      {placements.map((p, globalIdx) => (
        <mesh
          key={p.itemId + globalIdx}
          ref={(el) => {
            meshRefs.current[globalIdx] = el;
          }}
          position={[
            p.positionX + p.width / 2,
            p.positionY + p.height / 2,
            p.positionZ + p.depth / 2,
          ]}
        >
          <boxGeometry args={[p.width, p.height, p.depth]} />
          <meshStandardMaterial
            color={p.color ?? SCENE.COLORS.NORMAL_STR}
            transparent={false}
            depthWrite={true}
          />
        </mesh>
      ))}

      {/* Kenar çizgileri: ileride eklenecek */}

      {/* Kontrol paneli — HTML overlay, Canvas dışında olmalı ama
          useLoadingAnimation sadece Canvas içinde çalışır.
          Çözüm: play/goToStep fonksiyonlarını parent'a taşı.
          Bu test bileşeninde sadece store üzerinden kontrol yeterli. */}
      <ControlBridge play={play} goToStep={goToStep} totalSteps={totalSteps} />
    </>
  );
}

// useLoadingAnimation hook'un döndürdüğü play/goToStep fonksiyonlarını
// Canvas dışındaki UI'a köprüleyen küçük bir R3F bileşeni
const controlRef = {
  play: () => {},
  goToStep: (_: number) => {},
  totalSteps: 0,
};

function ControlBridge({
  play,
  goToStep,
  totalSteps,
}: {
  play: () => void;
  goToStep: (step: number) => void;
  totalSteps: number;
}) {
  controlRef.play = play;
  controlRef.goToStep = goToStep;
  controlRef.totalSteps = totalSteps;
  return null;
}

// ─── Ana bileşen ─────────────────────────────────────────────────────────────

export function AnimationTestCanvas() {
  const placements = MOCK_PLACEMENTS;
  const loadOrder = useMemo(
    () => sortByLoadOrder(placements).map((sorted) => placements.indexOf(sorted)),
    [placements],
  );

  const totalSteps = loadOrder.length;

  return (
    <div className="flex h-screen flex-col bg-gray-100">
      {/* Başlık */}
      <div className="border-b bg-white px-4 py-3">
        <p className="text-sm font-medium">Yükleme Animasyonu — Dev Test</p>
        <p className="text-xs text-muted-foreground">
          Mock: {MOCK_VEHICLE.name} · {placements.length} kutu
        </p>
      </div>

      {/* 3D Canvas */}
      <div className="relative flex-1">
        <Canvas
          camera={{
            position: SCENE.CAMERA_POSITION,
            fov: SCENE.CAMERA_FOV,
            near: SCENE.CAMERA_NEAR,
            far: SCENE.CAMERA_FAR,
          }}
          gl={{ antialias: true }}
          shadows
          style={{ width: '100%', height: '100%' }}
        >
          <color attach="background" args={[SCENE.BACKGROUND_COLOR]} />
          <ambientLight intensity={SCENE.AMBIENT_INTENSITY} />
          <directionalLight
            position={SCENE.DIRECTIONAL_POSITION}
            intensity={SCENE.DIRECTIONAL_INTENSITY}
            castShadow
          />

          <OrbitControls
            enableDamping
            dampingFactor={SCENE.ORBIT_DAMPING_FACTOR}
            minDistance={SCENE.ORBIT_MIN_DISTANCE}
            maxDistance={SCENE.ORBIT_MAX_DISTANCE}
          />

          <ContainerWireframe />
          <AnimatedBoxes placements={placements} loadOrder={loadOrder} />
        </Canvas>

        {/* Overlay kontrol paneli */}
        <div className="absolute bottom-4 left-1/2 w-[480px] -translate-x-1/2">
          <StepAnimationControls totalSteps={totalSteps} onPlay={() => controlRef.play()} />
        </div>
      </div>
    </div>
  );
}
