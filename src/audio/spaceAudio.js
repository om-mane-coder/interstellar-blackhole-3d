/**
 * Interstellar Official Soundtrack Engine - "Cornfield Chase" by Hans Zimmer
 * Dedicated background soundtrack audio player with Web Audio API real-time FFT frequency
 * analysis. Plays exclusively the official master recording of Cornfield Chase.
 * Official Video: https://youtu.be/JuSsvM8B4Jc
 */

export class SpaceAudio {
  constructor() {
    this.ctx = null;
    this.audioElement = null;
    this.mediaSource = null;
    this.analyser = null;
    this.gainNode = null;
    this.isPlaying = false;
    this.volume = 0.8;

    this.track = {
      title: 'Cornfield Chase',
      artist: 'Hans Zimmer',
      label: 'WaterTower Music // Official Interstellar Soundtrack',
      youtubeUrl: 'https://youtu.be/JuSsvM8B4Jc',
      src: './audio/cornfield-chase.mp3'
    };
  }

  init() {
    if (this.ctx) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    // Create HTML5 Audio Element for Cornfield Chase background playback
    this.audioElement = new Audio();
    this.audioElement.src = this.track.src;
    this.audioElement.loop = true;
    this.audioElement.preload = 'auto';
    this.audioElement.crossOrigin = 'anonymous';

    // Hook HTML5 Audio into Web Audio API graph for real-time FFT frequency visualizer
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
        console.warn('Playback error (interaction required):', err);
      });
    }
  }

  stop() {
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.isPlaying = false;
  }

  toggle() {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.start();
    }
    return this.isPlaying;
  }

  getCurrentTrack() {
    return this.track;
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

  getVisualizerData() {
    if (!this.analyser) return new Uint8Array(32);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }
}
