import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { SCENE } from '@/lib/config/scene-config';
import { VehicleType } from '@/lib/types/vehicle';
import type { VehicleType as VehicleTypeValue, DoorDirection } from '@/lib/types/vehicle';

// ─── Constants ─────────────────────────────────────────────────────────────────

const CAB_LENGTH_RATIO_KAMYON = 0.3;
const CAB_LENGTH_RATIO_TIR = 0.25;
const CAB_HEIGHT_RATIO = 16 / 15; // Kabin görsel yüksekliği = kargo yüksekliği * 6/5
const CAB_GAP_RATIO_TIR = 0.14; // Tır kabin-kargo boşluğu = cabLength * oran (ref: 50/350)
const CAB_COLOR = '#6b7280';
const CAB_FRONT_AXLE_RATIO = 0.65; // Ön dingil, kabin uzunluğunun bu oranında konumlanır
const KINGPIN_RADIUS_RATIO = 0.42; // King pimi yarıçapı = kingpinHeight * oran (ref: 25/60)
const KINGPIN_HEIGHT_RATIO = 0.22; // King pimi yüksekliği = cabH * oran (ref: 60/267)
const KINGPIN_COLOR = '#1a1a1a';
const DOOR_PANEL_T = 3;
const WINDOW_COLOR = '#b8dff0';
const WINDOW_OPACITY = 0.55;
const WINDOW_INSET_RATIO = 0.08; // çerçeve boşluğu — min(w, cabH) * oran
const SIDE_WIN_SLIDE_RATIO = 0.12; // yan camı eğime dik kaydır — min(w, cabH) * oran

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface VehiclePreview3DProps {
  vehicleType: VehicleTypeValue;
  length: number;
  width: number;
  height: number;
  doorDirection?: DoorDirection;
  doorSide?: 'left' | 'right';
  kingpinDistance?: number;
  axleBDistance?: number;
  axleDistances?: number[];
}

// ─── Scene Setup ───────────────────────────────────────────────────────────────

function SceneSetup({
  cx,
  cy,
  cz,
  maxDim,
}: {
  cx: number;
  cy: number;
  cz: number;
  maxDim: number;
}) {
  const { camera } = useThree();
  const orbitRef = useRef<OrbitControlsImpl>(null);
  const dist = maxDim * 1.8;

  useEffect(() => {
    camera.position.set(cx + dist * 0.55, cy + dist * 0.5, cz + dist * 0.9);
    camera.lookAt(cx, cy, cz);
    if (orbitRef.current) {
      orbitRef.current.target.set(cx, cy, cz);
      orbitRef.current.update();
    }
  }, [camera, cx, cy, cz, dist]);

  return (
    <>
      <ambientLight intensity={SCENE.AMBIENT_INTENSITY} />
      <directionalLight
        position={[cx + maxDim * 2, cy + maxDim * 2, cz + maxDim]}
        intensity={SCENE.DIRECTIONAL_INTENSITY}
      />
      <OrbitControls
        ref={orbitRef}
        autoRotate
        autoRotateSpeed={SCENE.ORBIT_AUTO_ROTATE_SPEED}
        enableDamping
        dampingFactor={SCENE.ORBIT_DAMPING_FACTOR}
        enablePan={false}
        enableZoom={false}
        onStart={() => {
          if (orbitRef.current) orbitRef.current.autoRotate = false;
        }}
      />
    </>
  );
}

// ─── Cargo Body ────────────────────────────────────────────────────────────────

// Origin = sol-alt-arka. Kargo: x∈[0,w], y∈[0,h], z∈[0,l]. Rear kapı Z=0 yüzündedir.
function CargoBody({ width, height, length }: { width: number; height: number; length: number }) {
  const edgesGeo = useMemo(() => {
    const box = new THREE.BoxGeometry(width, height, length);
    const edges = new THREE.EdgesGeometry(box);
    box.dispose();
    return edges;
  }, [width, height, length]);

  useEffect(
    () => () => {
      edgesGeo.dispose();
    },
    [edgesGeo],
  );

  return (
    <group>
      <mesh position={[width / 2, height / 2, length / 2]} receiveShadow>
        <boxGeometry args={[width, height, length]} />
        <meshStandardMaterial
          color={SCENE.COLORS.CONTAINER_INSIDE}
          side={THREE.BackSide}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>
      <lineSegments geometry={edgesGeo} position={[width / 2, height / 2, length / 2]}>
        <lineBasicMaterial color={SCENE.COLORS.CONTAINER_EDGE} />
      </lineSegments>
    </group>
  );
}

// ─── Cab (Kamyon / Tır) ────────────────────────────────────────────────────────

// Kabin yamuk prizma: arka yüz tam yükseklik, kabin ortasından ön yüze eğimli çatı.
// Arka yarı dikdörtgen prizma, ön yarı eğimli → gerçekçi kamyon silüeti.
function CabMesh({
  width,
  height,
  cargoLength,
  cabLength,
  gapLength = 0,
}: {
  width: number;
  height: number;
  cargoLength: number;
  cabLength: number;
  gapLength?: number;
}) {
  // Bileşen kapsamında hesapla — hem useMemo hem JSX kullanır
  const cabH = height * CAB_HEIGHT_RATIO;
  const d = cabLength;

  const [cabGeo, edgesGeo, leftWinGeo, rightWinGeo] = useMemo(() => {
    const w = width;
    const h = height * CAB_HEIGHT_RATIO;
    const hfL = h / 2;
    const dL = cabLength;
    const dmL = cabLength / 2;
    const ins = Math.min(w, h) * WINDOW_INSET_RATIO;
    const slideCm = Math.min(w, h) * SIDE_WIN_SLIDE_RATIO;

    // 12 köşe: arka (z=0) tam yükseklik, orta ridge (z=dm) tam yükseklik, ön (z=d) yarı yükseklik
    const positions = new Float32Array([
      0,
      0,
      0, // 0 arka-alt-sol
      w,
      0,
      0, // 1 arka-alt-sağ
      0,
      h,
      0, // 2 arka-üst-sol
      w,
      h,
      0, // 3 arka-üst-sağ
      0,
      0,
      dmL, // 4 orta-alt-sol
      w,
      0,
      dmL, // 5 orta-alt-sağ
      0,
      h,
      dmL, // 6 orta-üst-sol (eğim başlangıcı)
      w,
      h,
      dmL, // 7 orta-üst-sağ (eğim başlangıcı)
      0,
      hfL,
      dL, // 8 ön-üst-sol
      w,
      hfL,
      dL, // 9 ön-üst-sağ
      0,
      0,
      dL, // 10 ön-alt-sol
      w,
      0,
      dL, // 11 ön-alt-sağ
    ]);

    const indices = [
      // Alt (normal -Y)
      0, 1, 5, 0, 5, 4, 4, 5, 11, 4, 11, 10,
      // Arka yüz (normal -Z)
      0, 2, 1, 1, 2, 3,
      // Sol yüz (normal -X)
      0, 4, 6, 0, 6, 2, 4, 10, 8, 4, 8, 6,
      // Sağ yüz (normal +X)
      1, 3, 7, 1, 7, 5, 5, 7, 9, 5, 9, 11,
      // Üst-düz arka (normal +Y)
      2, 6, 7, 2, 7, 3,
      // Üst-eğim ön (normal +Y+Z)
      6, 8, 9, 6, 9, 7,
      // Ön yüz (normal +Z)
      10, 11, 9, 10, 9, 8,
    ];

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const edges = new THREE.EdgesGeometry(geo);

    // Slope'a dik kaydırma vektörü: (-h, -dL) yönü normalize edilir
    const slopeNorm2D = Math.sqrt(h * h + dL * dL);
    const slideZ = (-slideCm * h) / slopeNorm2D;
    const slideY = (-slideCm * dL) / slopeNorm2D;

    // Sol yan cam: üçgen (eğimli bölge z=dm→d arası üst köşe)
    const lPts = new Float32Array([
      -1,
      h - ins + slideY,
      dmL + ins + slideZ,
      -1,
      hfL + ins + slideY,
      dL - ins + slideZ,
      -1,
      hfL + ins + slideY,
      dmL + ins + slideZ,
    ]);
    const leftWin = new THREE.BufferGeometry();
    leftWin.setAttribute('position', new THREE.BufferAttribute(lPts, 3));
    leftWin.computeVertexNormals();

    // Sağ yan cam: aynı şekil, x=w+1
    const rPts = new Float32Array([
      w + 1,
      h - ins + slideY,
      dmL + ins + slideZ,
      w + 1,
      hfL + ins + slideY,
      dL - ins + slideZ,
      w + 1,
      hfL + ins + slideY,
      dmL + ins + slideZ,
    ]);
    const rightWin = new THREE.BufferGeometry();
    rightWin.setAttribute('position', new THREE.BufferAttribute(rPts, 3));
    rightWin.computeVertexNormals();

    return [geo, edges, leftWin, rightWin] as const;
  }, [width, height, cabLength]);

  useEffect(
    () => () => {
      cabGeo.dispose();
      edgesGeo.dispose();
      leftWinGeo.dispose();
      rightWinGeo.dispose();
    },
    [cabGeo, edgesGeo, leftWinGeo, rightWinGeo],
  );

  // Eğimli yüzey (z=dm→d, y=h→hf) — ön cam bu yüzeye oturur
  const slopeLen = Math.sqrt((cabH / 2) ** 2 + (d / 2) ** 2);
  const winInset = Math.min(width, cabH) * WINDOW_INSET_RATIO;
  const frontWinW = width - 2 * winInset;
  const frontWinSlopeH = slopeLen - 2 * winInset;
  // Normal (0, d, cabH)/norm → plane'i -atan2(d, cabH) kadar X ekseni etrafında döndür
  const slopeRotX = -Math.atan2(d, cabH);
  // Z-fighting önlemek için düzlemi normal yönünde 3 cm dışarı kaydır
  const slopeNorm = Math.sqrt(d * d + cabH * cabH);
  const winOffsetY = (3 * d) / slopeNorm;
  const winOffsetZ = (3 * cabH) / slopeNorm;

  return (
    <group position={[0, 0, cargoLength + gapLength]}>
      <mesh castShadow geometry={cabGeo}>
        <meshStandardMaterial color={CAB_COLOR} metalness={0.2} roughness={0.7} />
      </mesh>
      <lineSegments geometry={edgesGeo}>
        <lineBasicMaterial color={SCENE.COLORS.CONTAINER_EDGE} />
      </lineSegments>

      {/* Ön cam — dikdörtgen, eğimli üst yüzeye (z=dm→d) oturur */}
      {frontWinW > 0 && frontWinSlopeH > 0 && (
        <mesh
          position={[width / 2, (cabH * 3) / 4 + winOffsetY, (d * 3) / 4 + winOffsetZ]}
          rotation={[slopeRotX, 0, 0]}
        >
          <planeGeometry args={[frontWinW, frontWinSlopeH]} />
          <meshStandardMaterial
            color={WINDOW_COLOR}
            transparent
            opacity={WINDOW_OPACITY}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Yan camlar — üçgen, eğimli yüzlerin hemen dışında */}
      <mesh geometry={leftWinGeo}>
        <meshStandardMaterial
          color={WINDOW_COLOR}
          transparent
          opacity={WINDOW_OPACITY}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={rightWinGeo}>
        <meshStandardMaterial
          color={WINDOW_COLOR}
          transparent
          opacity={WINDOW_OPACITY}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// ─── Door Face Indicator ──────────────────────────────────────────────────────

// Kapı yüzeyini ince renkli panel ile vurgular. Renk ContainerMesh ile aynı (CONTAINER_DOOR).
function DoorFaceIndicator({
  width,
  height,
  length,
  doorDirection,
  doorSide,
}: {
  width: number;
  height: number;
  length: number;
  doorDirection: DoorDirection;
  doorSide?: 'left' | 'right';
}) {
  const isRear = doorDirection === 'rear' || doorDirection === 'rearAndSide';
  const isSide = doorDirection === 'side' || doorDirection === 'rearAndSide';
  const isTop = doorDirection === 'top';

  const sideX = doorSide === 'right' ? width + DOOR_PANEL_T / 2 : -DOOR_PANEL_T / 2;

  return (
    <>
      {isRear && (
        <mesh position={[width / 2, height / 2, -DOOR_PANEL_T / 2]}>
          <boxGeometry args={[width, height, DOOR_PANEL_T]} />
          <meshStandardMaterial color={SCENE.COLORS.CONTAINER_DOOR} transparent opacity={0.6} />
        </mesh>
      )}
      {isSide && (
        <mesh position={[sideX, height / 2, length / 2]}>
          <boxGeometry args={[DOOR_PANEL_T, height, length]} />
          <meshStandardMaterial color={SCENE.COLORS.CONTAINER_DOOR} transparent opacity={0.6} />
        </mesh>
      )}
      {isTop && (
        <mesh position={[width / 2, height + DOOR_PANEL_T / 2, length / 2]}>
          <boxGeometry args={[width, DOOR_PANEL_T, length]} />
          <meshStandardMaterial color={SCENE.COLORS.CONTAINER_DOOR} transparent opacity={0.6} />
        </mesh>
      )}
    </>
  );
}

// ─── King Pin ─────────────────────────────────────────────────────────────────

// Kargo gövdesinin dışında, boşluk (gap) veya ön yüz ötesinde konumlandırılır.
// Y merkezi = -KINGPIN_HEIGHT_CM/2: silindir kargo tabanından (Y=0) aşağı sarkar.
// Z konumu hesabı: kargo geometrisiyle çakışmayan bölge → her zaman görünür.
function KingPinMesh({
  width,
  zPos,
  kingpinHeight,
}: {
  width: number;
  zPos: number;
  kingpinHeight: number;
}) {
  const kingpinRadius = kingpinHeight * KINGPIN_RADIUS_RATIO;
  return (
    <mesh position={[width / 2, -kingpinHeight / 2, zPos]}>
      <cylinderGeometry args={[kingpinRadius, kingpinRadius, kingpinHeight, 24]} />
      <meshStandardMaterial color={KINGPIN_COLOR} metalness={0.7} roughness={0.3} />
    </mesh>
  );
}

// ─── Axle / Wheel Assembly ────────────────────────────────────────────────────

// Dingil grubu: ince metal çubuk + her iki uçta siyah tekerlek diski.
// Tekerlek çapı ≈ kargo yüksekliğinin 0.4'ü. Grup zPos değişince birlikte hareket eder.
function AxleWheelAssembly({
  width,
  height,
  zPos,
}: {
  width: number;
  height: number;
  zPos: number;
}) {
  const wheelRadius = height * 0.2;
  const wheelThickness = Math.max(wheelRadius * 0.35, 6);
  const barRadius = Math.max(wheelRadius * 0.14, 4);
  const yCenter = -wheelRadius;

  const bDx = wheelRadius * 0.5;
  const bDy = wheelRadius;
  const braceLen = Math.sqrt(bDx * bDx + bDy * bDy);
  const braceAngle = -Math.atan2(bDx, bDy);
  const braceOffset = Math.max(barRadius * 3, 12);

  return (
    <group position={[0, yCenter, zPos]}>
      <mesh position={[width / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[barRadius, barRadius, width, 12]} />
        <meshStandardMaterial color="#4b5563" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[braceOffset + bDx / 2, bDy / 2, 0]} rotation={[0, 0, braceAngle]}>
        <cylinderGeometry args={[barRadius * 0.6, barRadius * 0.6, braceLen, 8]} />
        <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.5} />
      </mesh>
      <mesh position={[width - braceOffset - bDx / 2, bDy / 2, 0]} rotation={[0, 0, -braceAngle]}>
        <cylinderGeometry args={[barRadius * 0.6, barRadius * 0.6, braceLen, 8]} />
        <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.5} />
      </mesh>
      <mesh position={[-wheelThickness / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[wheelRadius, wheelRadius, wheelThickness, 28]} />
        <meshStandardMaterial color="#111827" metalness={0.3} roughness={0.8} />
      </mesh>
      <mesh position={[width + wheelThickness / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[wheelRadius, wheelRadius, wheelThickness, 28]} />
        <meshStandardMaterial color="#111827" metalness={0.3} roughness={0.8} />
      </mesh>
    </group>
  );
}

// ─── Full Vehicle Scene ───────────────────────────────────────────────────────

function VehicleScene({
  vehicleType,
  length,
  width,
  height,
  doorDirection,
  doorSide,
  axleBDistance,
  axleDistances,
}: VehiclePreview3DProps) {
  const isTir = vehicleType === VehicleType.Tir;
  const isKamposet = vehicleType === VehicleType.Kamposet;
  const hasCab = vehicleType === VehicleType.Kamyon || isTir;
  const cabLength =
    vehicleType === VehicleType.Kamyon
      ? length * CAB_LENGTH_RATIO_KAMYON
      : length * CAB_LENGTH_RATIO_TIR;
  // Tır: kabin ile kargo arası boşluk; king pimi bu aralıkta görünür
  const cabGap = isTir ? cabLength * CAB_GAP_RATIO_TIR : 0;
  const kingpinHeight = isTir
    ? height * CAB_HEIGHT_RATIO * KINGPIN_HEIGHT_RATIO
    : height * KINGPIN_HEIGHT_RATIO;
  // Tır ve Römork: king pimi her zaman gösterilir; mesafe girilmemişse ön yüze (Z=length) yerleşir
  const hasKingpin = isTir || isKamposet;
  const hasAxleVehicle = isTir || vehicleType === VehicleType.Kamyon || isKamposet;

  const totalLength = hasCab ? length + cabGap + cabLength : length;
  const cx = width / 2;
  const cy = height / 2;
  const cz = totalLength / 2;
  const effectiveHeight = hasCab ? height * CAB_HEIGHT_RATIO : height;
  const maxDim = Math.max(totalLength, width, effectiveHeight);

  // Tır: king pimi boşluğun ortasına (length + gap/2); kargo gövdesiyle çakışmaz → kesinlikle görünür.
  // Römork: ön yüzden kingpinHeight*KINGPIN_RADIUS_RATIO kadar öteye; zemin yüzeyi örtmez.
  const kingpinZ = isTir ? length + cabGap / 2 : length + kingpinHeight * KINGPIN_RADIUS_RATIO;

  const wheelRadius = height * 0.2;
  const hasRenderedAxles =
    hasAxleVehicle &&
    ((axleBDistance !== undefined && axleBDistance > 0 && axleBDistance <= length) ||
      (axleDistances ?? []).some((d) => d > 0 && d <= length));
  // Kabin olan araçlarda ön dingil her zaman görünür; gölge buna göre ayarlanır
  const cabFrontAxleZ = hasCab ? length + cabGap + cabLength * CAB_FRONT_AXLE_RATIO : 0;
  const shadowY = hasRenderedAxles || hasCab ? -wheelRadius * 2 - 2 : -0.5;

  return (
    <>
      <SceneSetup cx={cx} cy={cy} cz={cz} maxDim={maxDim} />

      <CargoBody width={width} height={height} length={length} />

      {hasCab && (
        <CabMesh
          width={width}
          height={height}
          cargoLength={length}
          cabLength={cabLength}
          gapLength={cabGap}
        />
      )}

      {doorDirection && (
        <DoorFaceIndicator
          width={width}
          height={height}
          length={length}
          doorDirection={doorDirection}
          doorSide={doorSide}
        />
      )}

      {hasKingpin && <KingPinMesh width={width} zPos={kingpinZ} kingpinHeight={kingpinHeight} />}

      {hasCab && <AxleWheelAssembly width={width} height={height} zPos={cabFrontAxleZ} />}

      {hasAxleVehicle &&
        axleBDistance !== undefined &&
        axleBDistance > 0 &&
        axleBDistance <= length && (
          <AxleWheelAssembly width={width} height={height} zPos={axleBDistance} />
        )}

      {hasAxleVehicle &&
        (axleDistances ?? []).map((d, i) =>
          d > 0 && d <= length ? (
            <AxleWheelAssembly key={i} width={width} height={height} zPos={d} />
          ) : null,
        )}

      <ContactShadows
        position={[cx, shadowY, cz]}
        scale={Math.max(totalLength, width) * SCENE.CONTACT_SHADOW_SCALE_FACTOR}
        blur={SCENE.CONTACT_SHADOW_BLUR}
        opacity={SCENE.CONTACT_SHADOW_OPACITY}
        far={height * 1.2}
      />
    </>
  );
}

// ─── Canvas Export ────────────────────────────────────────────────────────────

export function VehiclePreview3D(props: VehiclePreview3DProps) {
  const { length, width, height } = props;

  if (!(length > 0) || !(width > 0) || !(height > 0)) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        Ölçüler girilince 3D önizleme görünür
      </div>
    );
  }

  return (
    <Canvas
      camera={{ fov: SCENE.CAMERA_FOV, near: SCENE.CAMERA_NEAR, far: SCENE.CAMERA_FAR }}
      gl={{ antialias: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={[SCENE.BACKGROUND_COLOR]} />
      <VehicleScene {...props} />
    </Canvas>
  );
}
