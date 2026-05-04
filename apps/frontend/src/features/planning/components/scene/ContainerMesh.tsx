import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { SCENE } from '@/lib/config/scene-config';
import { ContainerBody } from './ContainerBody';

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

// ─── ContainerGrid ─────────────────────────────────────────────────────────────

function ContainerGrid({ width, length }: { width: number; length: number }) {
  const geometry = useMemo(() => {
    const step = SCENE.GRID_STEP_CM;
    const points: number[] = [];

    for (let z = 0; z <= length; z += step) {
      points.push(0, 0, z, width, 0, z);
    }
    for (let x = 0; x <= width; x += step) {
      points.push(x, 0, 0, x, 0, length);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return geo;
  }, [width, length]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={SCENE.COLORS.GRID} opacity={0.45} transparent />
    </lineSegments>
  );
}

// ─── ContainerDoors ────────────────────────────────────────────────────────────

const DOOR_THICKNESS = 5;

const DOOR_OPEN_ANGLE = Math.PI * 0.72;
const DOOR_EASING = 0.055;

// Grid lines drawn flush on the outer face of a door panel.
// sign=+1 → x runs 0…panelW (left door); sign=-1 → x runs 0…-panelW (right door).
function DoorGrid({ panelW, height, sign }: { panelW: number; height: number; sign: 1 | -1 }) {
  const geometry = useMemo(() => {
    const step = SCENE.GRID_STEP_CM;
    const z = DOOR_THICKNESS + 0.5; // kapı Z=length'te, paneller +Z yönüne (dışarı) açılır
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
      <lineBasicMaterial color={SCENE.COLORS.GRID} opacity={0.35} transparent />
    </lineSegments>
  );
}

function DoorFrame({ panelW, height, sign }: { panelW: number; height: number; sign: 1 | -1 }) {
  const geometry = useMemo(() => {
    const z = DOOR_THICKNESS + 0.5;
    const ex = sign * panelW;
    // Rectangle: bottom-left → bottom-right → top-right → top-left → back to start
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

function DoorPanel({ panelW, height, sign }: { panelW: number; height: number; sign: 1 | -1 }) {
  return (
    <group>
      <DoorGrid panelW={panelW} height={height} sign={sign} />
      <DoorFrame panelW={panelW} height={height} sign={sign} />
    </group>
  );
}

function ContainerDoors({ width, height }: { width: number; height: number; length: number }) {
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
    <group position={[0, 0, length]}>
      <group ref={leftRef}>
        <DoorPanel panelW={panelW} height={height} sign={1} />
      </group>
      <group ref={rightRef} position={[width, 0, 0]}>
        <DoorPanel panelW={panelW} height={height} sign={-1} />
      </group>
    </group>
  );
}

// ─── ContainerMesh ─────────────────────────────────────────────────────────────

export function ContainerMesh() {
  const vehicle = usePlanStore((s) => s.selectedVehicle);

  if (!vehicle) return null;

  const { width, height, length } = vehicle;

  return (
    <group>
      <ContainerBody width={width} height={height} length={length} />
      <ContainerEdges width={width} height={height} length={length} />
      <ContainerGrid width={width} length={length} />
      {/* key resets door animation when vehicle changes */}
      <ContainerDoors key={vehicle.id} width={width} height={height} length={length} />
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
