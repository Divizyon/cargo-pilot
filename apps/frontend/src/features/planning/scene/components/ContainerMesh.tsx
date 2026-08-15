// BoxWrapper kuralı kargo kutuları içindir; konteyner kapakları için geçerli değil.
/* eslint-disable no-restricted-syntax */
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { ContactShadows, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { SCENE } from '@/lib/config/scene-config';
import { DoorType, DoorFace, findDoor, type VehicleDoor } from '@/lib/types/vehicle';
import { ContainerBody } from './ContainerBody';

import normalUrl from '@/assets/textures/container-steel/normal.jpg';
// metalness.jpg, roughness.jpg ile birebir ayni dosyaydi. Vite ayni icerikli
// iki varligi tek dosyaya indirdigi icin metalness URL'i 404 veriyordu; tek
// doku iki haritaya da veriliyor.
import roughnessUrl from '@/assets/textures/container-steel/roughness.jpg';
import aoUrl from '@/assets/textures/container-steel/ao.jpg';

const UV_SCALE = 0.008;

function DoorPanel({
  width,
  height,
  length = 0.1,
}: {
  width: number;
  height: number;
  length?: number;
}) {
  const [normalMap, roughnessMap, aoMap] = useTexture([normalUrl, roughnessUrl, aoUrl]);

  useEffect(() => {
    for (const tex of [normalMap, roughnessMap, aoMap]) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(width * UV_SCALE, height * UV_SCALE);
      tex.needsUpdate = true;
    }
  }, [width, height, normalMap, roughnessMap, aoMap]);

  return (
    <mesh position={[width / 2, height / 2, 0]}>
      <boxGeometry args={[width, height, length]} />
      <meshStandardMaterial
        normalMap={normalMap}
        roughnessMap={roughnessMap}
        metalnessMap={roughnessMap}
        aoMap={aoMap}
        metalness={0.45}
        roughness={0.7}
      />
    </mesh>
  );
}

// ─── ContainerEdges ────────────────────────────────────────────────────────────

function ContainerEdges({
  width,
  height,
  length,
}: {
  width: number;
  height: number;
  length: number;
}) {
  const edgesGeo = useMemo(() => {
    const box = new THREE.BoxGeometry(width, height, length);
    const edges = new THREE.EdgesGeometry(box);
    box.dispose();
    return edges;
  }, [width, height, length]);

  return (
    <lineSegments geometry={edgesGeo} position={[width / 2, height / 2, length / 2]}>
      <lineBasicMaterial color={SCENE.COLORS.CONTAINER_EDGE} />
    </lineSegments>
  );
}

// ─── Shared door constants (values from scene-config) ─────────────────────────

const DOOR_THICKNESS = SCENE.DOOR_THICKNESS_CM;
const DOOR_OPEN_ANGLE = SCENE.DOOR_REAR_OPEN_ANGLE;
const DOOR_SIDE_OPEN_ANGLE = SCENE.DOOR_SIDE_OPEN_ANGLE;
const DOOR_EASING = SCENE.DOOR_EASING;

// ─── Reference door helpers (X-axis panel on the z = length face) ────────────

function RearDoorGrid({ panelW, height, sign }: { panelW: number; height: number; sign: 1 | -1 }) {
  const geometry = useMemo(() => {
    const step = SCENE.GRID_STEP_CM;
    const z = -(DOOR_THICKNESS + 0.5);
    const pts: number[] = [];

    for (let x = 0; x <= panelW; x += step) {
      pts.push(sign * x, 0, z, sign * x, height, z);
    }
    for (let y = 0; y <= height; y += step) {
      pts.push(0, y, z, sign * panelW, y, z);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, [panelW, height, sign]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={SCENE.COLORS.CONTAINER_EDGE} opacity={0.18} transparent />
    </lineSegments>
  );
}

function RearDoorFrame({ panelW, height, sign }: { panelW: number; height: number; sign: 1 | -1 }) {
  const geometry = useMemo(() => {
    const z = -(DOOR_THICKNESS + 0.5);
    const ex = sign * panelW;
    const pts = [
      0,
      0,
      z,
      ex,
      0,
      z,
      ex,
      0,
      z,
      ex,
      height,
      z,
      ex,
      height,
      z,
      0,
      height,
      z,
      0,
      height,
      z,
      0,
      0,
      z,
    ];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, [panelW, height, sign]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={SCENE.COLORS.CONTAINER_EDGE} />
    </lineSegments>
  );
}

function RearDoorPanel({ panelW, height, sign }: { panelW: number; height: number; sign: 1 | -1 }) {
  return (
    <group>
      <group scale={[sign, 1, 1]}>
        <DoorPanel width={panelW} height={height} />
      </group>
      <RearDoorGrid panelW={panelW} height={height} sign={sign} />
      <RearDoorFrame panelW={panelW} height={height} sign={sign} />
    </group>
  );
}

function RearDoors({ width, height }: { width: number; height: number }) {
  const leftRef = useRef<THREE.Group>(null);
  const rightRef = useRef<THREE.Group>(null);
  const angleRef = useRef(0);

  useFrame(() => {
    const diff = DOOR_OPEN_ANGLE - angleRef.current;
    if (Math.abs(diff) > 0.0005) {
      angleRef.current += diff * DOOR_EASING;
      if (leftRef.current) leftRef.current.rotation.y = angleRef.current;
      if (rightRef.current) rightRef.current.rotation.y = -angleRef.current;
    }
  });

  const panelW = width / 2;

  return (
    <group>
      <group ref={leftRef}>
        <RearDoorPanel panelW={panelW} height={height} sign={1} />
      </group>
      <group ref={rightRef} position={[width, 0, 0]}>
        <RearDoorPanel panelW={panelW} height={height} sign={-1} />
      </group>
    </group>
  );
}

// ─── SideDoor ─────────────────────────────────────────────────────────────────
// X yüzünde iki kanat: kapı tarafı kanadı (Z=length/2..length) +Z'ye, uzak yüz kanadı (Z=0..length/2) -Z'ye açılır.
// Her kanadın menteşesi kendi dış Z kenarında; kanatlar rotation.y etrafında dışa döner.
// Pivot grubu: X=width (sağ) veya X=0 (sol) yüzünün uzak-zemin köşesi (Z=0, Y=0).
// "Dışa" yön: sağ yüzde +X, sol yüzde -X — RearDoors mantığının 90° döndürülmüşü.

function SideDoor({
  length,
  height,
  side,
}: {
  length: number;
  height: number;
  side: 'right' | 'left';
}) {
  const frontRef = useRef<THREE.Group>(null);
  const rearRef = useRef<THREE.Group>(null);
  const angleRef = useRef(0);

  // Sağ yüzde dışarı = +X yönü → rotation.y pozitif = +Z'ye döner (kapı tarafı kanadı), negatif = -Z'ye (uzak yüz kanadı)
  // Sol yüzde dışarı = -X yönü → işaretler ters
  const dirSign = side === 'right' ? 1 : -1;

  useFrame(() => {
    const diff = DOOR_SIDE_OPEN_ANGLE - angleRef.current;
    if (Math.abs(diff) > 0.0005) {
      angleRef.current += diff * DOOR_EASING;
      if (frontRef.current) frontRef.current.rotation.y = dirSign * angleRef.current;
      if (rearRef.current) rearRef.current.rotation.y = -dirSign * angleRef.current;
    }
  });

  const panelZ = length / 2;

  return (
    <group>
      {/* Ön kanat: menteşe Z=length kenarında, panel içe (-Z) doğru uzanır */}
      <group ref={frontRef} position={[0, 0, length]}>
        <mesh position={[0, height / 2, -panelZ / 2]}>
          <boxGeometry args={[DOOR_THICKNESS, height, panelZ]} />
          <meshStandardMaterial metalness={0.45} roughness={0.7} />
        </mesh>
      </group>
      {/* Uzak yüz kanadı: menteşe Z=0 kenarında, panel +Z'ye doğru uzanır */}
      <group ref={rearRef} position={[0, 0, 0]}>
        <mesh position={[0, height / 2, panelZ / 2]}>
          <boxGeometry args={[DOOR_THICKNESS, height, panelZ]} />
          <meshStandardMaterial metalness={0.45} roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

// ─── TopDoor ──────────────────────────────────────────────────────────────────
// İki kanat, ortadan (Z=length/2) bölünür.
// Uzak yüz kanadı: menteşe Z=0 kenarında, rotation.x negatif → -Z'ye açılır.
// Ön kanat:   menteşe Z=length kenarında, rotation.x pozitif → öne açılır.

function TopDoor({ width, length }: { width: number; length: number }) {
  const rearRef = useRef<THREE.Group>(null);
  const frontRef = useRef<THREE.Group>(null);
  const angleRef = useRef(0);
  const targetAngle = SCENE.DOOR_SIDE_OPEN_ANGLE;

  useFrame(() => {
    const diff = targetAngle - angleRef.current;
    if (Math.abs(diff) > 0.0005) {
      angleRef.current += diff * DOOR_EASING;
      if (rearRef.current) rearRef.current.rotation.x = -angleRef.current;
      if (frontRef.current) frontRef.current.rotation.x = angleRef.current;
    }
  });

  const panelZ = length / 2;

  return (
    <>
      {/* Uzak yüz kanadı — menteşe Z=0, panel +Z'ye uzanır */}
      <group ref={rearRef} position={[0, 0, 0]}>
        <mesh position={[width / 2, 0, panelZ / 2]}>
          <boxGeometry args={[width, DOOR_THICKNESS, panelZ]} />
          <meshStandardMaterial metalness={0.45} roughness={0.7} />
        </mesh>
      </group>
      {/* Kapı tarafı kanadı — menteşe Z=length, panel -Z'ye uzanır */}
      <group ref={frontRef} position={[0, 0, length]}>
        <mesh position={[width / 2, 0, -panelZ / 2]}>
          <boxGeometry args={[width, DOOR_THICKNESS, panelZ]} />
          <meshStandardMaterial metalness={0.45} roughness={0.7} />
        </mesh>
      </group>
    </>
  );
}

// ─── ContainerMesh ─────────────────────────────────────────────────────────────

function renderDoors(doors: readonly VehicleDoor[], width: number, height: number, length: number) {
  const referenceDoor = findDoor(doors, DoorType.Small);
  const sideDoor = findDoor(doors, DoorType.Big);
  const topDoor = findDoor(doors, DoorType.Top);

  // Kapılar bir liste: bir araçta aynı anda arka ve yan kapı bulunabilir, bu
  // yüzden dallar birbirini dışlamaz (docs/COORDINATE_STANDARD.md §4).
  return (
    <>
      {referenceDoor && (
        // Referans kapı z = length yüzündedir; z = 0 uzak yüzdür ve TIR'da
        // kabin ucu olduğu için orada kapı bulunmaz.
        <group position={[0, 0, length]}>
          <RearDoors width={width} height={height} />
        </group>
      )}

      {sideDoor && (
        <group position={[sideDoor.face === DoorFace.ZeroX ? 0 : width, 0, 0]}>
          <SideDoor
            length={length}
            height={height}
            side={sideDoor.face === DoorFace.ZeroX ? 'left' : 'right'}
          />
        </group>
      )}

      {topDoor && (
        // Pivot: tavanın uzak yüz kenarı — Y=height, Z=0
        <group position={[0, height, 0]}>
          <TopDoor width={width} length={length} />
        </group>
      )}
    </>
  );
}

export function ContainerMesh() {
  const vehicle = usePlanStore((s) => s.selectedVehicle);

  if (!vehicle) return null;

  const { width, height, length, doors } = vehicle;

  return (
    <group>
      <ContainerBody width={width} height={height} length={length} />
      <ContainerEdges width={width} height={height} length={length} />

      <group key={`door-${vehicle.id}`}>{renderDoors(doors ?? [], width, height, length)}</group>

      <ContactShadows
        position={[width / 2, -0.5, length / 2]}
        scale={Math.max(width, length) * SCENE.CONTACT_SHADOW_SCALE_FACTOR}
        blur={SCENE.CONTACT_SHADOW_BLUR}
        opacity={SCENE.CONTACT_SHADOW_OPACITY}
        far={height * 1.2}
      />
    </group>
  );
}
