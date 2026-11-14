import * as THREE from 'three';

/**
 * Spacetime Curvature & Geodesic Infall Particle Streams
 * Visualizes the flow of matter and light along curved geodesics into Gargantua.
 */
export class GeodesicStreams {
  constructor(scene) {
    this.scene = scene;
    this.count = 2500;
    this.particles = null;
    this.positions = null;
    this.velocities = null;
    this.radii = null;
    this.angles = null;

    this.init();
  }

  init() {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(this.count * 3);
    const col = new Float32Array(this.count * 3);
    const sizes = new Float32Array(this.count);

    this.radii = new Float32Array(this.count);
    this.angles = new Float32Array(this.count);
    this.yOffsets = new Float32Array(this.count);
    this.speeds = new Float32Array(this.count);

    for (let i = 0; i < this.count; i++) {
      // Infall radius distribution
      const r = 2.5 + Math.random() * 22.0;
      const angle = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 1.5 * (r / 5.0);

      this.radii[i] = r;
      this.angles[i] = angle;
      this.yOffsets[i] = y;
      this.speeds[i] = 0.5 + Math.random() * 0.5;

      pos[i * 3 + 0] = Math.cos(angle) * r;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = Math.sin(angle) * r;

      // Color shifts: hotter / brighter near horizon
      col[i * 3 + 0] = 1.0;
      col[i * 3 + 1] = 0.7;
      col[i * 3 + 2] = 0.2;

      sizes[i] = 1.5 + Math.random() * 2.5;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Custom shader material for soft glowing geodesic points
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0.0 },
      },
      vertexShader: /* glsl */ `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (40.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float glow = exp(-dist * 4.5);
          gl_FragColor = vec4(vColor, glow * 0.75);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particles = new THREE.Points(geo, mat);
    this.scene.add(this.particles);
  }

  update(delta, time) {
    if (!this.particles || !this.particles.visible) return;

    const pos = this.particles.geometry.attributes.position.array;
    const col = this.particles.geometry.attributes.color.array;

    for (let i = 0; i < this.count; i++) {
      // Infall speed accelerates as matter plunges inward: v ~ 1 / sqrt(r)
      const r = this.radii[i];
      const orbitalSpeed = (3.2 / Math.pow(Math.max(1.2, r), 1.5)) * this.speeds[i];
      const radialInfall = (0.28 / Math.max(0.8, r)) * this.speeds[i];

      this.angles[i] += orbitalSpeed * delta;
      this.radii[i] -= radialInfall * delta * 0.8;

      // Vertical dampening towards accretion disk plane
      this.yOffsets[i] *= 0.995;

      // If crossed into the event horizon, respawn in outer accretion feeder zone
      if (this.radii[i] <= 1.08) {
        this.radii[i] = 20.0 + Math.random() * 5.0;
        this.angles[i] = Math.random() * Math.PI * 2;
        this.yOffsets[i] = (Math.random() - 0.5) * 4.0;
      }

      const curR = this.radii[i];
      const curAngle = this.angles[i];

      pos[i * 3 + 0] = Math.cos(curAngle) * curR;
      pos[i * 3 + 1] = this.yOffsets[i];
      pos[i * 3 + 2] = Math.sin(curAngle) * curR;

      // Color temperature shifts based on gravitational potential
      if (curR < 2.5) {
        // Blazing incandescent core
        col[i * 3 + 0] = 1.0;
        col[i * 3 + 1] = 0.95;
        col[i * 3 + 2] = 0.9;
      } else if (curR < 6.0) {
        // Gargantua Gold
        col[i * 3 + 0] = 1.0;
        col[i * 3 + 1] = 0.65;
        col[i * 3 + 2] = 0.15;
      } else {
        // Cold outer dust / cyan faint glow
        col[i * 3 + 0] = 0.3;
        col[i * 3 + 1] = 0.55;
        col[i * 3 + 2] = 0.85;
      }
    }

    this.particles.geometry.attributes.position.needsUpdate = true;
    this.particles.geometry.attributes.color.needsUpdate = true;
  }

  setVisible(visible) {
    if (this.particles) {
      this.particles.visible = visible;
    }
  }
}
