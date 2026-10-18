/**
 * ============================================================================
 * eFootball TikTok LIVE Stream Overlay Engine
 * ============================================================================
 * Centralized configuration & GPU-optimized rendering runtime.
 * Works natively in OBS Browser Source, TikTok LIVE Studio, and modern browsers.
 */

(function () {
  'use strict';

  // Default Centralized Configuration
  const DEFAULT_CONFIG = {
    primaryColor: '#0052ff',       // Konami / eFootball Electric Royal Blue
    primaryGlow: '#00d4ff',        // Stadium Neon Cyan
    accentColor: '#ffe600',         // Dynamic Volt Yellow
    accentGlow: '#fff275',         // Soft Yellow Glow
    lightIntensity: 1.0,           // 0.0 to 1.5
    animationSpeed: 1.0,           // 0.2 to 2.0
    gameplayWidth: 1040,           // 16:9 width (max 1080)
    gameplayHeight: 585,           // 16:9 height (1040 / 1.777)
    gameplayYOffset: 0,            // Y offset in px from default center
    enableStadiumLights: true,     // Volumetric searchlights & beams
    enableDiagonalSlashes: true,   // Top-right energetic volt slash graphics
    enableAtmosphericDust: true,   // Floating arena dust particles
    enableCrowdLeds: true,         // Cheering spectators LED light sparkles
    enableBorderGlow: true,        // Frame breathing neon glow
    simulateGameplayPitch: false,  // For alignment calibration only
  };

  // Active runtime state
  let currentConfig = { ...DEFAULT_CONFIG };
  let particleCanvas = null;
  let particleCtx = null;
  let animationFrameId = null;
  let particles = [];

  /**
   * Parse configuration overrides from URL query parameters.
   * e.g. ?primary=%230052ff&accent=%23ffe600&light=1.2&speed=1.0&beams=1
   */
  function loadConfigFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      
      if (params.has('primary')) currentConfig.primaryColor = params.get('primary');
      if (params.has('glow')) currentConfig.primaryGlow = params.get('glow');
      if (params.has('accent')) currentConfig.accentColor = params.get('accent');
      if (params.has('light')) currentConfig.lightIntensity = parseFloat(params.get('light')) || 1.0;
      if (params.has('speed')) currentConfig.animationSpeed = parseFloat(params.get('speed')) || 1.0;
      if (params.has('gw')) currentConfig.gameplayWidth = parseInt(params.get('gw'), 10) || 1040;
      if (params.has('gh')) currentConfig.gameplayHeight = parseInt(params.get('gh'), 10) || 585;
      if (params.has('gy')) currentConfig.gameplayYOffset = parseInt(params.get('gy'), 10) || 0;
      if (params.has('beams')) currentConfig.enableStadiumLights = params.get('beams') === '1' || params.get('beams') === 'true';
      if (params.has('slashes')) currentConfig.enableDiagonalSlashes = params.get('slashes') === '1' || params.get('slashes') === 'true';
      if (params.has('particles')) currentConfig.enableAtmosphericDust = params.get('particles') === '1' || params.get('particles') === 'true';
      if (params.has('crowd')) currentConfig.enableCrowdLeds = params.get('crowd') === '1' || params.get('crowd') === 'true';
      if (params.has('border')) currentConfig.enableBorderGlow = params.get('border') === '1' || params.get('border') === 'true';
      if (params.has('simulator')) currentConfig.simulateGameplayPitch = params.get('simulator') === '1' || params.get('simulator') === 'true';
    } catch (e) {
      console.warn('eFootball Overlay: Error reading URL parameters', e);
    }
  }

  /**
   * Apply CSS variables and DOM states according to active configuration.
   */
  function applyConfig() {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', currentConfig.primaryColor);
    root.style.setProperty('--primary-glow', currentConfig.primaryGlow);
    root.style.setProperty('--accent-color', currentConfig.accentColor);
    root.style.setProperty('--accent-glow', currentConfig.accentGlow);
    root.style.setProperty('--light-intensity', currentConfig.lightIntensity);
    root.style.setProperty('--anim-speed', currentConfig.animationSpeed);
    root.style.setProperty('--gameplay-width', currentConfig.gameplayWidth + 'px');
    root.style.setProperty('--gameplay-height', currentConfig.gameplayHeight + 'px');
    root.style.setProperty('--gameplay-y-offset', currentConfig.gameplayYOffset + 'px');

    root.style.setProperty('--toggle-beams', currentConfig.enableStadiumLights ? '1' : '0');
    root.style.setProperty('--toggle-slashes', currentConfig.enableDiagonalSlashes ? '1' : '0');
    root.style.setProperty('--toggle-particles', currentConfig.enableAtmosphericDust ? '1' : '0');
    root.style.setProperty('--toggle-crowd-lights', currentConfig.enableCrowdLeds ? '1' : '0');
    root.style.setProperty('--toggle-border-glow', currentConfig.enableBorderGlow ? '1' : '0');

    // Simulator Layer Toggle
    const simLayer = document.getElementById('gameplaySimulatorLayer');
    if (simLayer) {
      if (currentConfig.simulateGameplayPitch) {
        simLayer.classList.add('active');
      } else {
        simLayer.classList.remove('active');
      }
    }
  }

  /**
   * Lightweight Atmospheric Stadium Dust Particle System.
   * Runs on a dedicated canvas, optimized for minimal CPU/GPU overhead.
   */
  function initParticleSystem() {
    particleCanvas = document.getElementById('particlesCanvas');
    if (!particleCanvas) return;

    particleCtx = particleCanvas.getContext('2d', { alpha: true });
    particleCanvas.width = 1080;
    particleCanvas.height = 645;

    particles = [];
    const count = 35; // optimal low count for smooth 60fps streaming

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * particleCanvas.width,
        y: Math.random() * particleCanvas.height,
        radius: Math.random() * 2.2 + 0.8,
        speedY: (Math.random() * 0.45 + 0.15) * -1,
        speedX: (Math.random() - 0.5) * 0.35,
        alpha: Math.random() * 0.6 + 0.2,
        pulseSpeed: Math.random() * 0.02 + 0.01,
        color: Math.random() > 0.35 ? '#00e5ff' : '#ffe600',
      });
    }

    renderParticles();
  }

  function renderParticles() {
    if (!particleCtx || !particleCanvas) return;

    if (!currentConfig.enableAtmosphericDust || currentConfig.lightIntensity <= 0.05) {
      particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
      animationFrameId = requestAnimationFrame(renderParticles);
      return;
    }

    particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);

    const speedMul = currentConfig.animationSpeed || 1.0;
    const globalAlpha = currentConfig.lightIntensity || 1.0;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.y += p.speedY * speedMul;
      p.x += p.speedX * speedMul;
      p.alpha += Math.sin(Date.now() * p.pulseSpeed * 0.002) * 0.01;

      // Wrap around
      if (p.y < 0) {
        p.y = particleCanvas.height;
        p.x = Math.random() * particleCanvas.width;
      }
      if (p.x < 0) p.x = particleCanvas.width;
      if (p.x > particleCanvas.width) p.x = 0;

      const alphaClamped = Math.max(0.1, Math.min(0.85, p.alpha * globalAlpha));

      particleCtx.beginPath();
      particleCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      particleCtx.fillStyle = p.color === '#ffe600'
        ? `rgba(255, 230, 0, ${alphaClamped})`
        : `rgba(0, 229, 255, ${alphaClamped})`;
      particleCtx.shadowBlur = 6;
      particleCtx.shadowColor = p.color;
      particleCtx.fill();
    }

    animationFrameId = requestAnimationFrame(renderParticles);
  }

  /**
   * Goal Celebration Strobe FX (Triggered by 'G' key or API)
   * Plays a 3.2s dynamic stadium floodlight surge and gold/blue celebration wave.
   */
  function triggerGoalCelebration() {
    const canvas = document.getElementById('overlayCanvas');
    const goldBurst = document.getElementById('goldBurstLayer');
    if (!canvas) return;

    canvas.classList.remove('goal-celebration-active');
    void canvas.offsetWidth; // Force reflow
    canvas.classList.add('goal-celebration-active');

    if (goldBurst) {
      goldBurst.classList.remove('active');
      void goldBurst.offsetWidth;
      goldBurst.classList.add('active');
    }

    setTimeout(function () {
      if (canvas) canvas.classList.remove('goal-celebration-active');
      if (goldBurst) goldBurst.classList.remove('active');
    }, 3200);
  }

  /**
   * Instant Floodlight Strobe Flash (Triggered by 'F' key or API)
   */
  function triggerStrobeFlash() {
    const canvas = document.getElementById('overlayCanvas');
    if (!canvas) return;

    canvas.classList.remove('stadium-strobe');
    void canvas.offsetWidth; // Force reflow
    canvas.classList.add('stadium-strobe');

    setTimeout(function () {
      if (canvas) canvas.classList.remove('stadium-strobe');
    }, 450);
  }

  /**
   * Global Public Controller for streamer integration & embedded parent iframe.
   */
  window.eFootballOverlay = {
    getConfig: function () {
      return { ...currentConfig };
    },
    updateConfig: function (newProps) {
      Object.assign(currentConfig, newProps);
      applyConfig();
    },
    resetConfig: function () {
      currentConfig = { ...DEFAULT_CONFIG };
      applyConfig();
    },
    toggleSimulator: function (forceState) {
      if (typeof forceState === 'boolean') {
        currentConfig.simulateGameplayPitch = forceState;
      } else {
        currentConfig.simulateGameplayPitch = !currentConfig.simulateGameplayPitch;
      }
      applyConfig();
      return currentConfig.simulateGameplayPitch;
    },
    toggleLights: function () {
      currentConfig.enableStadiumLights = !currentConfig.enableStadiumLights;
      applyConfig();
      return currentConfig.enableStadiumLights;
    },
    adjustIntensity: function (delta) {
      currentConfig.lightIntensity = Math.max(0.1, Math.min(1.5, Math.round((currentConfig.lightIntensity + delta) * 10) / 10));
      applyConfig();
      return currentConfig.lightIntensity;
    },
    goalCelebration: triggerGoalCelebration,
    strobeFlash: triggerStrobeFlash,
    setPreset: function (index) {
      const presets = [
        { primaryColor: '#0052ff', primaryGlow: '#00d4ff', accentColor: '#ffe600' },
        { primaryColor: '#0038d1', primaryGlow: '#00f0ff', accentColor: '#ffff11' },
        { primaryColor: '#0070f3', primaryGlow: '#38bdf8', accentColor: '#ffd200' },
        { primaryColor: '#0d2268', primaryGlow: '#00d4ff', accentColor: '#ffea2e' },
      ];
      if (presets[index - 1]) {
        Object.assign(currentConfig, presets[index - 1]);
        applyConfig();
      }
    },
  };

  /**
   * Keyboard Hotkey Listeners for Live Streamers:
   * [L] - Toggle stadium light beams on/off
   * [G] - Goal celebration strobe & floodlight burst
   * [F] - Instant stadium floodlight flash
   * [[] - Dim light intensity (-10%)
   * []] - Brighten light intensity (+10%)
   * [B] - Toggle breathing neon border glow
   * [S] - Toggle diagonal volt yellow slashes
   * [P] - Toggle pitch alignment test guide
   * [1-4] - Quick switch color presets
   */
  function initKeyboardHotkeys() {
    window.addEventListener('keydown', function (e) {
      // Don't trigger when typing inside inputs
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        return;
      }

      const key = e.key.toLowerCase();

      switch (key) {
        case 'l':
          window.eFootballOverlay.toggleLights();
          break;
        case 'g':
          triggerGoalCelebration();
          break;
        case 'f':
          triggerStrobeFlash();
          break;
        case '[':
          window.eFootballOverlay.adjustIntensity(-0.1);
          break;
        case ']':
          window.eFootballOverlay.adjustIntensity(0.1);
          break;
        case 'b':
          currentConfig.enableBorderGlow = !currentConfig.enableBorderGlow;
          applyConfig();
          break;
        case 's':
          currentConfig.enableDiagonalSlashes = !currentConfig.enableDiagonalSlashes;
          applyConfig();
          break;
        case 'p':
          window.eFootballOverlay.toggleSimulator();
          break;
        case '1':
        case '2':
        case '3':
        case '4':
          window.eFootballOverlay.setPreset(parseInt(key, 10));
          break;
      }
    });
  }

  // Initialize runtime on DOM ready
  document.addEventListener('DOMContentLoaded', function () {
    loadConfigFromUrl();
    applyConfig();
    initParticleSystem();
    initKeyboardHotkeys();

    // Listen for remote control commands via BroadcastChannel (Separate Tab / Window / OBS Dock)
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const remoteChannel = new BroadcastChannel('efootball_overlay_channel');
        remoteChannel.onmessage = function (event) {
          if (!event.data) return;
          const { action, payload, preset } = event.data;
          if (action === 'GOAL_CELEBRATION') triggerGoalCelebration();
          else if (action === 'STROBE_FLASH') triggerStrobeFlash();
          else if (action === 'TOGGLE_LIGHTS') window.eFootballOverlay.toggleLights();
          else if (action === 'TOGGLE_SIMULATOR') window.eFootballOverlay.toggleSimulator();
          else if (action === 'UPDATE_CONFIG') window.eFootballOverlay.updateConfig(payload);
          else if (action === 'SET_PRESET') window.eFootballOverlay.setPreset(preset);
          else if (action === 'ADJUST_INTENSITY') window.eFootballOverlay.adjustIntensity(payload);
        };
      }
    } catch (err) {
      console.warn('BroadcastChannel not supported in this context', err);
    }

    // LocalStorage fallback for cross-window syncing
    window.addEventListener('storage', function (e) {
      if (e.key === 'efootball_overlay_action' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data.action === 'GOAL_CELEBRATION') triggerGoalCelebration();
          else if (data.action === 'STROBE_FLASH') triggerStrobeFlash();
          else if (data.action === 'TOGGLE_LIGHTS') window.eFootballOverlay.toggleLights();
          else if (data.action === 'TOGGLE_SIMULATOR') window.eFootballOverlay.toggleSimulator();
          else if (data.action === 'UPDATE_CONFIG') window.eFootballOverlay.updateConfig(data.payload);
          else if (data.action === 'SET_PRESET') window.eFootballOverlay.setPreset(data.preset);
        } catch (err) {}
      }
    });

    // Listen for postMessage from parent iframe or configuration tool if embedded
    window.addEventListener('message', function (event) {
      if (event.data && event.data.type === 'EFOOTBALL_UPDATE_CONFIG') {
        window.eFootballOverlay.updateConfig(event.data.payload);
      }
    });
  });

})();
