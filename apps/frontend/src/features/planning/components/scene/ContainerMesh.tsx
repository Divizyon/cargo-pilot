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

// ─── Shared door constants ─────────────────────────────────────────────────────

const DOOR_THICKNESS = 5;
const DOOR_OPEN_ANGLE = Math.PI * 0.72;
const DOOR_EASING = 0.055;

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

// Panels are represented as EdgesGeometry boxes so they are visible from any
// camera angle — flat ZY-plane lines become edge-on (invisible) from the default
// isometric view, but a 3D box's Z-axis and Y-axis edges remain clearly visible.
//
// Hinge strategy: both panels pivot from the container centre (Z = length/2).
// This keeps the far edges only ~120 cm outside the container at 10° open,
// so they remain inside the camera's default viewport.
const SIDE_DOOR_PANEL_W = 15; // cm – box depth in X, makes edges clearly visible
const SIDE_DOOR_OPEN_ANGLE = Math.PI * 0.055; // ≈10° – stays in viewport

function SideHalfDoorEdges({
  panelL,
  height,
  sign,
}: {
  panelL: number;
  height: number;
  sign: 1 | -1;
}) {
  const edgesGeo = useMemo(() => {
    const box = new THREE.BoxGeometry(SIDE_DOOR_PANEL_W, height, panelL);
    const edges = new THREE.EdgesGeometry(box);
    box.dispose();
    return edges;
  }, [height, panelL]);

  // Center of the box: X pulls it just outside the container face, Z at panel centre
  return (
    <lineSegments
      geometry={edgesGeo}
      position={[-(SIDE_DOOR_PANEL_W / 2 + 0.5), height / 2, (sign * panelL) / 2]}
    >
      <lineBasicMaterial color={SCENE.COLORS.CONTAINER_EDGE} />
    </lineSegments>
  );
}

// Both panels hinge from the container's side-face centre (Z = length/2).
// sign=-1 panel covers Z[0, length/2]; sign=+1 covers Z[length/2, length].
function SideDoors({ height, length }: { height: number; length: number }) {
  const backHalfRef = useRef<THREE.Group>(null);
  const frontHalfRef = useRef<THREE.Group>(null);
  const angleRef = useRef(0);

  useFrame(() => {
    const diff = SIDE_DOOR_OPEN_ANGLE - angleRef.current;
    if (Math.abs(diff) > 0.0005) {
      angleRef.current += diff * DOOR_EASING;
      // Both panels open outward (toward –X = outside the container left face)
      if (backHalfRef.current) backHalfRef.current.rotation.y = -angleRef.current;
      if (frontHalfRef.current) frontHalfRef.current.rotation.y = angleRef.current;
    }
  });

  const panelL = length / 2;

  return (
    // Group origin sits at the centre of the side face so hinges are symmetric
    <group position={[0, 0, length / 2]}>
      {/* Back half: extends toward Z=0 */}
      <group ref={backHalfRef}>
        <SideHalfDoorEdges panelL={panelL} height={height} sign={-1} />
      </group>
      {/* Front half: extends toward Z=length */}
      <group ref={frontHalfRef}>
        <SideHalfDoorEdges panelL={panelL} height={height} sign={1} />
      </group>
    </group>
  );
}

// ─── Top opening indicator (Open-Top vehicles) ────────────────────────────────

function TopOpeningIndicator({
  width,
  length,
  height,
}: {
  width: number;
  length: number;
  height: number;
}) {
  const geometry = useMemo(() => {
    const pts = [
      0,
      height,
      0,
      width,
      height,
      0,
      width,
      height,
      0,
      width,
      height,
      length,
      width,
      height,
      length,
      0,
      height,
      length,
      0,
      height,
      length,
      0,
      height,
      0,
    ];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, [width, length, height]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={SCENE.COLORS.CONTAINER_DOOR} opacity={0.8} transparent />
    </lineSegments>
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
          position={[doorSide === 'right' ? width : 0, 0, 0]}
          scale={[doorSide === 'right' ? -1 : 1, 1, 1]}
        >
          <SideDoors height={height} length={length} />
        </group>
      )}

      {doorDirection === 'top' && (
        <TopOpeningIndicator key={vehicle.id} width={width} length={length} height={height} />
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
