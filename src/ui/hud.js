/**
 * HUD & Interactive UI Controller
 * Binds UI inputs to black hole shader uniforms, 3D objects, original soundtrack player, and camera modes.
 */

export class HUD {
  constructor(app) {
    this.app = app;
    this.dom = {};
    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.dom = {
      // Audio
      audioBtn: document.getElementById('btn-audio'),
      audioBars: document.querySelectorAll('.audio-bar'),
      trackTitle: document.getElementById('audio-track-title'),
      prevTrackBtn: document.getElementById('btn-track-prev'),
      nextTrackBtn: document.getElementById('btn-track-next'),
      trackSelect: document.getElementById('select-soundtrack'),
      sliderVolume: document.getElementById('slider-volume'),
      valVolume: document.getElementById('val-volume'),

      // Cinemascope
      cinemascopeBtn: document.getElementById('btn-cinemascope'),

      // Science Modal
      scienceBtn: document.getElementById('btn-science'),
      scienceModal: document.getElementById('science-modal'),
      modalCloseBtn: document.getElementById('btn-modal-close'),

      // Controls Drawer
      settingsBtn: document.getElementById('btn-settings'),
      controlsPanel: document.getElementById('controls-panel'),
      panelCloseBtn: document.getElementById('btn-panel-close'),

      // Telemetry
      distVal: document.getElementById('telemetry-distance'),
      dilationVal: document.getElementById('telemetry-dilation'),
      massVal: document.getElementById('telemetry-mass'),
      statusPill: document.getElementById('time-dilation-text'),

      // Camera buttons
      camBtns: document.querySelectorAll('.cam-btn'),

      // Palette buttons
      paletteBtns: document.querySelectorAll('.palette-btn'),

      // Sliders
      sliderBrightness: document.getElementById('slider-brightness'),
      valBrightness: document.getElementById('val-brightness'),

      sliderSpeed: document.getElementById('slider-speed'),
      valSpeed: document.getElementById('val-speed'),

      sliderDensity: document.getElementById('slider-density'),
      valDensity: document.getElementById('val-density'),

      sliderThickness: document.getElementById('slider-thickness'),
      valThickness: document.getElementById('val-thickness'),

      sliderLensing: document.getElementById('slider-lensing'),
      valLensing: document.getElementById('val-lensing'),

      sliderStars: document.getElementById('slider-stars'),
      valStars: document.getElementById('val-stars'),

      sliderNebula: document.getElementById('slider-nebula'),
      valNebula: document.getElementById('val-nebula'),

      sliderBloom: document.getElementById('slider-bloom'),
      valBloom: document.getElementById('val-bloom'),

      // Toggles
      toggleDoppler: document.getElementById('toggle-doppler'),
      toggleRedshift: document.getElementById('toggle-redshift'),
      toggleShip: document.getElementById('toggle-ship'),
      togglePlanet: document.getElementById('toggle-planet'),
      toggleAsteroids: document.getElementById('toggle-asteroids'),
      toggleStreams: document.getElementById('toggle-streams'),
      toggleTicks: document.getElementById('toggle-ticks'),

      // Quality selector
      selectQuality: document.getElementById('select-quality'),
    };
  }

  bindEvents() {
    // 1. Audio Play / Pause
    this.dom.audioBtn.addEventListener('click', () => {
      const playing = this.app.audio.toggle();
      this.updateAudioButtonState(playing);
    });

    // Track Navigation
    if (this.dom.prevTrackBtn) {
      this.dom.prevTrackBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const trk = this.app.audio.prevTrack();
        this.updateTrackDisplay(trk);
        if (this.dom.trackSelect) {
          this.dom.trackSelect.value = this.app.audio.currentTrackIndex;
        }
      });
    }

    if (this.dom.nextTrackBtn) {
      this.dom.nextTrackBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const trk = this.app.audio.nextTrack();
        this.updateTrackDisplay(trk);
        if (this.dom.trackSelect) {
          this.dom.trackSelect.value = this.app.audio.currentTrackIndex;
        }
      });
    }

    if (this.dom.trackSelect) {
      this.dom.trackSelect.addEventListener('change', (e) => {
        const idx = parseInt(e.target.value, 10);
        this.app.audio.setTrack(idx);
        this.updateTrackDisplay(this.app.audio.getCurrentTrack());
      });
    }

    if (this.dom.sliderVolume) {
      this.dom.sliderVolume.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.app.audio.setVolume(val);
        if (this.dom.valVolume) {
          this.dom.valVolume.textContent = `${Math.round(val * 100)}%`;
        }
      });
    }

    // 2. Cinemascope Mode
    this.dom.cinemascopeBtn.addEventListener('click', () => {
      document.body.classList.toggle('cinemascope-active');
      const active = document.body.classList.contains('cinemascope-active');
      this.dom.cinemascopeBtn.classList.toggle('active', active);
    });

    // 3. Settings Drawer
    this.dom.settingsBtn.addEventListener('click', () => {
      this.dom.controlsPanel.classList.toggle('collapsed');
      this.dom.settingsBtn.classList.toggle('active', !this.dom.controlsPanel.classList.contains('collapsed'));
    });

    this.dom.panelCloseBtn.addEventListener('click', () => {
      this.dom.controlsPanel.classList.add('collapsed');
      this.dom.settingsBtn.classList.remove('active');
    });

    // 4. Science Modal
    this.dom.scienceBtn.addEventListener('click', () => {
      this.dom.scienceModal.classList.add('active');
    });

    this.dom.modalCloseBtn.addEventListener('click', () => {
      this.dom.scienceModal.classList.remove('active');
    });

    this.dom.scienceModal.addEventListener('click', (e) => {
      if (e.target === this.dom.scienceModal) {
        this.dom.scienceModal.classList.remove('active');
      }
    });

    // 5. Camera Presets
    this.dom.camBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.dom.camBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.cam;
        this.app.setCameraMode(mode);
      });
    });

    // 6. Color Schemes
    this.dom.paletteBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.dom.paletteBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const scheme = parseInt(btn.dataset.scheme, 10);
        this.app.setColorScheme(scheme);
      });
    });

    // 7. Sliders
    this.bindSlider(this.dom.sliderBrightness, this.dom.valBrightness, val => {
      this.app.shaderMaterial.uniforms.u_diskBrightness.value = parseFloat(val);
      return `${parseFloat(val).toFixed(1)}x`;
    });

    this.bindSlider(this.dom.sliderSpeed, this.dom.valSpeed, val => {
      this.app.shaderMaterial.uniforms.u_spinSpeed.value = parseFloat(val);
      return `${parseFloat(val).toFixed(2)}x`;
    });

    this.bindSlider(this.dom.sliderDensity, this.dom.valDensity, val => {
      this.app.shaderMaterial.uniforms.u_diskDensity.value = parseFloat(val);
      return `${parseFloat(val).toFixed(2)}`;
    });

    this.bindSlider(this.dom.sliderThickness, this.dom.valThickness, val => {
      this.app.shaderMaterial.uniforms.u_diskThickness.value = parseFloat(val);
      return `${parseFloat(val).toFixed(3)}`;
    });

    this.bindSlider(this.dom.sliderLensing, this.dom.valLensing, val => {
      this.app.shaderMaterial.uniforms.u_lensStrength.value = parseFloat(val);
      return `${parseFloat(val).toFixed(2)}x`;
    });

    this.bindSlider(this.dom.sliderStars, this.dom.valStars, val => {
      this.app.shaderMaterial.uniforms.u_starIntensity.value = parseFloat(val);
      return `${parseFloat(val).toFixed(1)}x`;
    });

    this.bindSlider(this.dom.sliderNebula, this.dom.valNebula, val => {
      this.app.shaderMaterial.uniforms.u_nebulaIntensity.value = parseFloat(val);
      return `${parseFloat(val).toFixed(1)}x`;
    });

    this.bindSlider(this.dom.sliderBloom, this.dom.valBloom, val => {
      if (this.app.bloomPass) {
        this.app.bloomPass.strength = parseFloat(val);
      }
      return `${parseFloat(val).toFixed(1)}`;
    });

    // 8. Toggles
    this.dom.toggleDoppler.addEventListener('change', (e) => {
      this.app.shaderMaterial.uniforms.u_dopplerEnabled.value = e.target.checked ? 1 : 0;
    });

    this.dom.toggleRedshift.addEventListener('change', (e) => {
      this.app.shaderMaterial.uniforms.u_redshiftEnabled.value = e.target.checked ? 1 : 0;
    });

    this.dom.toggleShip.addEventListener('change', (e) => {
      if (this.app.endurance) this.app.endurance.group.visible = e.target.checked;
    });

    this.dom.togglePlanet.addEventListener('change', (e) => {
      if (this.app.millersPlanet) {
        this.app.millersPlanet.group.visible = e.target.checked;
        if (this.app.millersPlanet.orbitLine) {
          this.app.millersPlanet.orbitLine.visible = e.target.checked;
        }
      }
    });

    this.dom.toggleAsteroids.addEventListener('change', (e) => {
      if (this.app.asteroidBelt) this.app.asteroidBelt.instancedMesh.visible = e.target.checked;
    });

    this.dom.toggleStreams.addEventListener('change', (e) => {
      if (this.app.geodesicStreams) this.app.geodesicStreams.setVisible(e.target.checked);
    });

    this.dom.toggleTicks.addEventListener('change', (e) => {
      if (this.app.audio) this.app.audio.timeTickEnabled = e.target.checked;
    });

    // 9. Quality Mode
    if (this.dom.selectQuality) {
      this.dom.selectQuality.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'perf') {
          this.app.shaderMaterial.uniforms.u_maxSteps.value = 90;
          this.app.shaderMaterial.uniforms.u_qualityScale.value = 1.35;
          this.app.setResolutionScale(0.75);
        } else if (val === 'balanced') {
          this.app.shaderMaterial.uniforms.u_maxSteps.value = 140;
          this.app.shaderMaterial.uniforms.u_qualityScale.value = 1.0;
          this.app.setResolutionScale(1.0);
        } else if (val === 'ultra') {
          this.app.shaderMaterial.uniforms.u_maxSteps.value = 180;
          this.app.shaderMaterial.uniforms.u_qualityScale.value = 0.72;
          this.app.setResolutionScale(1.0);
        } else if (val === 'imax') {
          this.app.shaderMaterial.uniforms.u_maxSteps.value = 220;
          this.app.shaderMaterial.uniforms.u_qualityScale.value = 0.58;
          this.app.setResolutionScale(1.25);
        }
      });
    }
  }

  updateAudioButtonState(playing) {
    if (playing) {
      this.dom.audioBtn.classList.add('active');
      const label = this.dom.audioBtn.querySelector('.btn-label');
      if (label) label.textContent = 'OST: PLAYING';
    } else {
      this.dom.audioBtn.classList.remove('active');
      const label = this.dom.audioBtn.querySelector('.btn-label');
      if (label) label.textContent = 'OST: PAUSED';
    }
  }

  updateTrackDisplay(track) {
    if (this.dom.trackTitle && track) {
      this.dom.trackTitle.textContent = `${track.artist} - ${track.title}`;
    }
  }

  bindSlider(slider, display, onChange) {
    if (!slider || !display) return;
    slider.addEventListener('input', (e) => {
      const text = onChange(e.target.value);
      display.textContent = text;
    });
  }

  update(camera, delta) {
    // 1. Audio Visualizer Bars
    if (this.app.audio && this.app.audio.isPlaying) {
      const data = this.app.audio.getVisualizerData();
      if (data && data.length > 0) {
        this.dom.audioBars.forEach((bar, idx) => {
          const val = data[idx * 3] || 15;
          const h = Math.max(3, (val / 255) * 16);
          bar.style.height = `${h}px`;
        });
      }
    } else {
      this.dom.audioBars.forEach(bar => {
        bar.style.height = '3px';
      });
    }

    // 2. Real-Time Gravitational Telemetry
    const dist = camera.position.length();
    const Rs = 1.0;
    const distInRs = (dist / Rs).toFixed(2);
    const au = (dist * 0.12).toFixed(2);

    this.dom.distVal.textContent = `${distInRs} Rs (${au} AU)`;

    // Calculate General Relativistic Time Dilation
    if (dist > Rs * 1.02) {
      const dilationFactor = 1.0 / Math.sqrt(1.0 - Rs / dist);
      if (dilationFactor > 20.0) {
        this.dom.dilationVal.textContent = `CRITICAL (${dilationFactor.toFixed(1)}x)`;
        this.dom.dilationVal.classList.add('danger');
      } else {
        this.dom.dilationVal.textContent = `${dilationFactor.toFixed(3)}x`;
        this.dom.dilationVal.classList.remove('danger');
      }

      if (Math.abs(dist - 16.5) < 3.0) {
        this.dom.statusPill.innerHTML = `MILLER'S ORBIT: <span>1 HR = 7 YEARS</span>`;
      } else if (dist < 3.2) {
        this.dom.statusPill.innerHTML = `EXTREME GRAVITY: <span>PHOTON SPHERE DIVE</span>`;
      } else {
        this.dom.statusPill.innerHTML = `TIME DILATION: <span>${dilationFactor.toFixed(2)}x EARTH SPEED</span>`;
      }
    } else {
      this.dom.dilationVal.textContent = 'EVENT HORIZON (SINGULARITY)';
      this.dom.dilationVal.classList.add('danger');
      this.dom.statusPill.innerHTML = `WARNING: <span>PAST HORIZON BOUNDARY</span>`;
    }
  }
}
