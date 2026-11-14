import * as THREE from 'three';

/**
 * Outer Space Asteroid & Accretion Debris Field
 * InstancedMesh of 1,800 debris rocks orbiting Gargantua.
 */
export class AsteroidBelt {
  constructor(scene) {
    this.scene = scene;
    this.count = 1800;
    this.minRadius = 14.0;
    this.maxRadius = 32.0;

    this.init();
    this.scene.add(this.instancedMesh);
  }

  init() {
    // Low-poly irregular rock geometry
    const geo = new THREE.DodecahedronGeometry(0.18, 1);
    
    // Deform vertices slightly for rock-like asymmetry
    const posAttr = geo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);
      const noise = 1.0 + (Math.random() - 0.5) * 0.35;
      posAttr.setXYZ(i, x * noise, y * noise, z * noise);
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x8a847e,
      roughness: 0.9,
      metalness: 0.15,
      flatShading: true,
    });

    this.instancedMesh = new THREE.InstancedMesh(geo, mat, this.count);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    this.dummy = new THREE.Object3D();
    this.asteroidsData = [];

    const color = new THREE.Color();

    for (let i = 0; i < this.count; i++) {
      // Radius distribution: denser near 18-24
      const r = THREE.MathUtils.lerp(this.minRadius, this.maxRadius, Math.pow(Math.random(), 0.85));
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * 1.8 * (r / this.minRadius);
      const speed = (0.04 + Math.random() * 0.05) / Math.pow(r / this.minRadius, 1.5);
      const scale = 0.4 + Math.random() * 1.2;

      const rotSpeed = new THREE.Vector3(
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.8
      );

      this.asteroidsData.push({
        r,
        angle,
        height,
        speed,
        scale,
        rotSpeed,
        rot: new THREE.Vector3(Math.random() * Math.PI, Math.random() * Math.PI, 0)
      });

      // Individual rock tints (some icy grey, some carbonaceous dark, some silicate warm)
      const tint = Math.random();
      if (tint < 0.3) {
        color.setHex(0x5a5550); // Dark carbon
      } else if (tint < 0.7) {
        color.setHex(0x9a8f82); // Silicate stone
      } else {
        color.setHex(0xaec8d8); // Icy fragment
      }
      this.instancedMesh.setColorAt(i, color);
    }

    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }

    this.update(0);
  }

  update(delta) {
    for (let i = 0; i < this.count; i++) {
      const data = this.asteroidsData[i];
      data.angle += data.speed * delta * 0.3;
      data.rot.x += data.rotSpeed.x * delta;
      data.rot.y += data.rotSpeed.y * delta;

      const x = Math.cos(data.angle) * data.r;
      const z = Math.sin(data.angle) * data.r;
      const y = data.height + Math.sin(data.angle * 2.0) * 0.3;

      this.dummy.position.set(x, y, z);
      this.dummy.rotation.set(data.rot.x, data.rot.y, data.rot.z);
      this.dummy.scale.setScalar(data.scale);
      this.dummy.updateMatrix();

      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }
}
