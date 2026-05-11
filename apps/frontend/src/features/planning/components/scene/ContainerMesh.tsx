// BoxWrapper kuralı kargo kutuları içindir; konteyner kapakları için geçerli değil.
/* eslint-disable no-restricted-syntax */
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { ContactShadows, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { SCENE } from '@/lib/config/scene-config';
import { ContainerBody } from './ContainerBody';

import normalUrl from '@/assets/textures/container-steel/normal.jpg';
import roughnessUrl from '@/assets/textures/container-steel/roughness.jpg';
import metalnessUrl from '@/assets/textures/container-steel/metalness.jpg';
import aoUrl from '@/assets/textures/container-steel/ao.jpg';

const UV_SCALE = 0.008;

function DoorPanel({
  width,
  height,
  depth = 0.1,
}: {
  width: number;
  height: number;
  depth?: number;
}) {
  const [normalMap, roughnessMap, metalnessMap, aoMap] = useTexture([
    normalUrl,
    roughnessUrl,
    metalnessUrl,
    aoUrl,
  ]);

  useEffect(() => {
    for (const tex of [normalMap, roughnessMap, metalnessMap, aoMap]) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(width * UV_SCALE, height * UV_SCALE);
      tex.needsUpdate = true;
    }
  }, [width, height, normalMap, roughnessMap, metalnessMap, aoMap]);

  return (
    <mesh position={[width / 2, height / 2, 0]}>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial
        normalMap={normalMap}
        roughnessMap={roughnessMap}
        metalnessMap={metalnessMap}
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
const DOOR_EASING = SCENE.DOOR_EASING;

// ─── Rear door helpers (X-axis panel on Z=0 face) ─────────────────────────────

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

// ─── Side door (X face) ────────────────────────────────────────────────────────

const SIDE_DOOR_OPEN_ANGLE = SCENE.DOOR_SIDE_OPEN_ANGLE;

function SideDoorGrid({
  panelDepth,
  height,
  sign,
}: {
  panelDepth: number;
  height: number;
  sign: 1 | -1;
}) {
  const geometry = useMemo(() => {
    const step = SCENE.GRID_STEP_CM;
    const x = -(DOOR_THICKNESS + 0.5);
    const pts: number[] = [];
    for (let z = 0; z <= panelDepth; z += step) {
      pts.push(x, 0, sign * z, x, height, sign * z);
    }
    for (let y = 0; y <= height; y += step) {
      pts.push(x, y, 0, x, y, sign * panelDepth);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, [panelDepth, height, sign]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={SCENE.COLORS.CONTAINER_EDGE} opacity={0.18} transparent />
    </lineSegments>
  );
}

function SideDoorFrame({
  panelDepth,
  height,
  sign,
}: {
  panelDepth: number;
  height: number;
  sign: 1 | -1;
}) {
  const geometry = useMemo(() => {
    const x = -(DOOR_THICKNESS + 0.5);
    const ez = sign * panelDepth;
    const pts = [
      x,
      0,
      0,
      x,
      0,
      ez,
      x,
      0,
      ez,
      x,
      height,
      ez,
      x,
      height,
      ez,
      x,
      height,
      0,
      x,
      height,
      0,
      x,
      0,
      0,
    ];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, [panelDepth, height, sign]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={SCENE.COLORS.CONTAINER_EDGE} />
    </lineSegments>
  );
}

function SideHalfDoor({
  panelDepth,
  height,
  sign,
}: {
  panelDepth: number;
  height: number;
  sign: 1 | -1;
}) {
  return (
    <group>
      {/* Panel: X ekseni boyunca, Z yönünde uzanır — DoorPanel X=width Z=depth olduğu için rotate et */}
      <group rotation={[0, -Math.PI / 2, 0]} position={[0, 0, 0]} scale={[sign, 1, 1]}>
        <DoorPanel width={panelDepth} height={height} />
      </group>
      <SideDoorGrid panelDepth={panelDepth} height={height} sign={sign} />
      <SideDoorFrame panelDepth={panelDepth} height={height} sign={sign} />
    </group>
  );
}

function SideDoors({ width, height, length }: { width: number; height: number; length: number }) {
  const frontRef = useRef<THREE.Group>(null);
  const rearRef = useRef<THREE.Group>(null);
  const angleRef = useRef(0);

  useFrame(() => {
    const diff = SIDE_DOOR_OPEN_ANGLE - angleRef.current;
    if (Math.abs(diff) > 0.0005) {
      angleRef.current += diff * DOOR_EASING;
      if (frontRef.current) frontRef.current.rotation.y = -angleRef.current;
      if (rearRef.current) rearRef.current.rotation.y = angleRef.current;
    }
  });

  const panelDepth = width / 2;

  return (
    <group>
      <group ref={frontRef}>
        <SideHalfDoor panelDepth={panelDepth} height={height} sign={1} />
      </group>
      <group ref={rearRef} position={[0, 0, length]}>
        <SideHalfDoor panelDepth={panelDepth} height={height} sign={-1} />
      </group>
    </group>
  );
}

// ─── Top cover (open-top vehicles) ────────────────────────────────────────────

function TopCoverGrid({
  width,
  panelLength,
  sign,
}: {
  width: number;
  panelLength: number;
  sign: 1 | -1;
}) {
  const geometry = useMemo(() => {
    const step = SCENE.GRID_STEP_CM;
    const y = DOOR_THICKNESS + 0.5;
    const pts: number[] = [];
    for (let z = 0; z <= panelLength; z += step) {
      pts.push(0, y, sign * z, width, y, sign * z);
    }
    for (let x = 0; x <= width; x += step) {
      pts.push(x, y, 0, x, y, sign * panelLength);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, [width, panelLength, sign]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={SCENE.COLORS.CONTAINER_EDGE} opacity={0.18} transparent />
    </lineSegments>
  );
}

function TopCoverFrame({
  width,
  panelLength,
  sign,
}: {
  width: number;
  panelLength: number;
  sign: 1 | -1;
}) {
  const geometry = useMemo(() => {
    const y = DOOR_THICKNESS + 0.5;
    const ez = sign * panelLength;
    const pts = [
      0,
      y,
      0,
      width,
      y,
      0,
      width,
      y,
      0,
      width,
      y,
      ez,
      width,
      y,
      ez,
      0,
      y,
      ez,
      0,
      y,
      ez,
      0,
      y,
      0,
    ];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, [width, panelLength, sign]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={SCENE.COLORS.CONTAINER_EDGE} />
    </lineSegments>
  );
}

function TopCoverHalf({
  width,
  panelLength,
  sign,
}: {
  width: number;
  panelLength: number;
  sign: 1 | -1;
}) {
  return (
    <group>
      {/* Panel: XZ düzleminde, rotate ile yatay yap */}
      <group rotation={[-Math.PI / 2, 0, 0]} scale={[1, sign, 1]}>
        <DoorPanel width={width} height={panelLength} />
      </group>
      <TopCoverGrid width={width} panelLength={panelLength} sign={sign} />
      <TopCoverFrame width={width} panelLength={panelLength} sign={sign} />
    </group>
  );
}

function TopCover({ width, height, length }: { width: number; height: number; length: number }) {
  const rearRef = useRef<THREE.Group>(null);
  const frontRef = useRef<THREE.Group>(null);
  const angleRef = useRef(0);

  useFrame(() => {
    const diff = SCENE.DOOR_SIDE_OPEN_ANGLE - angleRef.current;
    if (Math.abs(diff) > 0.0005) {
      angleRef.current += diff * DOOR_EASING;
      if (rearRef.current) rearRef.current.rotation.x = -angleRef.current;
      if (frontRef.current) frontRef.current.rotation.x = angleRef.current;
    }
  });

  const panelLength = width / 2;

  return (
    <group position={[0, height, 0]}>
      <group ref={rearRef}>
        <TopCoverHalf width={width} panelLength={panelLength} sign={1} />
      </group>
      <group ref={frontRef} position={[0, 0, length]}>
        <TopCoverHalf width={width} panelLength={panelLength} sign={-1} />
      </group>
    </group>
  );
}

// ─── ContainerMesh ─────────────────────────────────────────────────────────────

export function ContainerMesh() {
  const vehicle = usePlanStore((s) => s.selectedVehicle);

  if (!vehicle) return null;

  const { width, height, length, doorSide } = vehicle;
  const doorDirection = vehicle.doorDirection ?? 'rear';

  return (
    <group>
      <ContainerBody width={width} height={height} length={length} />
      <ContainerEdges width={width} height={height} length={length} />

      {(doorDirection === 'rear' || doorDirection === 'rearAndSide') && (
        <group key={`rear-${vehicle.id}`} position={[0, 0, length]} scale={[1, 1, -1]}>
          <RearDoors width={width} height={height} />
        </group>
      )}

      {(doorDirection === 'side' || doorDirection === 'rearAndSide') && (
        <group
          key={`side-${vehicle.id}`}
          position={[doorSide === 'left' ? 0 : width, 0, 0]}
          scale={[doorSide === 'left' ? 1 : -1, 1, 1]}
        >
          <SideDoors width={width} height={height} length={length} />
        </group>
      )}

      {doorDirection === 'top' && (
        <TopCover key={vehicle.id} width={width} height={height} length={length} />
      )}

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
