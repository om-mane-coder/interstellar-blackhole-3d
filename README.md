# GARGANTUA: Movie-Accurate 3D Interstellar Black Hole & Deep Space Simulation

An interactive, movie-accurate 3D WebGL simulation of the supermassive black hole **Gargantua** and its surrounding outer space environment from Christopher Nolan's *Interstellar*.

Built with **Three.js**, **GLSL Kerr-Schwarzschild Relativistic Raymarching Shaders**, and Hans Zimmer's **Original Interstellar Soundtrack** integrated via the **Web Audio API**.

🌐 **Live Website**: [https://interstellar-blackhole-3d.vercel.app/](https://interstellar-blackhole-3d.vercel.app/)  
📦 **GitHub Repository**: [https://github.com/om-mane-coder/interstellar-blackhole-3d](https://github.com/om-mane-coder/interstellar-blackhole-3d)

---

## 🌟 Movie Precision Upgrades

### 1. Movie-Accurate Gravitational Lensing & Accretion Silhouette
- **Kerr Metric with Frame-Dragging**: Implements null geodesic raymarching with Lense-Thirring frame-dragging acceleration term ($a/M \approx 0.998$).
- **The Iconic Interstellar "Double-Ring / Hat" Lensing**: Hybrid continuous volumetric integration through the vertical scale height combined with razor-sharp plane intersections. Light from the rear of the equatorial disk is curved over the top of the event horizon (top halo arch) and under the bottom (lower arch).
- **Christopher Nolan Calibrated Doppler Boosting**: Matter orbiting at up to 65% of the speed of light causes asymmetric brightness amplification and blueshift on the approaching (left) side, while keeping the receding (right) side luminous in warm amber and smoked bronze.
- **Anamorphic Lens Flare & Bloom**: Recreates the Panavision 70mm IMAX horizontal optical streak across the ultra-hot incandescent core.
- **Concentric Density Striations**: Differential Keplerian shear ($\omega \sim r^{-1.5}$) creates fine orbital density rings and plasma ripples.

### 2. Original Hans Zimmer Soundtrack Player
- **Master Audio Recordings**:
  1. *Main Theme (Day One / First Step)* — The iconic cathedral organ and piano theme.
  2. *Cornfield Chase* — Fast, soaring, poignant orchestral arrangement.
  3. *No Time For Caution* — The legendary docking scene track.
- **Header Player Bar**: Previous track `[⏮]`, Next track `[⏭]`, and Play/Pause `[▶/⏸]` buttons with a real-time audio FFT visualizer that dances directly to Hans Zimmer's original score.
- **Relativistic 1.25s Ticking**: Synchronized acoustic pulse where each tick marks 1 day passing on Earth (as on Miller's planet).

### 3. The Outer Space Region
- **The *Endurance* Spacecraft**: A 3D model of the 12-pod ring ship from *Interstellar* rotating at $5.6\text{ RPM}$ for artificial gravity, with blue ion thruster trails and dedicated chase camera.
- **Miller's Planet (Water World)**: Ocean sphere with atmospheric Rayleigh scattering and live time dilation calculation ($1\text{ hour} = 7\text{ Earth years}$).
- **Asteroid & Debris Belt**: 1,800 instanced rocks orbiting between $14 R_s$ and $32 R_s$.
- **Spacetime Curvature Streams**: 2,500 particles spiraling along curved geodesics into Gargantua.

---

## 🚀 Running the Project

The development server is active at:
```
http://localhost:5173/
```

To run manually:
```bash
# Start development server
npm run dev

# Build production bundle
npm run build

# Preview production build
npm run preview
```
