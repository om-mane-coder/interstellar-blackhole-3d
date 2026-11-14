/**
 * Interstellar Original Soundtrack Player & Web Audio Engine
 * Plays the original Hans Zimmer soundtrack recordings ("Main Theme / First Step",
 * "Cornfield Chase", "No Time For Caution") with live Web Audio API frequency analysis
 * and synchronized 1.25s Miller's Planet acoustic time-dilation ticking.
 */

export class SpaceAudio {
  constructor() {
    this.ctx = null;
    this.audioElement = null;
    this.mediaSource = null;
    this.analyser = null;
    this.gainNode = null;
    this.isPlaying = false;
    this.volume = 0.75;
    this.timeTickEnabled = true;
    this.tickInterval = null;

    this.tracks = [
      {
        id: 'main-theme',
        title: 'Main Theme (Day One / First Step)',
        artist: 'Hans Zimmer',
        src: './audio/interstellar-main-theme.mp3'
      },
      {
        id: 'cornfield-chase',
        title: 'Cornfield Chase',
        artist: 'Hans Zimmer',
        src: './audio/cornfield-chase.mp3'
      },
      {
        id: 'no-time-for-caution',
        title: 'No Time For Caution (Docking Scene)',
        artist: 'Hans Zimmer',
        src: './audio/no-time-for-caution.mp3'
      }
    ];

    this.currentTrackIndex = 0;
  }

  init() {
    if (this.ctx) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    // Create HTML5 Audio Element for original soundtrack playback
    this.audioElement = new Audio();
    this.audioElement.src = this.tracks[this.currentTrackIndex].src;
    this.audioElement.loop = true;
    this.audioElement.preload = 'auto';
    this.audioElement.crossOrigin = 'anonymous';

    // Hook HTML5 Audio into Web Audio API graph for real-time FFT visualizer
    try {
      this.mediaSource = this.ctx.createMediaElementSource(this.audioElement);
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.8;

      this.mediaSource.connect(this.gainNode);
      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    } catch (e) {
      console.warn('Web Audio routing fallback:', e);
    }
  }

  start() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (this.audioElement) {
      this.audioElement.play().then(() => {
        this.isPlaying = true;
      }).catch(err => {
        console.warn('Playback error:', err);
      });
    }

    this.startTimeTick();
  }

  stop() {
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.isPlaying = false;

    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  toggle() {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.start();
    }
    return this.isPlaying;
  }

  setTrack(index) {
    if (index < 0 || index >= this.tracks.length) return;
    this.currentTrackIndex = index;

    if (this.audioElement) {
      const wasPlaying = this.isPlaying;
      this.audioElement.src = this.tracks[this.currentTrackIndex].src;
      this.audioElement.load();
      if (wasPlaying) {
        this.audioElement.play().catch(e => console.warn(e));
      }
    }
  }

  nextTrack() {
    const nextIdx = (this.currentTrackIndex + 1) % this.tracks.length;
    this.setTrack(nextIdx);
    return this.getCurrentTrack();
  }

  prevTrack() {
    const prevIdx = (this.currentTrackIndex - 1 + this.tracks.length) % this.tracks.length;
    this.setTrack(prevIdx);
    return this.getCurrentTrack();
  }

  getCurrentTrack() {
    return this.tracks[this.currentTrackIndex];
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
    if (this.audioElement) {
      this.audioElement.volume = this.volume;
    }
  }

  // Interstellar Relativistic Time Dilation Tick (1.25s pulse = 1 Earth day on Miller's planet)
  startTimeTick() {
    if (this.tickInterval) return;

    const playTick = () => {
      if (!this.isPlaying || !this.timeTickEnabled || !this.ctx) return;
      const now = this.ctx.currentTime;

      // Resonant woodblock / clock click
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.045);

      const tickGain = this.ctx.createGain();
      tickGain.gain.setValueAtTime(0.25 * this.volume, now);
      tickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc.connect(tickGain);
      tickGain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    };

    this.tickInterval = setInterval(playTick, 1250);
  }

  getVisualizerData() {
    if (!this.analyser) return new Uint8Array(32);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }
}
