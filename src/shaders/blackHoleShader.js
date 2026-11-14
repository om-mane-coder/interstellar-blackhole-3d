/**
 * Movie-Precise Interstellar Gargantua Raymarching Shader
 * Matches the exact visual composition of the iconic movie shot:
 * - Dual-tone contrast: Warm fibrous copper/amber front band vs. brilliant silver-blue/ice-white rear lensed halo.
 * - Razor-thin, needle-sharp silver-white photon ring circling the event horizon shadow.
 * - High-frequency concentric spun-silk striations (fine circular thread filaments).
 * - Longitudinal dark dust lanes along the front accretion stream.
 * - Blinding incandescent white convergence hotspot at the top nexus.
 * - Kerr metric frame-dragging and gravitational lensing.
 */

export const BlackHoleShader = {
  uniforms: {
    u_time: { value: 0.0 },
    u_resolution: { value: [window.innerWidth, window.innerHeight] },
    u_invProj: { value: null },
    u_invView: { value: null },
    u_cameraPos: { value: null },
    u_radius: { value: 1.0 },              // Schwarzschild radius Rs
    u_diskInner: { value: 2.3 },           // Inner disk rim (ISCO)
    u_diskOuter: { value: 14.2 },          // Outer disk rim
    u_lensStrength: { value: 1.0 },        // General relativity deflection multiplier
    u_spinSpeed: { value: 0.7 },           // Accretion disk rotation rate
    u_diskBrightness: { value: 1.75 },     // Exposure multiplier
    u_diskDensity: { value: 1.3 },         // Volumetric optical density
    u_diskThickness: { value: 0.035 },     // Scale height H/R
    u_dopplerEnabled: { value: 1 },        // Relativistic Doppler beaming
    u_redshiftEnabled: { value: 1 },       // Gravitational redshift
    u_colorScheme: { value: 0 },           // 0: Movie Iconic (Copper + Silver Blue), 1: Gold, 2: Cyan, 3: UV, 4: Pure White
    u_starIntensity: { value: 0.9 },       // Background starfield brightness
    u_nebulaIntensity: { value: 0.6 },     // Deep space nebula glow
    u_maxSteps: { value: 160 },            // Max raymarching steps
    u_qualityScale: { value: 1.0 }         // Step multiplier
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    precision highp float;

    varying vec2 vUv;

    uniform float u_time;
    uniform vec2 u_resolution;
    uniform mat4 u_invProj;
    uniform mat4 u_invView;
    uniform vec3 u_cameraPos;

    uniform float u_radius;
    uniform float u_diskInner;
    uniform float u_diskOuter;
    uniform float u_lensStrength;
    uniform float u_spinSpeed;
    uniform float u_diskBrightness;
    uniform float u_diskDensity;
    uniform float u_diskThickness;
    uniform int u_dopplerEnabled;
    uniform int u_redshiftEnabled;
    uniform int u_colorScheme;
    uniform float u_starIntensity;
    uniform float u_nebulaIntensity;
    uniform int u_maxSteps;
    uniform float u_qualityScale;

    #define PI 3.14159265358979323846

    // --- Fast Hash & Noise ---
    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    float hash13(vec3 p) {
      p = fract(p * 0.1031);
      p += dot(p, p.zyx + 31.32);
      return fract((p.x + p.y) * p.z);
    }

    vec3 hash33(vec3 p) {
      p = fract(p * vec3(0.1031, 0.1030, 0.0973));
      p += dot(p, p.yxz + 33.33);
      return fract((p.xxy + p.yxx) * p.zyx);
    }

    float noise2D(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash12(i);
      float b = hash12(i + vec2(1.0, 0.0));
      float c = hash12(i + vec2(0.0, 1.0));
      float d = hash12(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    float noise3D(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash13(i);
      float b = hash13(i + vec3(1.0, 0.0, 0.0));
      float c = hash13(i + vec3(0.0, 1.0, 0.0));
      float d = hash13(i + vec3(1.0, 1.0, 0.0));
      float e = hash13(i + vec3(0.0, 0.0, 1.0));
      float f1 = hash13(i + vec3(1.0, 0.0, 1.0));
      float g = hash13(i + vec3(0.0, 1.0, 1.0));
      float h = hash13(i + vec3(1.0, 1.0, 1.0));
      return mix(
        mix(mix(a, b, f.x), mix(c, d, f.x), f.y),
        mix(mix(e, f1, f.x), mix(g, h, f.x), f.y),
        f.z
      );
    }

    // High frequency plasma turbulence
    float fbmPlasma(vec2 uv) {
      float v = 0.0;
      float a = 0.52;
      mat2 rot = mat2(cos(0.48), sin(0.48), -sin(0.48), cos(0.48));
      for (int i = 0; i < 5; i++) {
        v += a * noise2D(uv);
        uv = rot * uv * 2.25 + vec2(1.8, 3.9);
        a *= 0.47;
      }
      return v;
    }

    // --- Dual-Tone Color Palette (Movie Reference: Copper Front + Silver-Blue Rear) ---
    vec3 getAccretionColor(float rNorm, float isFront, float dopplerFactor, float redshiftFactor) {
      vec3 col;
      if (u_colorScheme == 0) {
        // EXACT MOVIE ICON PALETTE:
        if (isFront > 0.5) {
          // FRONT BAND: Warm fibrous copper, smoked amber-russet, dark mahogany dust
          vec3 cCore   = vec3(1.75, 1.45, 1.15); // Hot white-amber convergence
          vec3 cInner  = vec3(1.35, 0.82, 0.42); // Warm copper
          vec3 cMid    = vec3(1.05, 0.52, 0.22); // Smoked russet
          vec3 cOuter  = vec3(0.55, 0.22, 0.08); // Dark mahogany dust
          if (rNorm < 0.2) {
            col = mix(cCore, cInner, rNorm / 0.2);
          } else if (rNorm < 0.6) {
            col = mix(cInner, cMid, (rNorm - 0.2) / 0.4);
          } else {
            col = mix(cMid, cOuter, (rNorm - 0.6) / 0.4);
          }
        } else {
          // REAR LENSED HALO: Brilliant silver-blue, ice-white, pale platinum concentric filaments
          vec3 cCore   = vec3(1.85, 1.95, 2.15); // Blinding pure ice-white
          vec3 cInner  = vec3(1.25, 1.42, 1.68); // Platinum silver-blue
          vec3 cMid    = vec3(0.82, 1.05, 1.35); // Cool azure tint
          vec3 cOuter  = vec3(0.45, 0.62, 0.88); // Deep interstellar blue
          if (rNorm < 0.18) {
            col = mix(cCore, cInner, rNorm / 0.18);
          } else if (rNorm < 0.58) {
            col = mix(cInner, cMid, (rNorm - 0.18) / 0.4);
          } else {
            col = mix(cMid, cOuter, (rNorm - 0.58) / 0.42);
          }
        }
      } else if (u_colorScheme == 1) {
        // Classic Warm Gold
        vec3 cCore   = vec3(1.65, 1.48, 1.15);
        vec3 cInner  = vec3(1.38, 0.95, 0.38);
        vec3 cMid    = vec3(1.12, 0.52, 0.12);
        vec3 cOuter  = vec3(0.65, 0.18, 0.03);
        col = mix(cCore, cInner, smoothstep(0.0, 0.25, rNorm));
        col = mix(col, cMid, smoothstep(0.25, 0.65, rNorm));
        col = mix(col, cOuter, smoothstep(0.65, 1.0, rNorm));
      } else if (u_colorScheme == 2) {
        // Stellar Cyan
        vec3 cCore  = vec3(1.4, 1.6, 1.8);
        vec3 cInner = vec3(0.2, 0.9, 1.4);
        vec3 cMid   = vec3(0.05, 0.5, 1.0);
        vec3 cOuter = vec3(0.01, 0.18, 0.6);
        col = mix(cCore, cInner, smoothstep(0.0, 0.25, rNorm));
        col = mix(col, cMid, smoothstep(0.25, 0.65, rNorm));
        col = mix(col, cOuter, smoothstep(0.65, 1.0, rNorm));
      } else if (u_colorScheme == 3) {
        // Ultraviolet Blazar
        vec3 cCore  = vec3(1.5, 1.3, 1.7);
        vec3 cInner = vec3(0.9, 0.3, 1.3);
        vec3 cMid   = vec3(0.5, 0.08, 0.85);
        vec3 cOuter = vec3(0.2, 0.02, 0.45);
        col = mix(cCore, cInner, smoothstep(0.0, 0.3, rNorm));
        col = mix(col, cMid, smoothstep(0.3, 0.7, rNorm));
        col = mix(col, cOuter, smoothstep(0.7, 1.0, rNorm));
      } else {
        // Pure White Thermal
        col = vec3(1.0);
      }

      // Relativistic Temperature Shift
      float tempShift = dopplerFactor * redshiftFactor;
      if (tempShift > 1.15) {
        col = mix(col, vec3(1.6, 1.65, 1.85), clamp((tempShift - 1.15) * 0.7, 0.0, 0.85));
      } else if (tempShift < 0.85) {
        col = mix(col, vec3(col.r * 1.15, col.g * 0.42, 0.02), clamp((0.85 - tempShift) * 1.3, 0.0, 0.9));
      }

      return col;
    }

    // --- Volumetric Accretion Point Evaluation ---
    vec4 evaluateAccretionPoint(vec3 pos, float r, vec3 rayDir, float isFront) {
      if (r < u_diskInner || r > u_diskOuter) return vec4(0.0);

      float rNorm = (r - u_diskInner) / (u_diskOuter - u_diskInner);

      // 1. Vertical scale height profile
      float diskHeight = u_diskThickness * (0.045 * r + 0.022);
      float vertProfile = exp(-pos.y * pos.y / (2.0 * diskHeight * diskHeight));
      if (vertProfile < 0.005) return vec4(0.0);

      // 2. Radial density profile (sharp ISCO inner cliff, peak, and outer decline)
      float rProfile = smoothstep(0.0, 0.08, rNorm) * pow(max(0.0, 1.0 - rNorm * 0.92), 1.6);
      rProfile *= pow(u_diskInner / r, 1.35);

      // 3. Spun-Silk Concentric Thread Striations (High frequency circular rings)
      float logR = log(r / u_diskInner);
      float striations = sin(72.0 * logR) * 0.32
                       + sin(155.0 * logR) * 0.22
                       + cos(310.0 * logR) * 0.14
                       + sin(620.0 * logR) * 0.07;

      // 4. Azimuthal Keplerian shear & fibrous dust filaments
      float phi = atan(pos.z, pos.x);
      float omega = 3.6 / pow(r / u_diskInner, 1.5);
      float rotAngle = phi - omega * u_time * u_spinSpeed;

      // Longitudinal fibrous streaks
      float fiber1 = sin(4.0 * rotAngle - 5.5 * log(r) + u_time * 0.3);
      float fiber2 = cos(8.0 * rotAngle - 8.5 * log(r) - u_time * 0.2);
      float noiseVal = fbmPlasma(vec2(rotAngle * 3.2, log(r) * 6.5));

      // Dark dust lanes along the front stream
      float dustLane = 1.0;
      if (isFront > 0.5) {
        float dustNoise = noise2D(vec2(rotAngle * 6.0, r * 2.5));
        dustLane = smoothstep(0.25, 0.75, dustNoise) * 0.65 + 0.35;
      }

      float structure = (0.55 + striations + 0.22 * fiber1 + 0.14 * fiber2 + 0.42 * noiseVal) * dustLane;
      float density = rProfile * vertProfile * max(0.0, structure);

      // 5. Relativistic Doppler Boosting
      float dopplerFactor = 1.0;
      float betaOrb = clamp(sqrt(u_radius / (2.0 * r)), 0.0, 0.62);

      if (u_dopplerEnabled == 1) {
        vec3 vOrb = betaOrb * vec3(-sin(phi), 0.0, cos(phi));
        float betaParallel = dot(vOrb, -rayDir);
        float gamma = 1.0 / sqrt(max(0.001, 1.0 - betaOrb * betaOrb));
        dopplerFactor = 1.0 / (gamma * (1.0 - betaParallel));
      }

      // 6. Gravitational Redshift
      float redshiftFactor = 1.0;
      if (u_redshiftEnabled == 1) {
        redshiftFactor = sqrt(max(0.01, 1.0 - u_radius / r));
      }

      float intensityBoost = (u_dopplerEnabled == 1) ? pow(dopplerFactor, 2.2) : 1.0;

      // Dual-tone color calculation
      vec3 color = getAccretionColor(rNorm, isFront, dopplerFactor, redshiftFactor);
      color *= intensityBoost * u_diskBrightness;

      // Convergence Hotspot at the top junction (where front stream meets rear halo)
      if (rNorm < 0.16 && pos.y > 0.0) {
        color += vec3(1.6, 1.7, 1.9) * (0.16 - rNorm) * 6.0;
      }

      float alpha = density * u_diskDensity;
      return vec4(color, alpha);
    }

    // --- Deep Space Background ---
    vec3 sampleSpaceBackground(vec3 dir) {
      vec3 col = vec3(0.001, 0.0015, 0.004); // Deep pristine space vacuum

      // Subtle celestial nebula
      vec3 pNeb = dir * 3.5;
      float n1 = noise3D(pNeb + vec3(u_time * 0.005, 0.0, 0.0));
      float n2 = noise3D(pNeb * 2.2);
      float nebVal = smoothstep(0.35, 0.9, n1 * 0.65 + n2 * 0.35);

      vec3 nebCyan = vec3(0.08, 0.38, 0.75);
      vec3 nebMagenta = vec3(0.65, 0.12, 0.55);
      vec3 nebColor = mix(nebCyan, nebMagenta, sin(dir.x * 2.0 + dir.y * 3.0) * 0.5 + 0.5);
      col += nebColor * nebVal * 0.3 * u_nebulaIntensity;

      // Sharp pinpoint stars
      vec3 pStar1 = dir * 210.0;
      vec3 grid1 = floor(pStar1);
      float rnd1 = hash13(grid1);
      if (rnd1 > 0.955) {
        vec3 starOffset = hash33(grid1) - 0.5;
        float d = length(fract(pStar1) - 0.5 - starOffset * 0.6);
        float star = smoothstep(0.18, 0.0, d);
        
        vec3 starCol = (rnd1 > 0.985) ? vec3(0.8, 0.95, 1.4) : vec3(1.15, 1.1, 0.9);
        float twinkle = sin(u_time * 2.5 + rnd1 * 50.0) * 0.25 + 0.75;
        col += starCol * star * rnd1 * twinkle * 2.2 * u_starIntensity;
      }

      return col;
    }

    void main() {
      // Reconstruct world-space camera ray
      vec2 ndc = vUv * 2.0 - 1.0;
      vec4 clip = vec4(ndc, 1.0, 1.0);
      vec4 viewSpace = u_invProj * clip;
      viewSpace /= viewSpace.w;
      vec3 rayDir = normalize((u_invView * vec4(viewSpace.xyz, 0.0)).xyz);
      vec3 rayPos = u_cameraPos;

      vec3 accumColor = vec3(0.0);
      float accumAlpha = 0.0;

      float Rs = u_radius;
      float escapeRadius = u_diskOuter * 2.8;

      // Track closest approach to black hole for needle-sharp photon ring
      float minDistance = 1e6;

      // Kerr frame-dragging parameter
      float spin = 0.92;
      vec3 spinAxis = vec3(0.0, 1.0, 0.0);

      // Adaptive Kerr-Schwarzschild null geodesic raymarcher
      for (int i = 0; i < 190; i++) {
        if (i >= u_maxSteps) break;

        float r = length(rayPos);
        minDistance = min(minDistance, r);

        // 1. Event Horizon Absorption
        if (r <= Rs * 1.008) {
          // Ray trapped forever in the singularity
          break;
        }

        // 2. Escape Check
        if (r > escapeRadius && dot(rayPos, rayDir) > 0.0) {
          vec3 sky = sampleSpaceBackground(rayDir);
          accumColor += (1.0 - accumAlpha) * sky;
          accumAlpha = 1.0;
          break;
        }

        // 3. Relativistic Geodesic Deflection with Kerr Frame-Dragging
        vec3 rHat = rayPos / r;
        float rDotV = dot(rHat, rayDir);
        float L2 = max(0.0, 1.0 - rDotV * rDotV);

        // Schwarzschild deflection
        vec3 accel = -1.5 * Rs * (L2 / (r * r * r)) * rHat * u_lensStrength;

        // Frame-dragging
        vec3 drag = (2.0 * spin * Rs / (r * r * r)) * cross(spinAxis, rayDir) * u_lensStrength;
        accel += drag * 0.35;

        // Adaptive step length: dense steps near horizon and photon sphere
        float dt = clamp(r * 0.038, 0.016, 0.36) * u_qualityScale;

        vec3 nextPos = rayPos + rayDir * dt;
        vec3 nextDir = normalize(rayDir + accel * dt);

        // Distinguish front stream vs rear lensed halo:
        // Front stream has z > 0 relative to black hole (in front of singularity)
        float isFront = (rayPos.z > 0.0) ? 1.0 : 0.0;

        // 4. Exact Equatorial Plane Crossing (y = 0)
        if (rayPos.y * nextPos.y <= 0.0 && abs(rayPos.y - nextPos.y) > 1e-5) {
          float tCross = -rayPos.y / (nextPos.y - rayPos.y);
          vec3 pHit = mix(rayPos, nextPos, tCross);
          float rHit = length(pHit.xz);

          if (rHit >= u_diskInner && rHit <= u_diskOuter) {
            float hitIsFront = (pHit.z > 0.0) ? 1.0 : 0.0;
            vec4 surfSample = evaluateAccretionPoint(pHit, rHit, rayDir, hitIsFront);
            float stepAlpha = clamp(surfSample.a * 1.5, 0.0, 0.985);
            accumColor += (1.0 - accumAlpha) * surfSample.rgb * stepAlpha;
            accumAlpha += (1.0 - accumAlpha) * stepAlpha;

            if (accumAlpha > 0.985) break;
          }
        }

        // 5. Continuous Volumetric Integration through vertical scale height
        float diskHeight = u_diskThickness * (0.045 * r + 0.022);
        if (r >= u_diskInner && r <= u_diskOuter && abs(rayPos.y) < diskHeight * 3.2) {
          vec4 volSample = evaluateAccretionPoint(rayPos, r, rayDir, isFront);
          float dTau = volSample.a * 0.58 * dt;
          float volAlpha = 1.0 - exp(-dTau);
          accumColor += (1.0 - accumAlpha) * volSample.rgb * volAlpha;
          accumAlpha += (1.0 - accumAlpha) * volAlpha;

          if (accumAlpha > 0.985) break;
        }

        // Advance ray
        rayPos = nextPos;
        rayDir = nextDir;
      }

      // 6. Needle-Sharp Silver-White Photon Ring around the Shadow Edge
      // Critical impact parameter b_crit approx 2.598 * Rs (shadow boundary)
      float photonRingRadius = 2.598 * Rs;
      float photonDist = abs(minDistance - photonRingRadius);
      float photonSharpness = exp(-photonDist * photonDist / 0.0045);
      vec3 photonRingCol = vec3(1.7, 1.85, 2.1) * photonSharpness * 2.6;
      accumColor += (1.0 - accumAlpha) * photonRingCol;

      // Blend remaining background
      if (accumAlpha < 1.0) {
        vec3 sky = sampleSpaceBackground(rayDir);
        accumColor += (1.0 - accumAlpha) * sky;
      }

      // 7. Panavision 70mm Anamorphic Lens Flare
      float flareUv = abs(vUv.y - 0.5);
      float horizStreak = exp(-flareUv * 75.0) * smoothstep(1.3, 3.8, length(accumColor));
      accumColor += vec3(1.15, 0.95, 0.65) * horizStreak * 0.25;

      // 8. Filmic Tone Mapping (ACES HDR curve)
      vec3 x = accumColor * 0.92;
      vec3 a = vec3(2.51);
      vec3 b = vec3(0.03);
      vec3 c = vec3(2.43);
      vec3 d = vec3(0.59);
      vec3 e = vec3(0.14);
      vec3 mapped = clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);

      // Gamma correction
      mapped = pow(mapped, vec3(1.0 / 1.12));

      // Subtle vignette
      vec2 vigUv = (vUv - 0.5) * 2.0;
      float vignette = 1.0 - dot(vigUv, vigUv) * 0.15;
      mapped *= clamp(vignette, 0.0, 1.0);

      gl_FragColor = vec4(mapped, 1.0);
    }
  `
};
