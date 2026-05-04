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

// ─── Shared door constants (values from scene-config) ─────────────────────────

const DOOR_THICKNESS = SCENE.DOOR_THICKNESS_CM;
const DOOR_OPEN_ANGLE = SCENE.DOOR_REAR_OPEN_ANGLE;
const DOOR_EASING = SCENE.DOOR_EASING;

// ─── Rear door helpers (X-axis panel on Z=0 face) ─────────────────────────────

// Grid lines on the outer face of a rear door panel.
// sign=+1 → x runs 0…panelW (left door); sign=-1 → x runs 0…-panelW (right door).
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
      <lineBasicMaterial color={SCENE.COLORS.GRID} opacity={0.35} transparent />
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

// Same visual style as rear doors: grid lines + frame outline on the outer face.
// Front panel hinges at Z=0, rear panel hinges at Z=length — both swing outward (−X).
const SIDE_DOOR_OPEN_ANGLE = SCENE.DOOR_SIDE_OPEN_ANGLE;

// Grid drawn on the outer face of the panel (facing −X, at x = −(DOOR_THICKNESS+0.5)).
// sign=1 → panel extends +Z; sign=−1 → panel extends −Z.
function SideDoorGrid({ panelDepth, height, sign }: { panelDepth: number; height: number; sign: 1 | -1 }) {
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
      <lineBasicMaterial color={SCENE.COLORS.GRID} opacity={0.35} transparent />
    </lineSegments>
  );
}

function SideDoorFrame({ panelDepth, height, sign }: { panelDepth: number; height: number; sign: 1 | -1 }) {
  const geometry = useMemo(() => {
    const x = -(DOOR_THICKNESS + 0.5);
    const ez = sign * panelDepth;
    const pts = [
      x, 0, 0, x, 0, ez,
      x, 0, ez, x, height, ez,
      x, height, ez, x, height, 0,
      x, height, 0, x, 0, 0,
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

function SideHalfDoor({ panelDepth, height, sign }: { panelDepth: number; height: number; sign: 1 | -1 }) {
  return (
    <group>
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

// Same visual style as rear doors. Grid + frame on the outer face (facing +Y).
// Rear half hinges at Z=0, front half at Z=length.
// Rotation: −X lifts +Z edge upward, +X lifts −Z edge upward.

function TopCoverGrid({ width, panelLength, sign }: { width: number; panelLength: number; sign: 1 | -1 }) {
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
      <lineBasicMaterial color={SCENE.COLORS.GRID} opacity={0.35} transparent />
    </lineSegments>
  );
}

function TopCoverFrame({ width, panelLength, sign }: { width: number; panelLength: number; sign: 1 | -1 }) {
  const geometry = useMemo(() => {
    const y = DOOR_THICKNESS + 0.5;
    const ez = sign * panelLength;
    const pts = [
      0, y, 0, width, y, 0,
      width, y, 0, width, y, ez,
      width, y, ez, 0, y, ez,
      0, y, ez, 0, y, 0,
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

function TopCoverHalf({ width, panelLength, sign }: { width: number; panelLength: number; sign: 1 | -1 }) {
  return (
    <group>
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
      // −X rotation: +Z edge lifts upward (away from container)
      if (rearRef.current) rearRef.current.rotation.x = -angleRef.current;
      // +X rotation: −Z edge lifts upward (away from container)
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
  // Default to 'rear' when doorDirection is absent (API not yet mapped)
  const doorDirection = vehicle.doorDirection ?? 'rear';

  return (
    <group>
      <ContainerBody width={width} height={height} length={length} />
      <ContainerEdges width={width} height={height} length={length} />
      <ContainerGrid width={width} length={length} />

      {/* key resets door animation when vehicle changes */}
      {(doorDirection === 'rear' || doorDirection === 'rearAndSide') && (
        <RearDoors key={`rear-${vehicle.id}`} width={width} height={height} />
      )}

      {(doorDirection === 'side' || doorDirection === 'rearAndSide') && (
        // For right-side doors: translate to X=width and mirror X so geometry faces outward
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
