import * as THREE from 'three';

/**
 * Miller's Planet (Water World)
 * Orbiting in the gravitational well of Gargantua.
 * Extreme relativistic time dilation: 1 Hour = 7 Earth Years.
 */
export class MillersPlanet {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.orbitRadius = 16.5;
    this.orbitAngle = 2.4;
    this.orbitSpeed = 0.055;
    this.radius = 1.35;

    this.init();
    this.createOrbitPath();
    this.scene.add(this.group);
  }

  init() {
    // 1. Ocean Planet Core
    const oceanGeo = new THREE.SphereGeometry(this.radius, 64, 64);
    
    // Procedural ocean shader with sunlight & water shimmer
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0a3c5a,
      roughness: 0.25,
      metalness: 0.1,
    });
    this.planetMesh = new THREE.Mesh(oceanGeo, oceanMat);
    this.group.add(this.planetMesh);

    // 2. Swirling Cloud Layer
    const cloudGeo = new THREE.SphereGeometry(this.radius * 1.02, 64, 64);
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xecf6ff,
      transparent: true,
      opacity: 0.65,
      roughness: 0.8,
    });
    this.cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    this.group.add(this.cloudMesh);

    // 3. Atmospheric Scattering Fresnel Rim Glow
    const atmosGeo = new THREE.SphereGeometry(this.radius * 1.15, 48, 48);
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewPosition);
          float fresnel = dot(normal, viewDir);
          fresnel = clamp(1.0 - fresnel, 0.0, 1.0);
          float glow = pow(fresnel, 2.5);
          gl_FragColor = vec4(0.35, 0.72, 1.0, glow * 0.85);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    this.group.add(this.atmosMesh);

    this.updatePosition();
  }

  createOrbitPath() {
    const points = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(theta) * this.orbitRadius,
        Math.sin(theta) * 0.8,
        Math.sin(theta) * this.orbitRadius
      ));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x3388cc,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
    });
    this.orbitLine = new THREE.Line(geometry, material);
    this.scene.add(this.orbitLine);
  }

  update(delta) {
    // Planet rotation
    this.planetMesh.rotation.y += 0.2 * delta;
    this.cloudMesh.rotation.y += 0.28 * delta;

    // Keplerian orbit
    this.orbitAngle += this.orbitSpeed * delta * 0.3;
    this.updatePosition();
  }

  updatePosition() {
    const x = Math.cos(this.orbitAngle) * this.orbitRadius;
    const z = Math.sin(this.orbitAngle) * this.orbitRadius;
    const y = Math.sin(this.orbitAngle) * 0.8;
    this.group.position.set(x, y, z);
  }

  getWorldPosition() {
    const pos = new THREE.Vector3();
    this.group.getWorldPosition(pos);
    return pos;
  }
}
