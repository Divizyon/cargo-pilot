import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type { ProductType } from '@/lib/types/item';

const CYLINDER_SEGMENTS = 16;

interface BoxWrapperProps {
  width: number;
  height: number;
  depth: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  color?: string;
  opacity?: number;
  onClick?: (id: string) => void;
  itemId?: string;
  isSelected?: boolean;
  isHidden?: boolean;
  isGhosted?: boolean;
  productType?: ProductType;
  /** +Z yüzüne (kapıya bakan) uygulanacak etiket texture'ı */
  labelTexture?: THREE.Texture | null;
}

// ─── PaletContent ──────────────────────────────────────────────────────────────
// Tahtalı palet yapısı — center-relative koordinatlarda (origin = bounding box merkezi).
// Backend toplam yüksekliği (palet + kargo) gönderir.
// Palet: sabit PALLET_H_CM yüksekliğinde tahtalı yapı (alt kısım).
// Kargo: kalan yükseklikte düz kutu (üst kısım), ürün rengiyle.

const PALLET_H_CM = 14;

function PaletMat({
  color,
  opacity,
  isSelected,
}: {
  color: string;
  opacity: number;
  isSelected: boolean;
}) {
  return (
    <meshStandardMaterial
      color={color}
      transparent
      opacity={isSelected ? 0.95 : opacity}
      emissive={isSelected ? color : '#000000'}
      emissiveIntensity={isSelected ? 0.25 : 0}
    />
  );
}

function PaletContent({
  width,
  height,
  depth,
  color,
  opacity,
  isSelected,
  isGhosted,
  labelTexture,
}: {
  width: number;
  height: number;
  depth: number;
  color: string;
  opacity: number;
  isSelected: boolean;
  isGhosted: boolean;
  labelTexture?: THREE.Texture | null;
}) {
  // Backend toplam yüksekliği gönderir: paletH sabit, cargoH = kalan
  const paletH = Math.min(PALLET_H_CM, height);
  const cargoH = Math.max(0, height - paletH);

  // Palet geometrisi için oransal hesaplar (paletH üzerinden)
  const deckH = paletH * 0.2;
  const blockH = paletH * 0.6;

  // Genişlik: 6 tahta + 5 boşluk → 23x=width
  const xUnit = width / 23;
  const slatW = 3 * xUnit;

  // Derinlik: 3 stringer
  const yUnit = depth / 3.5;
  const crossD = 0.5 * yUnit;

  // 6 üst tahta merkez X (center-relative, tüm bounding box merkezine göre)
  const slatCentersX = useMemo(() => {
    const unit = width / 23;
    const sw = 3 * unit;
    return Array.from({ length: 6 }, (_, i) => -width / 2 + i * (sw + unit) + sw / 2);
  }, [width]);

  // 3 stringer merkez Z (center-relative)
  const crossCentersZ = useMemo(() => {
    const unit = depth / 3.5;
    const cd = 0.5 * unit;
    return Array.from({ length: 3 }, (_, i) => -depth / 2 + i * (cd + unit) + cd / 2);
  }, [depth]);

  // Bounding box merkezi = Y:0. Palet altta, kargo üstte.
  // Palet alt kenarı: -height/2, üst kenarı: -height/2 + paletH
  // Kargo alt kenarı: -height/2 + paletH, üst kenarı: +height/2
  const paletBottomY = -height / 2;
  const paletCenterY = paletBottomY + paletH / 2;
  const cargoCenterY = paletBottomY + paletH + cargoH / 2;

  const topDeckY = paletCenterY + paletH / 2 - deckH / 2;
  const btmDeckY = paletCenterY - paletH / 2 + deckH / 2;

  if (isGhosted) {
    return (
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        <meshBasicMaterial
          color="#94a3b8"
          wireframe
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>
    );
  }

  return (
    <>
      {/* Üst deck: 6 tahta */}
      {slatCentersX.map((bx, i) => (
        <mesh key={`ts${i}`} position={[bx, topDeckY, 0]}>
          <boxGeometry args={[slatW, deckH, depth]} />
          <PaletMat color={color} opacity={opacity} isSelected={isSelected} />
        </mesh>
      ))}
      {/* Alt stringer: 3 tahta */}
      {crossCentersZ.map((bz, i) => (
        <mesh key={`bs${i}`} position={[0, btmDeckY, bz]}>
          <boxGeometry args={[width, deckH, crossD]} />
          <PaletMat color={color} opacity={opacity} isSelected={isSelected} />
        </mesh>
      ))}
      {/* Bağlantı blokları: 3×3 ızgara */}
      {crossCentersZ.map((bz, zi) =>
        [slatCentersX[0], slatCentersX[2], slatCentersX[5]].map((bx, xi) => (
          <mesh key={`bl${zi}${xi}`} position={[bx, paletCenterY, bz]}>
            <boxGeometry args={[slatW, blockH, crossD]} />
            <PaletMat color={color} opacity={opacity} isSelected={isSelected} />
          </mesh>
        )),
      )}
      {/* Kargo kutusu: palet üstünde, taban hariç 5 yüze label */}
      {cargoH > 0 && (
        <mesh position={[0, cargoCenterY, 0]}>
          <boxGeometry args={[width, cargoH, depth]} />
          {labelTexture ? (
            // BoxGeometry yüz sırası: +X(0), -X(1), +Y(2), -Y(3/taban), +Z(4), -Z(5)
            // Taban (-Y, index 3) düz renk; diğer 5 yüze texture
            <>
              {[0, 1, 2, 3, 4, 5].map((face) =>
                face === 3 ? (
                  <meshStandardMaterial
                    key={face}
                    attach={`material-${face}`}
                    color={color}
                    transparent
                    opacity={isSelected ? 0.95 : opacity}
                    emissive={isSelected ? color : '#000000'}
                    emissiveIntensity={isSelected ? 0.25 : 0}
                  />
                ) : (
                  <meshStandardMaterial
                    key={face}
                    attach={`material-${face}`}
                    map={labelTexture}
                    color="#ffffff"
                  />
                ),
              )}
            </>
          ) : (
            <PaletMat color={color} opacity={opacity} isSelected={isSelected} />
          )}
        </mesh>
      )}
    </>
  );
}

// ─── BoxWrapper ────────────────────────────────────────────────────────────────

export function BoxWrapper({
  width,
  height,
  depth,
  positionX,
  positionY,
  positionZ,
  color = '#2563EB',
  opacity = 0.85,
  onClick,
  itemId,
  isSelected = false,
  isHidden = false,
  isGhosted = false,
  productType,
  labelTexture = null,
}: BoxWrapperProps) {
  const cx = positionX + width / 2;
  const cy = positionY + height / 2;
  const cz = positionZ + depth / 2;

  const isPalet = productType === 'palet';
  const isVaril = productType === 'varil';

  // Cylinder orientation: long axis determines rotation and radius.
  // cylinderGeometry axis is local Y; rotate so it aligns with world X or Z when laid on side.
  const isVarilLongX = isVaril && width > height && width > depth;
  const isVarilLongZ = isVaril && depth > height && depth > width;
  const cylLen = isVarilLongX ? width : isVarilLongZ ? depth : height;
  const cylRadius = isVarilLongX
    ? Math.min(height, depth) / 2
    : isVarilLongZ
      ? Math.min(width, height) / 2
      : Math.min(width, depth) / 2;
  // Euler rotation to align cylinder Y-axis with the correct world axis
  const cylRotation: [number, number, number] = isVarilLongX
    ? [0, 0, -Math.PI / 2]
    : isVarilLongZ
      ? [Math.PI / 2, 0, 0]
      : [0, 0, 0];

  // Palet kendi kenarlarını tahta bazında çizdiği için dış edge geo'ya gerek yok
  const edgesGeo = useMemo<THREE.BufferGeometry | null>(() => {
    if (isPalet) return null;
    if (isVaril) {
      const cyl = new THREE.CylinderGeometry(cylRadius, cylRadius, cylLen, CYLINDER_SEGMENTS);
      const edges = new THREE.EdgesGeometry(cyl);
      cyl.dispose();
      return edges;
    }
    const box = new THREE.BoxGeometry(width, height, depth);
    const edges = new THREE.EdgesGeometry(box);
    box.dispose();
    return edges;
  }, [isPalet, isVaril, cylRadius, cylLen, width, height, depth]);

  useEffect(
    () => () => {
      edgesGeo?.dispose();
    },
    [edgesGeo],
  );

  // 6-material array: +X, -X, +Y, -Y, +Z(kapıya bakan), -Z(arka)
  // Sadece koli + labelTexture varsa kullanılır; varil/palet/ghosted için gerekmez.
  const boxMaterials = useMemo(() => {
    if (isPalet || isVaril || !labelTexture) return null;
    const base = {
      color,
      transparent: true,
      opacity: isSelected ? 0.95 : opacity,
      emissive: isSelected ? color : '#000000',
      emissiveIntensity: isSelected ? 0.25 : 0,
    };
    // Tüm 6 yüze aynı label texture — renk #ffffff ile texture gösterilir
    return Array.from({ length: 6 }, () => {
      const mat = new THREE.MeshStandardMaterial(base);
      mat.map = labelTexture;
      mat.color.set('#ffffff');
      mat.transparent = false;
      mat.opacity = 1;
      mat.emissiveIntensity = 0;
      return mat;
    });
  }, [isPalet, isVaril, labelTexture, color, opacity, isSelected]);

  // Dispose — boxMaterials manuel THREE nesnesi
  useEffect(
    () => () => {
      boxMaterials?.forEach((m) => m.dispose());
    },
    [boxMaterials],
  );

  if (isHidden) return null;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (itemId !== undefined) onClick?.(itemId);
  };

  if (isPalet) {
    return (
      <group position={[cx, cy, cz]} onClick={handleClick}>
        <PaletContent
          width={width}
          height={height}
          depth={depth}
          color={color}
          opacity={opacity}
          isSelected={isSelected}
          isGhosted={isGhosted}
          labelTexture={labelTexture}
        />
      </group>
    );
  }

  return (
    <group position={[cx, cy, cz]} onClick={handleClick}>
      {!isGhosted && (
        <mesh rotation={isVaril ? cylRotation : undefined} material={boxMaterials ?? undefined}>
          {isVaril ? (
            <cylinderGeometry args={[cylRadius, cylRadius, cylLen, CYLINDER_SEGMENTS]} />
          ) : (
            <boxGeometry args={[width, height, depth]} />
          )}
          {!boxMaterials && (
            <meshStandardMaterial
              color={color}
              transparent
              opacity={isSelected ? 0.95 : opacity}
              emissive={isSelected ? color : '#000000'}
              emissiveIntensity={isSelected ? 0.25 : 0}
            />
          )}
        </mesh>
      )}
      {edgesGeo && (
        <lineSegments rotation={isVaril ? cylRotation : undefined} geometry={edgesGeo}>
          <lineBasicMaterial
            color={isGhosted ? '#94a3b8' : isSelected ? color : '#000000'}
            transparent={isGhosted}
            opacity={isGhosted ? 0.4 : 1}
          />
        </lineSegments>
      )}
    </group>
  );
}
