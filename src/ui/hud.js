/**
 * HUD & Interactive UI Controller (Responsive & Mobile-Optimized)
 * Binds UI inputs to black hole shader uniforms, 3D objects, Cornfield Chase audio player, and camera modes.
 */

export class HUD {
  constructor(app) {
    this.app = app;
    this.dom = {};
    this.initElements();
    this.bindEvents();
    this.initTouchGestures();
  }

  initElements() {
    this.dom = {
      // Audio
      audioBtn: document.getElementById('btn-audio'),
      audioBars: document.querySelectorAll('.audio-bar'),
      mobileAudioPill: document.getElementById('mobile-audio-pill'),
      sliderVolume: document.getElementById('slider-volume'),
      valVolume: document.getElementById('val-volume'),

      // Cinemascope
      cinemascopeBtn: document.getElementById('btn-cinemascope'),

      // Science Modal
      scienceBtn: document.getElementById('btn-science'),
      scienceModal: document.getElementById('science-modal'),
      modalCloseBtn: document.getElementById('btn-modal-close'),

      // Controls Drawer (Bottom Sheet on mobile)
      settingsBtn: document.getElementById('btn-settings'),
      controlsPanel: document.getElementById('controls-panel'),
      panelCloseBtn: document.getElementById('btn-panel-close'),
      drawerDragHandle: document.querySelector('.drawer-drag-handle'),

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
    const handleAudioToggle = () => {
      const playing = this.app.audio.toggle();
      this.updateAudioButtonState(playing);
    };

    if (this.dom.audioBtn) {
      this.dom.audioBtn.addEventListener('click', handleAudioToggle);
    }

    if (this.dom.mobileAudioPill) {
      this.dom.mobileAudioPill.addEventListener('click', (e) => {
        // Do not toggle if clicked on external youtube link
        if (e.target.closest('a')) return;
        handleAudioToggle();
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
    if (this.dom.cinemascopeBtn) {
      this.dom.cinemascopeBtn.addEventListener('click', () => {
        document.body.classList.toggle('cinemascope-active');
        const active = document.body.classList.contains('cinemascope-active');
        this.dom.cinemascopeBtn.classList.toggle('active', active);
      });
    }

    // 3. Settings Drawer / Mobile Bottom Sheet
    if (this.dom.settingsBtn) {
      this.dom.settingsBtn.addEventListener('click', () => {
        this.dom.controlsPanel.classList.toggle('collapsed');
        this.dom.settingsBtn.classList.toggle('active', !this.dom.controlsPanel.classList.contains('collapsed'));
      });
    }

    if (this.dom.panelCloseBtn) {
      this.dom.panelCloseBtn.addEventListener('click', () => {
        this.dom.controlsPanel.classList.add('collapsed');
        this.dom.settingsBtn.classList.remove('active');
      });
    }

    // 4. Science Modal
    if (this.dom.scienceBtn) {
      this.dom.scienceBtn.addEventListener('click', () => {
        this.dom.scienceModal.classList.add('active');
      });
    }

    if (this.dom.modalCloseBtn) {
      this.dom.modalCloseBtn.addEventListener('click', () => {
        this.dom.scienceModal.classList.remove('active');
      });
    }

    if (this.dom.scienceModal) {
      this.dom.scienceModal.addEventListener('click', (e) => {
        if (e.target === this.dom.scienceModal) {
          this.dom.scienceModal.classList.remove('active');
        }
      });
    }

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
    if (this.dom.toggleDoppler) {
      this.dom.toggleDoppler.addEventListener('change', (e) => {
        this.app.shaderMaterial.uniforms.u_dopplerEnabled.value = e.target.checked ? 1 : 0;
      });
    }

    if (this.dom.toggleRedshift) {
      this.dom.toggleRedshift.addEventListener('change', (e) => {
        this.app.shaderMaterial.uniforms.u_redshiftEnabled.value = e.target.checked ? 1 : 0;
      });
    }

    if (this.dom.toggleShip) {
      this.dom.toggleShip.addEventListener('change', (e) => {
        if (this.app.endurance) this.app.endurance.group.visible = e.target.checked;
      });
    }

    if (this.dom.togglePlanet) {
      this.dom.togglePlanet.addEventListener('change', (e) => {
        if (this.app.millersPlanet) {
          this.app.millersPlanet.group.visible = e.target.checked;
          if (this.app.millersPlanet.orbitLine) {
            this.app.millersPlanet.orbitLine.visible = e.target.checked;
          }
        }
      });
    }

    if (this.dom.toggleAsteroids) {
      this.dom.toggleAsteroids.addEventListener('change', (e) => {
        if (this.app.asteroidBelt) this.app.asteroidBelt.instancedMesh.visible = e.target.checked;
      });
    }

    if (this.dom.toggleStreams) {
      this.dom.toggleStreams.addEventListener('change', (e) => {
        if (this.app.geodesicStreams) this.app.geodesicStreams.setVisible(e.target.checked);
      });
    }

    if (this.dom.toggleTicks) {
      this.dom.toggleTicks.addEventListener('change', (e) => {
        if (this.app.audio) this.app.audio.timeTickEnabled = e.target.checked;
      });
    }

    // 9. Quality Mode
    if (this.dom.selectQuality) {
      this.dom.selectQuality.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'perf') {
          this.app.shaderMaterial.uniforms.u_maxSteps.value = 80;
          this.app.shaderMaterial.uniforms.u_qualityScale.value = 1.4;
          this.app.setResolutionScale(0.75);
        } else if (val === 'balanced') {
          this.app.shaderMaterial.uniforms.u_maxSteps.value = this.app.isMobile ? 85 : 140;
          this.app.shaderMaterial.uniforms.u_qualityScale.value = this.app.isMobile ? 1.35 : 1.0;
          this.app.setResolutionScale(this.app.isMobile ? 0.9 : 1.0);
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

  initTouchGestures() {
    let touchStartY = 0;
    if (this.dom.controlsPanel) {
      this.dom.controlsPanel.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
      }, { passive: true });

      this.dom.controlsPanel.addEventListener('touchmove', (e) => {
        const touchCurrentY = e.touches[0].clientY;
        const diff = touchCurrentY - touchStartY;
        if (diff > 70 && this.dom.controlsPanel.scrollTop <= 10) {
          this.dom.controlsPanel.classList.add('collapsed');
          if (this.dom.settingsBtn) this.dom.settingsBtn.classList.remove('active');
        }
      }, { passive: true });
    }

    if (this.dom.drawerDragHandle) {
      this.dom.drawerDragHandle.addEventListener('click', () => {
        this.dom.controlsPanel.classList.add('collapsed');
        if (this.dom.settingsBtn) this.dom.settingsBtn.classList.remove('active');
      });
    }
  }

  updateAudioButtonState(playing) {
    if (playing) {
      if (this.dom.audioBtn) this.dom.audioBtn.classList.add('active');
      if (this.dom.mobileAudioPill) this.dom.mobileAudioPill.classList.add('playing');
    } else {
      if (this.dom.audioBtn) this.dom.audioBtn.classList.remove('active');
      if (this.dom.mobileAudioPill) this.dom.mobileAudioPill.classList.remove('playing');
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

    if (this.dom.distVal) {
      this.dom.distVal.textContent = `${distInRs} Rs (${au} AU)`;
    }

    if (dist > Rs * 1.02) {
      const dilationFactor = 1.0 / Math.sqrt(1.0 - Rs / dist);
      if (this.dom.dilationVal) {
        if (dilationFactor > 20.0) {
          this.dom.dilationVal.textContent = `CRITICAL (${dilationFactor.toFixed(1)}x)`;
          this.dom.dilationVal.classList.add('danger');
        } else {
          this.dom.dilationVal.textContent = `${dilationFactor.toFixed(3)}x`;
          this.dom.dilationVal.classList.remove('danger');
        }
      }

      if (this.dom.statusPill) {
        if (Math.abs(dist - 16.5) < 3.0) {
          this.dom.statusPill.innerHTML = `MILLER'S ORBIT: <span>1 HR = 7 YEARS</span>`;
        } else if (dist < 3.2) {
          this.dom.statusPill.innerHTML = `EXTREME GRAVITY: <span>PHOTON SPHERE DIVE</span>`;
        } else {
          this.dom.statusPill.innerHTML = `TIME DILATION: <span>${dilationFactor.toFixed(2)}x EARTH</span>`;
        }
      }
    } else {
      if (this.dom.dilationVal) {
        this.dom.dilationVal.textContent = 'EVENT HORIZON';
        this.dom.dilationVal.classList.add('danger');
      }
      if (this.dom.statusPill) {
        this.dom.statusPill.innerHTML = `WARNING: <span>PAST HORIZON BOUNDARY</span>`;
      }
    }
  }
}
