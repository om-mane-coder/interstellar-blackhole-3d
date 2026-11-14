import * as THREE from 'three';

/**
 * Procedural 3D Model of the Endurance Spacecraft (Interstellar)
 * 12 perimeter modules in a rotating ring, central hub, connecting spokes,
 * two docked Ranger exploration landers, and ion thrusters.
 */
export class EnduranceShip {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.ringGroup = new THREE.Group();
    this.orbitRadius = 22.0;
    this.orbitAngle = 0.85;
    this.orbitSpeed = 0.04;
    this.spinSpeed = 0.65; // Rotating ring for artificial gravity

    this.init();
    this.scene.add(this.group);
  }

  init() {
    // Materials
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0xdddddf,
      metalness: 0.85,
      roughness: 0.35,
    });

    const darkHullMat = new THREE.MeshStandardMaterial({
      color: 0x222428,
      metalness: 0.9,
      roughness: 0.4,
    });

    const goldFoilMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.95,
      roughness: 0.25,
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x112233,
      metalness: 0.1,
      roughness: 0.1,
    });

    const ionGlowMat = new THREE.MeshBasicMaterial({
      color: 0x33aaff,
      transparent: true,
      opacity: 0.85,
    });

    const ringRadius = 1.6;
    const numModules = 12;

    // 1. Build the 12 Ring Modules
    for (let i = 0; i < numModules; i++) {
      const angle = (i / numModules) * Math.PI * 2;
      const x = Math.cos(angle) * ringRadius;
      const z = Math.sin(angle) * ringRadius;

      const modGroup = new THREE.Group();
      modGroup.position.set(x, 0, z);
      modGroup.rotation.y = -angle + Math.PI / 2;

      // Module body (box pod)
      const boxGeo = new THREE.BoxGeometry(0.55, 0.38, 0.42);
      const isEngine = i % 3 === 0;
      const isHab = i % 3 === 1;

      const mesh = new THREE.Mesh(boxGeo, isHab ? hullMat : darkHullMat);
      modGroup.add(mesh);

      // Observation windows on habitat pods
      if (isHab) {
        const winGeo = new THREE.PlaneGeometry(0.25, 0.12);
        const win = new THREE.Mesh(winGeo, glassMat);
        win.position.set(0, 0, 0.22);
        modGroup.add(win);
      }

      // Engine nozzles on propulsion pods
      if (isEngine) {
        const coneGeo = new THREE.CylinderGeometry(0.08, 0.15, 0.25, 12);
        const engine = new THREE.Mesh(coneGeo, darkHullMat);
        engine.rotation.x = Math.PI / 2;
        engine.position.set(0, 0, -0.32);
        modGroup.add(engine);

        // Ion exhaust flame
        const flameGeo = new THREE.ConeGeometry(0.12, 0.45, 12);
        const flame = new THREE.Mesh(flameGeo, ionGlowMat);
        flame.rotation.x = -Math.PI / 2;
        flame.position.set(0, 0, -0.6);
        modGroup.add(flame);
      }

      // Connective tube to next module
      const tubeGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.45, 8);
      const tube = new THREE.Mesh(tubeGeo, darkHullMat);
      tube.rotation.z = Math.PI / 2;
      tube.position.set(0.35, 0, 0);
      modGroup.add(tube);

      this.ringGroup.add(modGroup);
    }

    // 2. Central Hub
    const hubGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.55, 16);
    const hubMesh = new THREE.Mesh(hubGeo, hullMat);
    hubMesh.rotation.x = Math.PI / 2;
    this.ringGroup.add(hubMesh);

    // Docking port ring
    const dockRingGeo = new THREE.TorusGeometry(0.25, 0.04, 8, 24);
    const dockRing = new THREE.Mesh(dockRingGeo, goldFoilMat);
    dockRing.position.set(0, 0, 0.3);
    this.ringGroup.add(dockRing);

    // 3. Four Radial Spokes connecting hub to outer ring
    for (let s = 0; s < 4; s++) {
      const spokeAngle = (s / 4) * Math.PI * 2;
      const spokeGeo = new THREE.CylinderGeometry(0.04, 0.04, ringRadius - 0.2, 8);
      const spoke = new THREE.Mesh(spokeGeo, darkHullMat);
      spoke.position.set(
        Math.cos(spokeAngle) * (ringRadius * 0.5),
        0,
        Math.sin(spokeAngle) * (ringRadius * 0.5)
      );
      spoke.rotation.z = Math.PI / 2;
      spoke.rotation.y = -spokeAngle;
      this.ringGroup.add(spoke);
    }

    // 4. Two Docked Ranger Spacecraft
    for (let r = 0; r < 2; r++) {
      const rangerGroup = new THREE.Group();
      const rAngle = r * Math.PI;

      // Delta-wing aerodynamic body
      const bodyShape = new THREE.Shape();
      bodyShape.moveTo(0, 0.45);
      bodyShape.lineTo(0.22, -0.35);
      bodyShape.lineTo(-0.22, -0.35);
      bodyShape.closePath();

      const extrudeSettings = { depth: 0.1, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.03, bevelThickness: 0.03 };
      const rangerGeo = new THREE.ExtrudeGeometry(bodyShape, extrudeSettings);
      const rangerMesh = new THREE.Mesh(rangerGeo, hullMat);
      rangerMesh.rotation.x = Math.PI / 2;
      rangerMesh.scale.set(0.7, 0.7, 0.7);
      rangerGroup.add(rangerMesh);

      rangerGroup.position.set(
        Math.cos(rAngle) * 0.75,
        (r === 0 ? 0.32 : -0.32),
        Math.sin(rAngle) * 0.75
      );
      rangerGroup.rotation.y = -rAngle;
      this.ringGroup.add(rangerGroup);
    }

    // 5. Blinking navigation beacons
    const beaconGeo = new THREE.SphereGeometry(0.035, 8, 8);
    this.beaconRed = new THREE.Mesh(beaconGeo, new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    this.beaconRed.position.set(ringRadius, 0.25, 0);
    this.beaconGreen = new THREE.Mesh(beaconGeo, new THREE.MeshBasicMaterial({ color: 0x22ff22 }));
    this.beaconGreen.position.set(-ringRadius, 0.25, 0);

    this.ringGroup.add(this.beaconRed);
    this.ringGroup.add(this.beaconGreen);

    this.group.add(this.ringGroup);

    // Initial scale and tilt
    this.group.scale.set(1.1, 1.1, 1.1);
    this.updatePosition(0);
  }

  update(delta, time) {
    // Rotate ring along central normal axis (artificial gravity centrifugal rotation)
    this.ringGroup.rotation.y += this.spinSpeed * delta;

    // Orbit around Gargantua
    this.orbitAngle += this.orbitSpeed * delta * 0.3;
    this.updatePosition(time);

    // Beacon blink
    const blink = Math.sin(time * 6.0) > 0.0;
    this.beaconRed.visible = blink;
    this.beaconGreen.visible = !blink;
  }

  updatePosition(time) {
    const x = Math.cos(this.orbitAngle) * this.orbitRadius;
    const z = Math.sin(this.orbitAngle) * this.orbitRadius;
    const y = Math.sin(this.orbitAngle * 2.0) * 1.5; // Slight orbital inclination

    this.group.position.set(x, y, z);

    // Orient ship tangentially along its orbit
    this.group.rotation.y = -this.orbitAngle + Math.PI / 2;
    this.group.rotation.z = 0.2; // slight cinematic roll
  }

  getWorldPosition() {
    const pos = new THREE.Vector3();
    this.group.getWorldPosition(pos);
    return pos;
  }
}
