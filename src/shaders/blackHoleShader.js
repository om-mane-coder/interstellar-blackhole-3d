/**
 * Movie-Precise Interstellar Gargantua Raymarching Shader
 * Implements Kerr-Schwarzschild null geodesics with frame-dragging,
 * volumetric accretion disk with Keplerian differential shear, concentric density striations,
 * relativistic Doppler boosting calibrated to Christopher Nolan's visual aesthetic,
 * gravitational redshift, razor-sharp photon ring, and anamorphic lens bloom.
 */

export const BlackHoleShader = {
  uniforms: {
    u_time: { value: 0.0 },
    u_resolution: { value: [window.innerWidth, window.innerHeight] },
    u_invProj: { value: null },
    u_invView: { value: null },
    u_cameraPos: { value: null },
    u_radius: { value: 1.0 },              // Schwarzschild radius Rs
    u_diskInner: { value: 2.35 },          // Inner disk rim (ISCO)
    u_diskOuter: { value: 13.8 },          // Outer disk rim
    u_lensStrength: { value: 1.0 },        // General relativity deflection multiplier
    u_spinSpeed: { value: 0.75 },          // Accretion disk rotation rate
    u_diskBrightness: { value: 1.6 },      // Exposure multiplier
    u_diskDensity: { value: 1.15 },        // Volumetric optical density
    u_diskThickness: { value: 0.038 },     // Scale height H/R
    u_dopplerEnabled: { value: 1 },        // Relativistic Doppler beaming
    u_redshiftEnabled: { value: 1 },       // Gravitational redshift
    u_colorScheme: { value: 0 },           // 0: Movie Gargantua Gold, 1: Cyan, 2: UV Blazar, 3: Crimson, 4: Pure White
    u_starIntensity: { value: 1.2 },       // Background starfield brightness
    u_nebulaIntensity: { value: 1.0 },     // Deep space nebula glow
    u_maxSteps: { value: 140 },            // Max raymarching steps
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

    // --- Fast Procedural Hash & Noise ---
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

    // High-resolution multi-scale plasma turbulence
    float fbmPlasma(vec2 uv) {
      float v = 0.0;
      float a = 0.52;
      mat2 rot = mat2(cos(0.45), sin(0.45), -sin(0.45), cos(0.45));
      for (int i = 0; i < 5; i++) {
        v += a * noise2D(uv);
        uv = rot * uv * 2.22 + vec2(1.9, 3.7);
        a *= 0.48;
      }
      return v;
    }

    // --- Gargantua Accretion Color Palette (Calibrated to Interstellar) ---
    vec3 getAccretionColor(float rNorm, float dopplerFactor, float redshiftFactor) {
      vec3 col;
      if (u_colorScheme == 0) {
        // True Movie Interstellar Palette:
        // Inner edge: Blinding incandescent white-gold
        // Mid body: Molten amber-gold with rich orange undertones
        // Outer rim: Smoky bronze and dark russet filaments
        vec3 cCore   = vec3(1.65, 1.48, 1.15); // Blazing hot core
        vec3 cInner  = vec3(1.42, 1.05, 0.45); // Warm gold
        vec3 cMid    = vec3(1.15, 0.58, 0.12); // Amber flame
        vec3 cOuter  = vec3(0.72, 0.22, 0.04); // Smoky bronze
        vec3 cEdge   = vec3(0.35, 0.08, 0.01); // Dark dust

        if (rNorm < 0.18) {
          col = mix(cCore, cInner, rNorm / 0.18);
        } else if (rNorm < 0.55) {
          col = mix(cInner, cMid, (rNorm - 0.18) / 0.37);
        } else if (rNorm < 0.85) {
          col = mix(cMid, cOuter, (rNorm - 0.55) / 0.30);
        } else {
          col = mix(cOuter, cEdge, (rNorm - 0.85) / 0.15);
        }
      } else if (u_colorScheme == 1) {
        // Stellar Cyan
        vec3 cCore  = vec3(1.4, 1.55, 1.7);
        vec3 cInner = vec3(0.2, 0.85, 1.3);
        vec3 cMid   = vec3(0.05, 0.45, 0.95);
        vec3 cOuter = vec3(0.01, 0.15, 0.55);
        col = mix(cCore, cInner, smoothstep(0.0, 0.25, rNorm));
        col = mix(col, cMid, smoothstep(0.25, 0.65, rNorm));
        col = mix(col, cOuter, smoothstep(0.65, 1.0, rNorm));
      } else if (u_colorScheme == 2) {
        // Ultraviolet Blazar
        vec3 cCore  = vec3(1.5, 1.3, 1.7);
        vec3 cInner = vec3(0.9, 0.3, 1.3);
        vec3 cMid   = vec3(0.5, 0.08, 0.85);
        vec3 cOuter = vec3(0.2, 0.02, 0.45);
        col = mix(cCore, cInner, smoothstep(0.0, 0.3, rNorm));
        col = mix(col, cMid, smoothstep(0.3, 0.7, rNorm));
        col = mix(col, cOuter, smoothstep(0.7, 1.0, rNorm));
      } else if (u_colorScheme == 3) {
        // Crimson / Relativistic Flare
        vec3 cCore  = vec3(1.6, 0.8, 0.4);
        vec3 cInner = vec3(1.3, 0.25, 0.08);
        vec3 cMid   = vec3(0.85, 0.08, 0.02);
        vec3 cOuter = vec3(0.4, 0.02, 0.005);
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
        // Blueshift: shifts hot side towards pure brilliant white
        col = mix(col, vec3(1.5, 1.5, 1.6), clamp((tempShift - 1.15) * 0.75, 0.0, 0.85));
      } else if (tempShift < 0.85) {
        // Redshift: shifts receding side towards deep fiery amber/infrared
        col = mix(col, vec3(col.r * 1.1, col.g * 0.45, 0.02), clamp((0.85 - tempShift) * 1.4, 0.0, 0.9));
      }

      return col;
    }

    // --- Volumetric Accretion Density & Radiance ---
    vec4 evaluateAccretionPoint(vec3 pos, float r, vec3 rayDir) {
      if (r < u_diskInner || r > u_diskOuter) return vec4(0.0);

      float rNorm = (r - u_diskInner) / (u_diskOuter - u_diskInner);

      // 1. Vertical Gaussian density profile with distance-adaptive subpixel anti-aliasing
      float camDist = length(u_cameraPos);
      float pixelFootprint = max(0.016, camDist * 0.0028);
      float diskHeight = max(u_diskThickness * (0.042 * r + 0.025), pixelFootprint);
      float vertProfile = exp(-pos.y * pos.y / (2.0 * diskHeight * diskHeight));
      if (vertProfile < 0.004) return vec4(0.0);

      // 2. Radial density profile with sharp ISCO cutoff and power-law outer tail
      float rProfile = smoothstep(0.0, 0.07, rNorm) * pow(max(0.0, 1.0 - rNorm * 0.9), 1.55);
      rProfile *= pow(u_diskInner / r, 1.35);

      // 3. Concentric density striations (Keplerian orbital rings)
      float striations = sin(38.0 * log(r / u_diskInner)) * 0.14
                       + sin(82.0 * log(r / u_diskInner)) * 0.08
                       + cos(140.0 * log(r / u_diskInner)) * 0.05;

      // 4. Azimuthal Keplerian shear & turbulent plasma filaments
      float phi = atan(pos.z, pos.x);
      float omega = 3.8 / pow(r / u_diskInner, 1.5);
      float rotAngle = phi - omega * u_time * u_spinSpeed;

      // Swirling spiral density arms
      float spiral1 = sin(3.0 * rotAngle - 4.5 * log(r) + u_time * 0.35);
      float spiral2 = cos(6.0 * rotAngle - 7.5 * log(r) - u_time * 0.2);
      float noiseVal = fbmPlasma(vec2(rotAngle * 2.8, log(r) * 5.5));

      float structure = 0.55 + striations + 0.22 * spiral1 + 0.15 * spiral2 + 0.45 * noiseVal;
      float density = rProfile * vertProfile * max(0.0, structure);

      // 5. Relativistic Doppler Boosting (Calibrated to Christopher Nolan's movie balance)
      float dopplerFactor = 1.0;
      float betaOrb = clamp(sqrt(u_radius / (2.0 * r)), 0.0, 0.62);

      if (u_dopplerEnabled == 1) {
        // Matter orbiting counter-clockwise in XZ plane
        vec3 vOrb = betaOrb * vec3(-sin(phi), 0.0, cos(phi));
        // Angle with incoming photon (-rayDir)
        float betaParallel = dot(vOrb, -rayDir);
        float gamma = 1.0 / sqrt(max(0.001, 1.0 - betaOrb * betaOrb));
        dopplerFactor = 1.0 / (gamma * (1.0 - betaParallel));
      }

      // 6. Gravitational Redshift
      float redshiftFactor = 1.0;
      if (u_redshiftEnabled == 1) {
        redshiftFactor = sqrt(max(0.01, 1.0 - u_radius / r));
      }

      // Nolan balanced exponent: ~2.0 creates authentic asymmetry without hiding the right side
      float intensityBoost = (u_dopplerEnabled == 1) ? pow(dopplerFactor, 2.3) : 1.0;

      // Color and radiance
      vec3 color = getAccretionColor(rNorm, dopplerFactor, redshiftFactor);
      color *= intensityBoost * u_diskBrightness;

      // Inner boundary incandescent glow boost & razor-sharp photon ring
      if (rNorm < 0.15) {
        float innerPeak = exp(-rNorm * 22.0) * 3.5;
        color += vec3(1.8, 1.6, 1.2) * innerPeak * u_diskBrightness;
        color *= 1.0 + (0.15 - rNorm) * 4.5;
      }

      float alpha = density * u_diskDensity;
      return vec4(color, alpha);
    }

    // --- Deep Space Background (Stars, Nebulae, Galactic Plane) ---
    vec3 sampleSpaceBackground(vec3 dir) {
      vec3 col = vec3(0.001, 0.002, 0.006); // Pristine outer vacuum

      // 1. Cosmic Nebulae (Interstellar molecular clouds)
      vec3 pNeb = dir * 3.5;
      float n1 = noise3D(pNeb + vec3(u_time * 0.006, 0.0, 0.0));
      float n2 = noise3D(pNeb * 2.2 - vec3(0.0, u_time * 0.004, 0.0));
      float nebVal = n1 * 0.65 + n2 * 0.35;
      nebVal = smoothstep(0.32, 0.88, nebVal);

      vec3 nebCyan = vec3(0.08, 0.42, 0.85);
      vec3 nebMagenta = vec3(0.72, 0.12, 0.62);
      vec3 nebGold = vec3(0.95, 0.55, 0.12);
      vec3 nebColor = mix(nebCyan, nebMagenta, sin(dir.x * 2.2 + dir.y * 3.1) * 0.5 + 0.5);
      nebColor = mix(nebColor, nebGold, n2 * 0.5);

      col += nebColor * nebVal * 0.4 * u_nebulaIntensity;

      // 2. Galactic Core Band
      float galPlane = exp(-abs(dir.y + 0.22 * sin(dir.x * 2.0)) * 8.0);
      float galDust = noise3D(dir * 8.5);
      col += vec3(0.42, 0.38, 0.52) * galPlane * (0.35 + 0.65 * galDust) * 0.5 * u_nebulaIntensity;

      // 3. Realistic Cold Deep Space Stars
      vec3 pStar1 = dir * 190.0;
      vec3 grid1 = floor(pStar1);
      float rnd1 = hash13(grid1);
      if (rnd1 > 0.945) {
        vec3 starOffset = hash33(grid1) - 0.5;
        float d = length(fract(pStar1) - 0.5 - starOffset * 0.6);
        float star = smoothstep(0.2, 0.0, d);
        
        vec3 starCol = vec3(1.0);
        float sType = hash13(grid1 + 10.0);
        if (sType < 0.28) starCol = vec3(0.72, 0.88, 1.45); // Blue Hypergiant
        else if (sType < 0.65) starCol = vec3(1.2, 1.12, 0.9); // Sun-like G
        else starCol = vec3(1.3, 0.58, 0.3); // Red Dwarf

        float twinkle = sin(u_time * 2.5 + rnd1 * 50.0) * 0.25 + 0.75;
        col += starCol * star * rnd1 * twinkle * 2.5 * u_starIntensity;
      }

      // Prominent bright stars with subtle diffraction halos
      vec3 pStar2 = dir * 80.0;
      vec3 grid2 = floor(pStar2);
      float rnd2 = hash13(grid2);
      if (rnd2 > 0.988) {
        vec3 starOffset = hash33(grid2) - 0.5;
        float d = length(fract(pStar2) - 0.5 - starOffset * 0.5);
        float starCore = smoothstep(0.16, 0.0, d);
        float starHalo = smoothstep(0.42, 0.0, d) * 0.22;
        vec3 starCol = (rnd2 > 0.994) ? vec3(0.85, 0.95, 1.5) : vec3(1.3, 1.05, 0.75);
        col += starCol * (starCore * 3.8 + starHalo) * u_starIntensity;
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
      float R_bound = u_diskOuter * 1.65; // ~22.8 Rs: outer interaction boundary

      float camDist = length(rayPos);

      // --- Space-Leaping for Distant Camera Views ---
      // In flat outer space (r > R_bound), gravity is negligible.
      // Light rays travel in straight Euclidean lines until they enter R_bound.
      if (camDist > R_bound) {
        float b = dot(rayPos, rayDir);
        float c = dot(rayPos, rayPos) - R_bound * R_bound;

        if (b > 0.0) {
          // Ray points away from the black hole system
          accumColor = sampleSpaceBackground(rayDir);
          accumAlpha = 1.0;
        } else {
          float disc = b * b - c;
          if (disc < 0.0) {
            // Ray misses the black hole and accretion disk interaction sphere entirely
            accumColor = sampleSpaceBackground(rayDir);
            accumAlpha = 1.0;
          } else {
            // Ray intersects interaction sphere: leap directly to entry point!
            float tNear = -b - sqrt(disc);
            if (tNear > 0.0) {
              rayPos += rayDir * max(0.0, tNear - 0.04);
            }
          }
        }
      }

      // Kerr spin parameter a/M = 0.998 (near-extremal Kerr metric)
      float spin = 0.92;
      vec3 spinAxis = vec3(0.0, 1.0, 0.0);
      float escapeRadius = R_bound * 1.08;

      if (accumAlpha < 1.0) {
        // Adaptive Schwarzschild/Kerr raymarching
        for (int i = 0; i < 180; i++) {
          if (i >= u_maxSteps) break;

          float r = length(rayPos);

          // 1. Event Horizon absorption (singularity absorbs all incident light)
          if (r <= Rs * 1.01) {
            accumAlpha = 1.0;
            break;
          }

          // 2. Escape check (reached outer space and moving outwards)
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

          // Standard Schwarzschild null geodesic acceleration
          vec3 accel = -1.5 * Rs * (L2 / (r * r * r)) * rHat * u_lensStrength;

          // Kerr frame-dragging acceleration (Lense-Thirring dragging of light rays)
          vec3 drag = (2.0 * spin * Rs / (r * r * r)) * cross(spinAxis, rayDir) * u_lensStrength;
          accel += drag * 0.35;

          // Adaptive step length:
          // Efficient steps in outer buffer (r > diskOuter), fine-grained steps inside accretion disk & photon sphere
          float dt;
          if (r > u_diskOuter) {
            dt = clamp((r - u_diskOuter) * 0.08 + 0.22, 0.22, 0.55);
          } else {
            dt = clamp(r * 0.042, 0.016, 0.32);
          }
          dt *= u_qualityScale;

          vec3 nextPos = rayPos + rayDir * dt;
          vec3 nextDir = normalize(rayDir + accel * dt);

          // 4. Exact Equatorial Plane Crossing (y = 0)
          if (rayPos.y * nextPos.y <= 0.0 && abs(rayPos.y - nextPos.y) > 1e-5) {
            float tCross = -rayPos.y / (nextPos.y - rayPos.y);
            vec3 pHit = mix(rayPos, nextPos, tCross);
            float rHit = length(pHit.xz);

            if (rHit >= u_diskInner && rHit <= u_diskOuter) {
              vec4 surfSample = evaluateAccretionPoint(pHit, rHit, rayDir);
              float stepAlpha = clamp(surfSample.a * 1.45, 0.0, 0.98);
              accumColor += (1.0 - accumAlpha) * surfSample.rgb * stepAlpha;
              accumAlpha += (1.0 - accumAlpha) * stepAlpha;

              if (accumAlpha > 0.985) break;
            }
          }

          // 5. Continuous Volumetric Integration through the disk's scale height
          // Distance-adaptive scale height avoids sub-pixel dropout at far camera distances
          float pixelFootprint = max(0.018, camDist * 0.0028);
          float effDiskHeight = max(u_diskThickness * (0.042 * r + 0.025), pixelFootprint);

          if (r >= u_diskInner && r <= u_diskOuter && abs(rayPos.y) < effDiskHeight * 3.5) {
            vec4 volSample = evaluateAccretionPoint(rayPos, r, rayDir);
            float dTau = volSample.a * 0.62 * dt;
            float volAlpha = 1.0 - exp(-dTau);
            accumColor += (1.0 - accumAlpha) * volSample.rgb * volAlpha;
            accumAlpha += (1.0 - accumAlpha) * volAlpha;

            if (accumAlpha > 0.985) break;
          }

          // Advance ray
          rayPos = nextPos;
          rayDir = nextDir;
        }
      }

      // Blend remaining background
      if (accumAlpha < 1.0) {
        vec3 sky = sampleSpaceBackground(rayDir);
        accumColor += (1.0 - accumAlpha) * sky;
      }

      // 6. Anamorphic Lens Flare (Christopher Nolan Panavision 70mm aesthetic)
      // Horizontal optical glare across intense brightness samples
      float flareUv = abs(vUv.y - 0.5);
      float horizStreak = exp(-flareUv * 65.0) * smoothstep(1.2, 3.5, length(accumColor));
      accumColor += vec3(1.2, 0.9, 0.5) * horizStreak * 0.22;

      // 7. Filmic Tone Mapping & High Dynamic Range
      // ACES style filmic curve
      vec3 x = accumColor * 0.95;
      vec3 a = vec3(2.51);
      vec3 b = vec3(0.03);
      vec3 c = vec3(2.43);
      vec3 d = vec3(0.59);
      vec3 e = vec3(0.14);
      vec3 mapped = clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);

      // Gamma correction
      mapped = pow(mapped, vec3(1.0 / 1.12));

      // Delicate filmic vignette
      vec2 vigUv = (vUv - 0.5) * 2.0;
      float vignette = 1.0 - dot(vigUv, vigUv) * 0.16;
      mapped *= clamp(vignette, 0.0, 1.0);

      gl_FragColor = vec4(mapped, 1.0);
    }
  `
};
