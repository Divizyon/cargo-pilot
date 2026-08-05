import * as THREE from 'three';

type TrackableResource =
  | THREE.Object3D
  | THREE.BufferGeometry
  | THREE.Material
  | THREE.Texture
  | THREE.WebGLRenderTarget;

const TEXTURE_SLOTS: ReadonlyArray<string> = [
  'map',
  'normalMap',
  'roughnessMap',
  'metalnessMap',
  'aoMap',
  'emissiveMap',
  'displacementMap',
  'lightMap',
  'alphaMap',
  'envMap',
  'bumpMap',
  'specularMap',
];

export class ResourceTracker {
  private geometries = new Set<THREE.BufferGeometry>();
  private materials = new Set<THREE.Material>();
  private textures = new Set<THREE.Texture>();
  private targets = new Set<THREE.WebGLRenderTarget>();

  track<T extends TrackableResource>(resource: T): T {
    if (resource instanceof THREE.BufferGeometry) {
      this.geometries.add(resource);
    } else if (resource instanceof THREE.Material) {
      this.materials.add(resource);
      this.extractTextures(resource);
    } else if (resource instanceof THREE.Texture) {
      this.textures.add(resource);
    } else if (resource instanceof THREE.WebGLRenderTarget) {
      this.targets.add(resource);
      if (resource.texture) this.textures.add(resource.texture);
    } else if (resource instanceof THREE.Object3D) {
      this.trackObject3D(resource);
    }
    return resource;
  }

  disposeAll(): void {
    this.geometries.forEach((geo) => geo.dispose());
    this.geometries.clear();

    this.materials.forEach((mat) => mat.dispose());
    this.materials.clear();

    this.textures.forEach((tex) => tex.dispose());
    this.textures.clear();

    this.targets.forEach((rt) => rt.dispose());
    this.targets.clear();
  }

  get stats() {
    return {
      geometries: this.geometries.size,
      materials: this.materials.size,
      textures: this.textures.size,
      targets: this.targets.size,
    };
  }

  private trackObject3D(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if (
        child instanceof THREE.Mesh ||
        child instanceof THREE.Line ||
        child instanceof THREE.Points ||
        child instanceof THREE.InstancedMesh
      ) {
        if (child.geometry) this.geometries.add(child.geometry);

        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat) => {
          if (mat instanceof THREE.Material) {
            this.materials.add(mat);
            this.extractTextures(mat);
          }
        });
      }
    });
  }

  private extractTextures(mat: THREE.Material): void {
    const record = mat as unknown as Record<string, unknown>;
    TEXTURE_SLOTS.forEach((slot) => {
      const tex = record[slot];
      if (tex instanceof THREE.Texture) this.textures.add(tex);
    });
  }
}
