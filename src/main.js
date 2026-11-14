import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import { BlackHoleShader } from './shaders/blackHoleShader.js';
import { EnduranceShip } from './objects/EnduranceShip.js';
import { MillersPlanet } from './objects/MillersPlanet.js';
import { AsteroidBelt } from './objects/AsteroidBelt.js';
import { GeodesicStreams } from './objects/GeodesicStreams.js';
import { SpaceAudio } from './audio/spaceAudio.js';
import { HUD } from './ui/hud.js';

class InterstellarApp {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.clock = new THREE.Clock();

    this.isMobile = this.detectMobile();
    this.cameraMode = 'cinematic'; // 'cinematic', 'endurance', 'miller', 'infall', 'polar', 'free'
    this.camTargetPos = new THREE.Vector3(0, 1.15, 17.5);
    this.camTargetLookAt = new THREE.Vector3(0, 0, 0);

    this.resolutionScale = this.isMobile ? 0.9 : 1.0;

    this.initRenderer();
    this.initScenes();
    this.initCameraAndControls();
    this.initRaymarchingQuad();
    this.initSpaceObjects();
    this.initPostProcessing();
    this.initAudioAndHUD();

    this.onWindowResize = this.onWindowResize.bind(this);
    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('orientationchange', () => {
      setTimeout(this.onWindowResize, 150);
    });

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  detectMobile() {
    return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isMobile,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Clamp DPR for mobile GPUs to ensure high framerate and battery efficiency
    const maxDpr = this.isMobile ? 1.2 : 1.75;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));

    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.autoClear = false;

    // Prevent default gesture bouncing on mobile canvas
    this.renderer.domElement.style.touchAction = 'none';

    // Handle WebGL context recovery
    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('WebGL context lost, waiting for restore...');
    }, false);

    this.renderer.domElement.addEventListener('webglcontextrestored', () => {
      console.log('WebGL context restored');
      this.initRaymarchingQuad();
      this.onWindowResize();
    }, false);

    this.container.appendChild(this.renderer.domElement);
  }

  initScenes() {
    // 1. Background scene for full-screen raymarched black hole & lensing
    this.bgScene = new THREE.Scene();
    this.bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // 2. Foreground 3D scene for spaceships, planets, asteroid debris, and particle streams
    this.mainScene = new THREE.Scene();

    // Subtle ambient lighting for space objects
    const ambientLight = new THREE.AmbientLight(0x223344, 0.4);
    this.mainScene.add(ambientLight);

    // Warm directional light representing the radiant accretion disk illumination
    this.accretionLight = new THREE.PointLight(0xffaa44, 3.5, 80, 1.2);
    this.accretionLight.position.set(0, 0, 0);
    this.mainScene.add(this.accretionLight);

    // Black Occluder Sphere at (0,0,0) to mask 3D objects that pass behind the black hole shadow
    const occluderGeo = new THREE.SphereGeometry(2.52, 32, 32);
    const occluderMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.occluderMesh = new THREE.Mesh(occluderGeo, occluderMat);
    this.mainScene.add(this.occluderMesh);
  }

  initCameraAndControls() {
    this.camera = new THREE.PerspectiveCamera(
      48,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.updateCameraFov();
    this.camera.position.copy(this.camTargetPos);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 2.6;
    this.controls.maxDistance = 65.0;
    this.controls.target.copy(this.camTargetLookAt);
    this.controls.maxPolarAngle = Math.PI - 0.05;
    this.controls.minPolarAngle = 0.05;

    // Mobile touch gestures: 1-finger rotate, 2-finger zoom and pan
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    };

    // Detect user manual interaction to switch to 'free' mode
    this.controls.addEventListener('start', () => {
      if (this.cameraMode !== 'free') {
        this.cameraMode = 'free';
        const freeBtn = document.querySelector('[data-cam="free"]');
        if (freeBtn) {
          document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));
          freeBtn.classList.add('active');
        }
      }
    });
  }

  updateCameraFov() {
    // In portrait orientation on mobile (height > width), widen vertical FOV
    // so the horizontal accretion disk and black hole are fully framed and not cut off!
    if (this.camera.aspect < 1.0) {
      this.camera.fov = Math.min(82, (48 / this.camera.aspect) * 0.72);
    } else {
      this.camera.fov = 48;
    }
    this.camera.updateProjectionMatrix();
  }

  initRaymarchingQuad() {
    const uniforms = THREE.UniformsUtils.clone(BlackHoleShader.uniforms);
    uniforms.u_invProj.value = new THREE.Matrix4();
    uniforms.u_invView.value = new THREE.Matrix4();
    uniforms.u_cameraPos.value = new THREE.Vector3();
    uniforms.u_resolution.value = new THREE.Vector2(window.innerWidth, window.innerHeight);

    // Performance adaptation for mobile devices
    if (this.isMobile) {
      uniforms.u_maxSteps.value = 85;
      uniforms.u_qualityScale.value = 1.35;
    }

    this.shaderMaterial = new THREE.ShaderMaterial({
      vertexShader: BlackHoleShader.vertexShader,
      fragmentShader: BlackHoleShader.fragmentShader,
      uniforms: uniforms,
      depthWrite: false,
      depthTest: false,
    });

    const quadGeo = new THREE.PlaneGeometry(2, 2);
    const quadMesh = new THREE.Mesh(quadGeo, this.shaderMaterial);
    this.bgScene.add(quadMesh);
  }

  initSpaceObjects() {
    // 1. The Endurance Spacecraft
    this.endurance = new EnduranceShip(this.mainScene);

    // 2. Miller's Planet (Water World)
    this.millersPlanet = new MillersPlanet(this.mainScene);

    // 3. Asteroid Debris Belt
    this.asteroidBelt = new AsteroidBelt(this.mainScene);

    // 4. Relativistic Geodesic Stream Flow
    this.geodesicStreams = new GeodesicStreams(this.mainScene);
  }

  initPostProcessing() {
    const renderTarget = new THREE.WebGLRenderTarget(
      window.innerWidth,
      window.innerHeight,
      {
        type: THREE.HalfFloatType,
        format: THREE.RGBAFormat,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
      }
    );

    this.composer = new EffectComposer(this.renderer, renderTarget);
    this.composer.renderToScreen = true;

    // Custom background render pass
    const bgPass = new RenderPass(this.bgScene, this.bgCamera);
    bgPass.clear = true;
    bgPass.clearDepth = true;
    this.composer.addPass(bgPass);

    // Main 3D scene render pass (preserves background color, clears depth only)
    const mainPass = new RenderPass(this.mainScene, this.camera);
    mainPass.clear = false;
    mainPass.clearDepth = true;
    this.composer.addPass(mainPass);

    // Unreal Bloom Pass for incandescent accretion disk luminescence
    const bloomStrength = this.isMobile ? 0.8 : 0.95;
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      bloomStrength,
      0.45,
      0.65
    );
    this.composer.addPass(this.bloomPass);
  }

  initAudioAndHUD() {
    this.audio = new SpaceAudio();
    this.hud = new HUD(this);
  }

  setCameraMode(mode) {
    this.cameraMode = mode;
    if (mode === 'cinematic') {
      this.camTargetPos.set(0, 1.15, 17.5);
      this.camTargetLookAt.set(0, 0, 0);
    } else if (mode === 'endurance') {
      const shipPos = this.endurance.getWorldPosition();
      this.camTargetPos.copy(shipPos).add(new THREE.Vector3(2.6, 1.1, 3.8));
      this.camTargetLookAt.copy(shipPos);
    } else if (mode === 'miller') {
      const pPos = this.millersPlanet.getWorldPosition();
      this.camTargetPos.copy(pPos).add(new THREE.Vector3(2.2, 0.9, 3.2));
      this.camTargetLookAt.copy(pPos);
    } else if (mode === 'infall') {
      this.camTargetPos.set(0, 0.32, 3.2);
      this.camTargetLookAt.set(0, 0, 0);
    } else if (mode === 'polar') {
      this.camTargetPos.set(0, 22.0, 0.05);
      this.camTargetLookAt.set(0, 0, 0);
    }
  }

  setColorScheme(scheme) {
    if (this.shaderMaterial) {
      this.shaderMaterial.uniforms.u_colorScheme.value = scheme;

      if (scheme === 0) {
        this.accretionLight.color.setHex(0xff9922);
      } else if (scheme === 1) {
        this.accretionLight.color.setHex(0x00d5ff);
      } else if (scheme === 2) {
        this.accretionLight.color.setHex(0xd044ff);
      } else if (scheme === 3) {
        this.accretionLight.color.setHex(0xff2233);
      } else {
        this.accretionLight.color.setHex(0xffffff);
      }
    }
  }

  setResolutionScale(scale) {
    this.resolutionScale = scale;
    this.onWindowResize();
  }

  onWindowResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.isMobile = this.detectMobile();
    this.camera.aspect = w / h;
    this.updateCameraFov();

    const maxDpr = this.isMobile ? 1.2 : 1.75;
    const dpr = Math.min(window.devicePixelRatio, maxDpr) * this.resolutionScale;

    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(dpr);

    this.composer.setSize(w, h);
    this.composer.setPixelRatio(dpr);

    if (this.shaderMaterial) {
      this.shaderMaterial.uniforms.u_resolution.value.set(w * dpr, h * dpr);
    }
  }

  animate() {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsedTime = this.clock.getElapsedTime();

    // 1. Dynamic Camera Transitions for presets
    if (this.cameraMode === 'endurance') {
      const shipPos = this.endurance.getWorldPosition();
      const desiredPos = shipPos.clone().add(new THREE.Vector3(2.8, 1.2, 3.5));
      this.camera.position.lerp(desiredPos, delta * 3.0);
      this.controls.target.lerp(shipPos, delta * 4.0);
    } else if (this.cameraMode === 'miller') {
      const pPos = this.millersPlanet.getWorldPosition();
      const desiredPos = pPos.clone().add(new THREE.Vector3(2.4, 0.8, 3.2));
      this.camera.position.lerp(desiredPos, delta * 3.0);
      this.controls.target.lerp(pPos, delta * 4.0);
    } else if (this.cameraMode !== 'free') {
      this.camera.position.lerp(this.camTargetPos, delta * 2.2);
      this.controls.target.lerp(this.camTargetLookAt, delta * 2.5);
    }

    this.controls.update();

    // 2. Update Space Objects
    if (this.endurance) this.endurance.update(delta, elapsedTime);
    if (this.millersPlanet) this.millersPlanet.update(delta);
    if (this.asteroidBelt) this.asteroidBelt.update(delta);
    if (this.geodesicStreams) this.geodesicStreams.update(delta, elapsedTime);

    // 3. Update Black Hole Shader Uniforms
    this.camera.updateMatrixWorld();
    this.shaderMaterial.uniforms.u_time.value = elapsedTime;
    this.shaderMaterial.uniforms.u_cameraPos.value.copy(this.camera.position);
    this.shaderMaterial.uniforms.u_invProj.value.copy(this.camera.projectionMatrixInverse);
    this.shaderMaterial.uniforms.u_invView.value.copy(this.camera.matrixWorld);

    // 4. Update HUD Telemetry
    if (this.hud) {
      this.hud.update(this.camera, delta);
    }

    // 5. Render Scene through Post-Processing Composer
    this.composer.render();
  }
}

// Start Application on Load
window.addEventListener('DOMContentLoaded', () => {
  new InterstellarApp();
});
