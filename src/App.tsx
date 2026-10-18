import React, { useState, useEffect, useRef } from 'react';
import {
  Sliders,
  Copy,
  Check,
  RotateCcw,
  Eye,
  EyeOff,
  Maximize2,
  ExternalLink,
  Sparkles,
  Zap,
  Gamepad2,
  Tv,
  HelpCircle,
  X,
  ChevronRight,
  ChevronLeft,
  Volume2,
  Layers,
  Palette
} from 'lucide-react';

interface OverlayConfig {
  primaryColor: string;
  primaryGlow: string;
  accentColor: string;
  accentGlow: string;
  lightIntensity: number;
  animationSpeed: number;
  gameplayWidth: number;
  gameplayHeight: number;
  gameplayYOffset: number;
  enableStadiumLights: boolean;
  enableDiagonalSlashes: boolean;
  enableAtmosphericDust: boolean;
  enableCrowdLeds: boolean;
  enableBorderGlow: boolean;
  simulateGameplayPitch: boolean;
  showCheckerboard: boolean;
}

const DEFAULT_CONFIG: OverlayConfig = {
  primaryColor: '#0052ff',
  primaryGlow: '#00d4ff',
  accentColor: '#ffe600',
  accentGlow: '#fff275',
  lightIntensity: 1.0,
  animationSpeed: 1.0,
  gameplayWidth: 1040,
  gameplayHeight: 585, // 1040 / 1.7777 (16:9)
  gameplayYOffset: 0,
  enableStadiumLights: true,
  enableDiagonalSlashes: true,
  enableAtmosphericDust: true,
  enableCrowdLeds: true,
  enableBorderGlow: true,
  simulateGameplayPitch: false,
  showCheckerboard: false,
};

const PRESETS = [
  {
    name: 'Official eFootball Volt',
    primary: '#0052ff',
    glow: '#00d4ff',
    accent: '#ffe600',
  },
  {
    name: 'Cyber Cobalt',
    primary: '#0038d1',
    glow: '#00f0ff',
    accent: '#ffff11',
  },
  {
    name: 'Electric Cyan Arena',
    primary: '#0070f3',
    glow: '#38bdf8',
    accent: '#ffd200',
  },
  {
    name: 'Tournament Night',
    primary: '#0d2268',
    glow: '#00d4ff',
    accent: '#ffea2e',
  },
];

export default function App() {
  const [viewMode, setViewMode] = useState<'studio' | 'overlay' | 'panel'>('studio');
  const [config, setConfig] = useState<OverlayConfig>(DEFAULT_CONFIG);
  const [isPureObsMode, setIsPureObsMode] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [scale, setScale] = useState<number>(1);
  const [isGoalCelebration, setIsGoalCelebration] = useState<boolean>(false);
  const [isStrobeFlash, setIsStrobeFlash] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const particlesCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Broadcast command to other tabs / OBS Browser Source
  const broadcastCommand = (action: string, payload?: any, preset?: number) => {
    const msg = { action, payload, preset, timestamp: Date.now() };
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage(msg);
    }
    try {
      localStorage.setItem('efootball_overlay_action', JSON.stringify(msg));
    } catch (err) {}
  };

  // Goal Celebration Trigger (Key 'G' or Remote Panel)
  const triggerGoalCelebration = () => {
    setIsGoalCelebration(true);
    setTimeout(() => setIsGoalCelebration(false), 3200);
  };

  // Instant Strobe Flash Trigger (Key 'F' or Remote Panel)
  const triggerStrobeFlash = () => {
    setIsStrobeFlash(true);
    setTimeout(() => setIsStrobeFlash(false), 450);
  };

  // Handle Remote Actions from other tabs/OBS Dock
  const handleRemoteAction = (action: string, payload?: any, preset?: number) => {
    if (action === 'GOAL_CELEBRATION') triggerGoalCelebration();
    else if (action === 'STROBE_FLASH') triggerStrobeFlash();
    else if (action === 'TOGGLE_LIGHTS') setConfig((prev) => ({ ...prev, enableStadiumLights: !prev.enableStadiumLights }));
    else if (action === 'TOGGLE_SIMULATOR') setConfig((prev) => ({ ...prev, simulateGameplayPitch: !prev.simulateGameplayPitch }));
    else if (action === 'UPDATE_CONFIG' && payload) setConfig((prev) => ({ ...prev, ...payload }));
    else if (action === 'SET_PRESET' && typeof preset === 'number') {
      const idx = preset - 1;
      if (PRESETS[idx]) {
        setConfig((prev) => ({
          ...prev,
          primaryColor: PRESETS[idx].primary,
          primaryGlow: PRESETS[idx].glow,
          accentColor: PRESETS[idx].accent,
        }));
      }
    }
  };

  // BroadcastChannel and localStorage Listener
  useEffect(() => {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const ch = new BroadcastChannel('efootball_overlay_channel');
        broadcastChannelRef.current = ch;
        ch.onmessage = (event) => {
          if (!event.data) return;
          const { action, payload, preset } = event.data;
          handleRemoteAction(action, payload, preset);
        };
      }
    } catch (err) {
      console.warn('BroadcastChannel error', err);
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'efootball_overlay_action' && e.newValue) {
        try {
          const { action, payload, preset } = JSON.parse(e.newValue);
          handleRemoteAction(action, payload, preset);
        } catch (err) {}
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      if (broadcastChannelRef.current) broadcastChannelRef.current.close();
    };
  }, []);

  // Check URL query parameters on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'panel' || params.get('panel') === '1') {
      setViewMode('panel');
      return;
    }

    if (
      params.get('obs') === 'true' ||
      params.get('stream') === 'true' ||
      params.get('obs') === '1' ||
      params.get('stream') === '1' ||
      params.get('view') === 'overlay'
    ) {
      setIsPureObsMode(true);
      setIsSidebarOpen(false);
      setViewMode('overlay');
    }

    const initialConfig: Partial<OverlayConfig> = {};
    if (params.has('primary')) initialConfig.primaryColor = params.get('primary')!;
    if (params.has('glow')) initialConfig.primaryGlow = params.get('glow')!;
    if (params.has('accent')) initialConfig.accentColor = params.get('accent')!;
    if (params.has('light')) initialConfig.lightIntensity = parseFloat(params.get('light')!) || 1.0;
    if (params.has('speed')) initialConfig.animationSpeed = parseFloat(params.get('speed')!) || 1.0;
    if (params.has('gw')) initialConfig.gameplayWidth = parseInt(params.get('gw')!, 10) || 1040;
    if (params.has('gh')) initialConfig.gameplayHeight = parseInt(params.get('gh')!, 10) || 585;
    if (params.has('gy')) initialConfig.gameplayYOffset = parseInt(params.get('gy')!, 10) || 0;
    if (params.has('beams')) initialConfig.enableStadiumLights = params.get('beams') === '1';
    if (params.has('slashes')) initialConfig.enableDiagonalSlashes = params.get('slashes') === '1';
    if (params.has('simulator')) initialConfig.simulateGameplayPitch = params.get('simulator') === '1';

    if (Object.keys(initialConfig).length > 0) {
      setConfig((prev) => ({ ...prev, ...initialConfig }));
    }
  }, []);

  // Responsive scale calculation for the 1080x1920 canvas in browser view
  useEffect(() => {
    if (isPureObsMode) {
      setScale(1);
      return;
    }

    const updateScale = () => {
      const availHeight = window.innerHeight - 32;
      const availWidth = isSidebarOpen ? window.innerWidth - 440 : window.innerWidth - 64;
      const scaleH = availHeight / 1920;
      const scaleW = availWidth / 1080;
      const nextScale = Math.min(scaleH, scaleW, 1.0);
      setScale(Math.max(0.2, nextScale));
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [isPureObsMode, isSidebarOpen]);

  // Particle Engine
  useEffect(() => {
    const canvas = particlesCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    canvas.width = 1080;
    canvas.height = 645;

    const count = 35;
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 2.2 + 0.8,
      speedY: (Math.random() * 0.45 + 0.15) * -1,
      speedX: (Math.random() - 0.5) * 0.35,
      alpha: Math.random() * 0.6 + 0.2,
      pulseSpeed: Math.random() * 0.02 + 0.01,
      color: Math.random() > 0.35 ? '#00e5ff' : '#ffe600',
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (config.enableAtmosphericDust && config.lightIntensity > 0.05) {
        const speedMul = config.animationSpeed || 1.0;
        const globalAlpha = config.lightIntensity || 1.0;

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.y += p.speedY * speedMul;
          p.x += p.speedX * speedMul;
          p.alpha += Math.sin(Date.now() * p.pulseSpeed * 0.002) * 0.01;

          if (p.y < 0) {
            p.y = canvas.height;
            p.x = Math.random() * canvas.width;
          }
          if (p.x < 0) p.x = canvas.width;
          if (p.x > canvas.width) p.x = 0;

          const alphaClamped = Math.max(0.1, Math.min(0.85, p.alpha * globalAlpha));

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle =
            p.color === '#ffe600'
              ? `rgba(255, 230, 0, ${alphaClamped})`
              : `rgba(0, 229, 255, ${alphaClamped})`;
          ctx.shadowBlur = 6;
          ctx.shadowColor = p.color;
          ctx.fill();
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [config.enableAtmosphericDust, config.lightIntensity, config.animationSpeed]);

  // Handle Streamer Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();

      switch (key) {
        case 'g':
          triggerGoalCelebration();
          broadcastCommand('GOAL_CELEBRATION');
          break;
        case 'f':
          triggerStrobeFlash();
          broadcastCommand('STROBE_FLASH');
          break;
        case 'l':
          setConfig((prev) => {
            const next = !prev.enableStadiumLights;
            broadcastCommand('TOGGLE_LIGHTS');
            return { ...prev, enableStadiumLights: next };
          });
          break;
        case '[':
          setConfig((prev) => {
            const next = Math.max(0.1, Math.round((prev.lightIntensity - 0.1) * 10) / 10);
            broadcastCommand('UPDATE_CONFIG', { lightIntensity: next });
            return { ...prev, lightIntensity: next };
          });
          break;
        case ']':
          setConfig((prev) => {
            const next = Math.min(1.5, Math.round((prev.lightIntensity + 0.1) * 10) / 10);
            broadcastCommand('UPDATE_CONFIG', { lightIntensity: next });
            return { ...prev, lightIntensity: next };
          });
          break;
        case 'b':
          setConfig((prev) => {
            const next = !prev.enableBorderGlow;
            broadcastCommand('UPDATE_CONFIG', { enableBorderGlow: next });
            return { ...prev, enableBorderGlow: next };
          });
          break;
        case 's':
          setConfig((prev) => {
            const next = !prev.enableDiagonalSlashes;
            broadcastCommand('UPDATE_CONFIG', { enableDiagonalSlashes: next });
            return { ...prev, enableDiagonalSlashes: next };
          });
          break;
        case 'p':
          setConfig((prev) => {
            const next = !prev.simulateGameplayPitch;
            broadcastCommand('TOGGLE_SIMULATOR');
            return { ...prev, simulateGameplayPitch: next };
          });
          break;
        case 'c':
          setIsSidebarOpen((prev) => !prev);
          break;
        case '1':
        case '2':
        case '3':
        case '4': {
          const idx = parseInt(key, 10) - 1;
          if (PRESETS[idx]) {
            setConfig((prev) => ({
              ...prev,
              primaryColor: PRESETS[idx].primary,
              primaryGlow: PRESETS[idx].glow,
              accentColor: PRESETS[idx].accent,
            }));
            broadcastCommand('SET_PRESET', null, idx + 1);
          }
          break;
        }
        case 'escape':
          if (showGuideModal) setShowGuideModal(false);
          else if (isPureObsMode) setIsPureObsMode(false);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showGuideModal, isPureObsMode]);

  // Build OBS URL with current parameters
  const getObsUrl = () => {
    const base = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();
    params.set('stream', '1');
    if (config.primaryColor !== DEFAULT_CONFIG.primaryColor) params.set('primary', config.primaryColor);
    if (config.primaryGlow !== DEFAULT_CONFIG.primaryGlow) params.set('glow', config.primaryGlow);
    if (config.accentColor !== DEFAULT_CONFIG.accentColor) params.set('accent', config.accentColor);
    if (config.lightIntensity !== 1.0) params.set('light', config.lightIntensity.toFixed(2));
    if (config.animationSpeed !== 1.0) params.set('speed', config.animationSpeed.toFixed(2));
    if (config.gameplayWidth !== 1040) params.set('gw', config.gameplayWidth.toString());
    if (config.gameplayHeight !== 585) params.set('gh', config.gameplayHeight.toString());
    if (config.gameplayYOffset !== 0) params.set('gy', config.gameplayYOffset.toString());
    if (!config.enableStadiumLights) params.set('beams', '0');
    if (!config.enableDiagonalSlashes) params.set('slashes', '0');
    return `${base}?${params.toString()}`;
  };

  const copyObsUrlToClipboard = () => {
    navigator.clipboard.writeText(getObsUrl());
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const copyConfigJson = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  // Inline CSS variable styling applied to overlay
  const overlayStyle = {
    '--primary-color': config.primaryColor,
    '--primary-glow': config.primaryGlow,
    '--accent-color': config.accentColor,
    '--accent-glow': config.accentGlow,
    '--light-intensity': config.lightIntensity,
    '--anim-speed': config.animationSpeed,
    '--gameplay-width': `${config.gameplayWidth}px`,
    '--gameplay-height': `${config.gameplayHeight}px`,
    '--gameplay-y-offset': `${config.gameplayYOffset}px`,
    '--toggle-beams': config.enableStadiumLights ? '1' : '0',
    '--toggle-slashes': config.enableDiagonalSlashes ? '1' : '0',
    '--toggle-particles': config.enableAtmosphericDust ? '1' : '0',
    '--toggle-crowd-lights': config.enableCrowdLeds ? '1' : '0',
    '--toggle-border-glow': config.enableBorderGlow ? '1' : '0',
  } as React.CSSProperties;

  // Render the core 1080x1920 overlay canvas with 100% transparent gameplay cutout
  const renderOverlayContent = () => (
    <div
      id="overlayCanvas"
      style={{
        ...overlayStyle,
        backgroundColor: 'transparent',
      }}
      className={`relative w-[1080px] h-[1920px] overflow-hidden bg-transparent select-none pointer-events-none ${
        isGoalCelebration ? 'goal-celebration-active' : ''
      } ${isStrobeFlash ? 'stadium-strobe' : ''}`}
    >
      {/* Celebration Gold Floodlight Burst Layer */}
      <div className={`gold-floodlight-burst ${isGoalCelebration ? 'active' : ''}`} />

      {/* SECTION A: HEADER */}
      <div className="absolute top-0 left-0 w-[1080px] h-[645px] overflow-hidden pointer-events-none z-10">
        {/* Stadium Roof Image */}
        <img
          src="/efootball-overlay/assets/stadium/roof_lights.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-top opacity-92 filter contrast-[1.15] brightness-90"
        />

        {/* Vignette & Gradients */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 15%, rgba(0, 82, 255, 0.25) 0%, transparent 60%), linear-gradient(180deg, rgba(2, 11, 36, 0.45) 0%, rgba(2, 11, 36, 0.7) 65%, rgba(3, 7, 18, 0.98) 95%, rgba(0, 0, 0, 1) 100%)',
            mixBlendMode: 'multiply',
          }}
        />

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 70% 20%, rgba(0, 212, 255, ${0.35 * config.lightIntensity}) 0%, transparent 55%), linear-gradient(135deg, rgba(0, 82, 255, ${0.3 * config.lightIntensity}) 0%, transparent 70%)`,
            mixBlendMode: 'screen',
          }}
        />

        {/* Volumetric Stadium Light Beams */}
        {config.enableStadiumLights && (
          <div
            className="absolute inset-0 pointer-events-none mix-blend-screen"
            style={{ opacity: config.lightIntensity }}
          >
            <div
              className="beam-1 absolute -top-[60px] left-[120px] w-[240px] h-[850px] filter blur-md origin-top opacity-70"
              style={{
                background:
                  'linear-gradient(180deg, rgba(0, 212, 255, 0.8) 0%, rgba(0, 120, 255, 0.3) 40%, transparent 90%)',
                clipPath: 'polygon(45% 0, 55% 0, 100% 100%, 0% 100%)',
              }}
            />
            <div
              className="beam-2 absolute -top-[60px] left-[360px] w-[280px] h-[920px] filter blur-md origin-top opacity-80"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(0, 212, 255, 0.45) 30%, transparent 85%)',
                clipPath: 'polygon(46% 0, 54% 0, 95% 100%, 5% 100%)',
              }}
            />
            <div
              className="beam-3 absolute -top-[60px] right-[180px] w-[260px] h-[880px] filter blur-md origin-top opacity-75"
              style={{
                background:
                  'linear-gradient(180deg, rgba(0, 212, 255, 0.75) 0%, rgba(0, 82, 255, 0.35) 45%, transparent 90%)',
                clipPath: 'polygon(44% 0, 56% 0, 100% 100%, 0% 100%)',
              }}
            />

            {/* Flares */}
            <div
              className="beam-flare absolute top-[15px] left-[160px] w-[140px] h-[45px] rounded-full filter blur-[4px]"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.95) 0%, rgba(0, 212, 255, 0.6) 40%, transparent 70%)',
              }}
            />
            <div
              className="beam-flare absolute top-[15px] left-[470px] w-[140px] h-[45px] rounded-full filter blur-[4px]"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.95) 0%, rgba(0, 212, 255, 0.6) 40%, transparent 70%)',
              }}
            />
            <div
              className="beam-flare absolute top-[15px] right-[280px] w-[140px] h-[45px] rounded-full filter blur-[4px]"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.95) 0%, rgba(0, 212, 255, 0.6) 40%, transparent 70%)',
              }}
            />
          </div>
        )}

        {/* Dynamic Volt Yellow Diagonal Slashes */}
        {config.enableDiagonalSlashes && (
          <div className="absolute top-0 right-0 w-[580px] h-[460px] pointer-events-none z-15">
            <img
              src="/efootball-overlay/assets/decorations/slashes.svg"
              alt=""
              className="slash-shimmer absolute -top-[30px] -right-[20px] w-[520px] h-[360px] filter drop-shadow-[0_0_18px_rgba(255,230,0,0.7)]"
            />
          </div>
        )}

        {/* Atmospheric Dust Canvas */}
        <canvas ref={particlesCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-12" />

        {/* Top LED Rim */}
        <div
          className="absolute top-0 left-0 w-full h-[6px]"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${config.primaryColor} 20%, ${config.primaryGlow} 50%, ${config.accentColor} 75%, transparent 100%)`,
            boxShadow: `0 0 14px ${config.primaryGlow}`,
          }}
        />
      </div>

      {/* SECTION B: GAMEPLAY AREA (16:9 Dedicated Transparent Cutout) */}
      <div
        className="absolute top-[645px] left-0 w-[1080px] h-[620px] flex items-center justify-center z-20 pointer-events-none bg-transparent"
        style={{
          transform: `translateY(${config.gameplayYOffset}px)`,
          backgroundColor: 'transparent',
        }}
      >
        {/* Side Spacers to blend nicely */}
        <div
          className="absolute left-0 top-0 bottom-0 z-10 pointer-events-none"
          style={{
            width: `calc((1080px - ${config.gameplayWidth}px) / 2)`,
            background: 'linear-gradient(90deg, rgba(3, 7, 18, 0.95) 0%, rgba(2, 11, 36, 0.8) 100%)',
            borderRight: '1px solid rgba(0, 212, 255, 0.3)',
          }}
        />
        <div
          className="absolute right-0 top-0 bottom-0 z-10 pointer-events-none"
          style={{
            width: `calc((1080px - ${config.gameplayWidth}px) / 2)`,
            background: 'linear-gradient(270deg, rgba(3, 7, 18, 0.95) 0%, rgba(2, 11, 36, 0.8) 100%)',
            borderLeft: '1px solid rgba(0, 212, 255, 0.3)',
          }}
        />

        {/* 16:9 Inner Viewport - COMPLETELY TRANSPARENT FOR OBS GAME SOURCE */}
        <div
          className="relative pointer-events-none bg-transparent"
          style={{
            width: config.gameplayWidth,
            height: config.gameplayHeight,
            backgroundColor: 'transparent',
            background: 'transparent',
          }}
        >
          {/* Calibration Layer (Test Game Source) */}
          {config.simulateGameplayPitch && (
            <div className="absolute inset-0 z-1 rounded-lg overflow-hidden border border-emerald-500/30">
              <div className="w-full h-full relative flex flex-col items-center justify-center bg-radial from-emerald-800/90 to-emerald-950/98">
                <div className="absolute inset-5 border-2 border-white/20" />
                <div className="absolute w-28 h-28 border-2 border-white/20 rounded-full" />
                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/20" />
                <div className="relative z-10 px-4 py-2 bg-black/60 rounded text-xs font-bold tracking-widest text-emerald-300 uppercase border border-emerald-500/40 shadow-lg">
                  Simulated 16:9 eFootball Game (Transparent On Stream)
                </div>
              </div>
            </div>
          )}

          {/* Cyber Esports Frame */}
          <div className="absolute inset-0 pointer-events-none z-5">
            <svg
              className="absolute inset-0 w-full h-full overflow-visible"
              viewBox={`0 0 ${config.gameplayWidth} ${config.gameplayHeight}`}
              preserveAspectRatio="none"
            >
              <polygon
                className={config.enableBorderGlow ? 'frame-glow-anim' : ''}
                points={`24,0 ${config.gameplayWidth - 24},0 ${config.gameplayWidth},24 ${config.gameplayWidth},${config.gameplayHeight - 24} ${config.gameplayWidth - 24},${config.gameplayHeight} 24,${config.gameplayHeight} 0,${config.gameplayHeight - 24} 0,24`}
                fill="none"
                stroke={config.primaryGlow}
                strokeWidth="3.5"
                style={{
                  filter: `drop-shadow(0 0 10px ${config.primaryGlow})`,
                }}
              />
              <polygon
                points={`24,0 ${config.gameplayWidth - 24},0 ${config.gameplayWidth},24 ${config.gameplayWidth},${config.gameplayHeight - 24} ${config.gameplayWidth - 24},${config.gameplayHeight} 24,${config.gameplayHeight} 0,${config.gameplayHeight - 24} 0,24`}
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.2"
                opacity="0.9"
              />
            </svg>

            {/* Top Cyber Runner */}
            <div className="absolute -top-[10px] left-0 w-full h-[24px]">
              <img
                src="/efootball-overlay/assets/decorations/frame_runner_top.svg"
                alt=""
                className="w-full h-full filter drop-shadow-[0_0_8px_rgba(255,230,0,0.65)]"
              />
            </div>

            {/* Bottom Cyber Runner */}
            <div className="absolute -bottom-[10px] left-0 w-full h-[24px]">
              <img
                src="/efootball-overlay/assets/decorations/frame_runner_bottom.svg"
                alt=""
                className="w-full h-full filter drop-shadow-[0_0_8px_rgba(255,230,0,0.65)]"
              />
            </div>

            {/* Corner Brackets */}
            <div className="absolute -top-1 -left-1 w-9 h-9">
              <img src="/efootball-overlay/assets/decorations/corner_bracket.svg" alt="" />
            </div>
            <div className="absolute -top-1 -right-1 w-9 h-9 -scale-x-100">
              <img src="/efootball-overlay/assets/decorations/corner_bracket.svg" alt="" />
            </div>
            <div className="absolute -bottom-1 -left-1 w-9 h-9 -scale-y-100">
              <img src="/efootball-overlay/assets/decorations/corner_bracket.svg" alt="" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-9 h-9 -scale-100">
              <img src="/efootball-overlay/assets/decorations/corner_bracket.svg" alt="" />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION C: FOOTER (Stadium Bleachers & Cheering Crowd Atmosphere) */}
      <div className="absolute bottom-0 left-0 w-[1080px] h-[655px] overflow-hidden pointer-events-none z-10">
        <img
          src="/efootball-overlay/assets/stadium/crowd_stands.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-bottom opacity-94 filter contrast-[1.15] brightness-[0.88]"
        />

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(0deg, rgba(2, 8, 24, 0.96) 0%, rgba(2, 8, 24, 0.88) 45%, rgba(2, 11, 36, 0.65) 75%, rgba(3, 7, 18, 0.98) 100%)',
          }}
        />

        <div
          className="absolute top-0 -left-5 -right-5 h-[28px] filter blur-[1px]"
          style={{
            background: `linear-gradient(90deg, transparent 0%, rgba(0, 82, 255, 0.7) 15%, ${config.primaryGlow} 50%, rgba(0, 82, 255, 0.7) 85%, transparent 100%)`,
            boxShadow: `0 0 20px ${config.primaryGlow}`,
            opacity: 0.85 * config.lightIntensity,
          }}
        />

        {config.enableCrowdLeds && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ opacity: config.lightIntensity }}
          >
            <div className="sparkle-anim-1 absolute bottom-[180px] left-[140px] w-1 h-1 rounded-full bg-white" style={{ filter: `drop-shadow(0 0 5px ${config.primaryGlow})` }} />
            <div className="sparkle-anim-2 absolute bottom-[260px] left-[320px] w-1 h-1 rounded-full bg-white" style={{ filter: `drop-shadow(0 0 5px ${config.primaryGlow})` }} />
            <div className="sparkle-anim-3 absolute bottom-[140px] left-[490px] w-1 h-1 rounded-full bg-white" style={{ filter: `drop-shadow(0 0 5px ${config.primaryGlow})` }} />
            <div className="sparkle-anim-4 absolute bottom-[310px] right-[290px] w-1 h-1 rounded-full bg-white" style={{ filter: `drop-shadow(0 0 5px ${config.primaryGlow})` }} />
            <div className="sparkle-anim-5 absolute bottom-[220px] right-[120px] w-1 h-1 rounded-full bg-white" style={{ filter: `drop-shadow(0 0 5px ${config.primaryGlow})` }} />
            <div className="sparkle-anim-6 absolute bottom-[380px] left-[240px] w-1 h-1 rounded-full bg-white" style={{ filter: `drop-shadow(0 0 5px ${config.primaryGlow})` }} />
            <div className="sparkle-anim-7 absolute bottom-[420px] right-[410px] w-1 h-1 rounded-full bg-white" style={{ filter: `drop-shadow(0 0 5px ${config.primaryGlow})` }} />
            <div className="sparkle-anim-8 absolute bottom-[110px] right-[480px] w-1 h-1 rounded-full bg-white" style={{ filter: `drop-shadow(0 0 5px ${config.primaryGlow})` }} />
          </div>
        )}

        <div
          className="absolute bottom-0 left-0 w-[320px] h-[12px] opacity-70"
          style={{
            background: `linear-gradient(90deg, ${config.accentColor} 0%, transparent 100%)`,
            clipPath: 'polygon(0 0, 85% 0, 100% 100%, 0 100%)',
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-[220px] h-[12px] opacity-60"
          style={{
            background: `linear-gradient(270deg, ${config.primaryGlow} 0%, transparent 100%)`,
            clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0 100%)',
          }}
        />
      </div>
    </div>
  );

  // ==========================================================================
  // PURE OBS OVERLAY OUTPUT: 100% TRANSPARENT ALPHA BACKGROUND
  // ==========================================================================
  if (isPureObsMode || viewMode === 'overlay') {
    return (
      <div className="w-[1080px] h-[1920px] overflow-hidden bg-transparent select-none pointer-events-none">
        {renderOverlayContent()}
      </div>
    );
  }

  // ==========================================================================
  // DEDICATED SEPARATE REMOTE CONTROL DECK VIEW (?view=panel)
  // ==========================================================================
  if (viewMode === 'panel') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 max-w-2xl mx-auto flex flex-col font-sans select-none">
        {/* Header */}
        <header className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 rounded-full bg-blue-500 shadow-[0_0_10px_#0052ff]"></span>
            <div>
              <h1 className="font-bold text-base text-white tracking-tight">eFootball Remote Control Deck</h1>
              <p className="text-[11px] text-slate-400">Kontrol overlay terpisah untuk OBS Studio & TikTok LIVE</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Live Sync Active</span>
          </div>
        </header>

        {/* Big Action Buttons (Stream Deck Style) */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {/* Huge Goal Celebration Button */}
          <button
            onClick={() => {
              triggerGoalCelebration();
              broadcastCommand('GOAL_CELEBRATION');
            }}
            className="col-span-2 py-5 px-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-500/30 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 border-2 border-amber-400/60 hover:border-amber-400 active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(245,158,11,0.25)] flex flex-col items-center justify-center gap-1.5 cursor-pointer text-amber-200"
          >
            <div className="text-xl sm:text-2xl font-black tracking-wider text-amber-300 flex items-center gap-2 uppercase">
              <Zap className="w-6 h-6 text-amber-400 fill-amber-400" />
              <span>GOAL CELEBRATION!</span>
              <Zap className="w-6 h-6 text-amber-400 fill-amber-400" />
            </div>
            <div className="text-xs text-amber-200/80">Strobo Emas Stadion Spektakuler (Hotkey: G)</div>
          </button>

          {/* Flash Button */}
          <button
            onClick={() => {
              triggerStrobeFlash();
              broadcastCommand('STROBE_FLASH');
            }}
            className="py-4 px-3 rounded-xl bg-gradient-to-r from-blue-600/20 to-cyan-500/20 hover:from-blue-600/30 hover:to-cyan-500/30 border border-blue-500/50 active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <div className="font-bold text-sm text-cyan-200">STADIUM FLASH</div>
            <div className="text-[10px] text-slate-400">Kilat Lampu Instan (F)</div>
          </button>

          {/* Light Beams Toggle */}
          <button
            onClick={() => {
              const next = !config.enableStadiumLights;
              setConfig((prev) => ({ ...prev, enableStadiumLights: next }));
              broadcastCommand('TOGGLE_LIGHTS');
            }}
            className={`py-4 px-3 rounded-xl border active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
              config.enableStadiumLights
                ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-300 shadow-[0_0_15px_rgba(0,212,255,0.2)]'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <Tv className="w-5 h-5" />
            <div className="font-bold text-sm">
              {config.enableStadiumLights ? '💡 LAMPU: ON' : '💡 LAMPU: OFF'}
            </div>
            <div className="text-[10px] text-slate-400">Sinar Stadion (L)</div>
          </button>
        </div>

        {/* Sliders Card */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Intensitas & Kecepatan Lampu</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  const val = Math.max(0.1, Math.round((config.lightIntensity - 0.1) * 10) / 10);
                  setConfig((prev) => ({ ...prev, lightIntensity: val }));
                  broadcastCommand('UPDATE_CONFIG', { lightIntensity: val });
                }}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 font-mono text-[11px] border border-slate-700 flex items-center gap-1 transition-colors"
                title="Redupkan 10% (Hotkey: [ )"
              >
                <span>-10%</span>
                <kbd className="px-1 py-0.2 bg-black/60 rounded text-[9px] text-slate-400 font-mono">[</kbd>
              </button>
              <button
                onClick={() => {
                  const val = Math.min(1.5, Math.round((config.lightIntensity + 0.1) * 10) / 10);
                  setConfig((prev) => ({ ...prev, lightIntensity: val }));
                  broadcastCommand('UPDATE_CONFIG', { lightIntensity: val });
                }}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 font-mono text-[11px] border border-slate-700 flex items-center gap-1 transition-colors"
                title="Terangkan 10% (Hotkey: ] )"
              >
                <span>+10%</span>
                <kbd className="px-1 py-0.2 bg-black/60 rounded text-[9px] text-slate-400 font-mono">]</kbd>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Intensitas Cahaya</span>
              <span className="font-mono text-cyan-400 font-bold">{(config.lightIntensity * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.5"
              step="0.05"
              value={config.lightIntensity}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setConfig((prev) => ({ ...prev, lightIntensity: val }));
                broadcastCommand('UPDATE_CONFIG', { lightIntensity: val });
              }}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Kecepatan Animasi Sinar</span>
              <span className="font-mono text-cyan-400 font-bold">{config.animationSpeed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="2.0"
              step="0.1"
              value={config.animationSpeed}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setConfig((prev) => ({ ...prev, animationSpeed: val }));
                broadcastCommand('UPDATE_CONFIG', { animationSpeed: val });
              }}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Preset Cards */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Preset Tema Warna</span>
            <span className="text-[10px] text-slate-500 font-mono">Hotkey: 1 - 4</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((p, idx) => (
              <button
                key={p.name}
                onClick={() => {
                  setConfig((prev) => ({
                    ...prev,
                    primaryColor: p.primary,
                    primaryGlow: p.glow,
                    accentColor: p.accent,
                  }));
                  broadcastCommand('SET_PRESET', null, idx + 1);
                }}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-cyan-500/50 flex items-center justify-between text-left transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.primary }} />
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.accent }} />
                  </div>
                  <span className="text-xs font-medium text-white truncate">{p.name}</span>
                </div>
                <kbd className="px-1.5 py-0.5 bg-black/60 rounded text-[9px] font-mono text-slate-400 shrink-0 ml-1">
                  {idx + 1}
                </kbd>
              </button>
            ))}
          </div>
        </div>

        {/* Effect Toggles */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5 mb-4 text-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Sakelar Efek Stadion & Transparansi</div>
          {[
            { key: 'enableDiagonalSlashes' as const, label: 'Slashes Kuning Elektrik', hotkey: 'S' },
            { key: 'enableAtmosphericDust' as const, label: 'Partikel Debu Stadion', hotkey: null },
            { key: 'enableCrowdLeds' as const, label: 'Lampu Sorak Penonton', hotkey: null },
            { key: 'enableBorderGlow' as const, label: 'Neon Frame Breathing Glow', hotkey: 'B' },
            { key: 'simulateGameplayPitch' as const, label: 'Panduan Lapangan Hijau (16:9 Alignment Test)', hotkey: 'P' },
          ].map(({ key, label, hotkey }) => (
            <label key={key} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/40 cursor-pointer transition-colors">
              <div className="flex items-center gap-2">
                <span>{label}</span>
                {hotkey && (
                  <kbd className="px-1 py-0.2 bg-black/60 rounded text-[9px] text-slate-400 font-mono">{hotkey}</kbd>
                )}
              </div>
              <input
                type="checkbox"
                checked={config[key]}
                onChange={(e) => {
                  const state = e.target.checked;
                  setConfig((prev) => ({ ...prev, [key]: state }));
                  broadcastCommand('UPDATE_CONFIG', { [key]: state });
                }}
                className="w-4 h-4 rounded accent-blue-500 cursor-pointer"
              />
            </label>
          ))}
        </div>

        {/* Keyboard Hotkeys Quick Cheatsheet Card */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/40 to-slate-900 border border-blue-800/40 space-y-2 mb-4 text-xs">
          <div className="font-bold text-white flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 text-blue-300">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Keyboard Hotkeys Siap Pakai
            </span>
            <span className="text-[10px] text-slate-400">Berfungsi langsung saat tombol ditekan</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
            <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800 flex justify-between items-center">
              <span className="text-slate-300">Goal FX</span>
              <kbd className="px-1 bg-amber-500/20 text-amber-300 rounded font-mono font-bold">G</kbd>
            </div>
            <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800 flex justify-between items-center">
              <span className="text-slate-300">Flash</span>
              <kbd className="px-1 bg-blue-500/20 text-blue-300 rounded font-mono font-bold">F</kbd>
            </div>
            <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800 flex justify-between items-center">
              <span className="text-slate-300">Lampu</span>
              <kbd className="px-1 bg-slate-800 text-slate-300 rounded font-mono">L</kbd>
            </div>
            <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800 flex justify-between items-center">
              <span className="text-slate-300">Bright -/+</span>
              <span className="font-mono text-slate-300">[ ]</span>
            </div>
          </div>
        </div>

        {/* OBS Hotkeys Troubleshooting Card */}
        <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-600/40 space-y-2.5 mb-4 text-[11px] text-amber-200">
          <div className="font-bold flex items-center justify-between text-amber-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              💡 Mengapa Hotkey Tidak Jalan di OBS?
            </span>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono">OBS Sandbox Limit</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            OBS <strong>Browser Source</strong> secara default tidak menerima input keyboard global saat Anda sedang fokus bermain game eFootball / emulator / membuka aplikasi lain.
          </p>
          <div className="space-y-1.5 pt-1 border-t border-amber-800/40 text-[11px]">
            <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 space-y-1">
              <div className="font-bold text-amber-400">1. Gunakan Fitur "Interact" di OBS (Paling Cepat)</div>
              <div className="text-slate-400 text-[10px]">
                Di OBS, klik kanan source <strong>Browser Source</strong> &rarr; pilih <strong>Interact (Berinteraksi)</strong>. Klik ke dalam jendela tersebut, maka tombol <kbd className="px-1 bg-black text-amber-300 font-mono rounded">G</kbd>, <kbd className="px-1 bg-black text-amber-300 font-mono rounded">F</kbd>, <kbd className="px-1 bg-black text-amber-300 font-mono rounded">L</kbd> langsung berfungsi.
              </div>
            </div>

            <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 space-y-1">
              <div className="font-bold text-cyan-400">2. Jadikan Custom Browser Dock di OBS (Rekomendasi!)</div>
              <div className="text-slate-400 text-[10px]">
                Di OBS menu atas: <strong>Docks &rarr; Custom Browser Docks...</strong> Masukkan URL panel ini (<code className="text-cyan-300 font-mono">?view=panel</code>). Panel tombol akan menempel langsung di OBS sehingga Anda bisa klik tombol <span className="text-amber-300 font-bold">GOAL FX</span> atau <span className="text-blue-300 font-bold">FLASH</span> dengan mouse kapan saja tanpa tabrakan hotkey.
              </div>
            </div>

            <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 space-y-1">
              <div className="font-bold text-emerald-400">3. Jadikan HP / Tablet Sebagai Remote Touch (Stream Deck)</div>
              <div className="text-slate-400 text-[10px]">
                Buka link panel ini di browser HP Anda. Saat gol terjadi di game eFootball, cukup sentuh tombol di HP Anda dengan satu jari tanpa perlu alt-tab!
              </div>
            </div>
          </div>
        </div>

        {/* Transparansi & OBS Quick Setup Notice */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 mb-5 text-[11px] text-slate-300">
          <div className="font-semibold text-white flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cara Kerja Transparansi di OBS:</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Area tengah 16:9 berstatus <strong>100% transparan murni</strong> (tanpa latar belakang hitam/warna). Di OBS Studio, pastikan urutan lapisan (layer) adalah:
          </p>
          <div className="bg-slate-950 p-2 rounded border border-slate-800 font-mono text-[10px] space-y-0.5 text-slate-300">
            <div className="text-emerald-400 font-bold">1. [ATAS] Browser Source (Overlay eFootball ini)</div>
            <div className="text-blue-300">2. [BAWAH] Game Capture / Window Capture (Game eFootball Anda)</div>
          </div>
        </div>

        {/* Navigation & OBS Integration links */}
        <div className="flex flex-col sm:flex-row gap-2 mt-auto pt-3 border-t border-slate-800">
          <a
            href="?stream=1"
            target="_blank"
            rel="noreferrer"
            className="flex-1 py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
            <span>Buka Overlay Bersih di Tab Baru</span>
          </a>

          <button
            onClick={copyObsUrlToClipboard}
            className="flex-1 py-2.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            {copiedUrl ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-white" />}
            <span>{copiedUrl ? 'URL OBS Tersalin!' : 'Salin URL OBS'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* ====================================================================
          TOP STREAMER BAR (Hidden in Pure OBS / Stream Mode)
          ==================================================================== */}
      {!isPureObsMode && (
        <header className="h-12 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-50 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold tracking-tight text-white flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_#0052ff]"></span>
              eFootball 9:16 LIVE Overlay
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">1080 × 1920 Portrait</span>
            <span className="text-slate-500">·</span>
            <span className="px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-400 border border-blue-800/60 font-mono text-[10px]">
              OBS & TikTok LIVE Ready
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Live Lighting FX Triggers */}
            <button
              onClick={triggerGoalCelebration}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors font-medium shadow-sm"
              title="Goal Celebration Strobe FX (Shortcut: G)"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Goal Strobe</span>
              <kbd className="px-1 py-0.2 bg-black/40 rounded text-[9px] font-mono text-amber-200">G</kbd>
            </button>

            <button
              onClick={triggerStrobeFlash}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 transition-colors font-medium"
              title="Instant Stadium Flash (Shortcut: F)"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Flash</span>
              <kbd className="px-1 py-0.2 bg-black/40 rounded text-[9px] font-mono text-blue-200">F</kbd>
            </button>

            <button
              onClick={() => setConfig((prev) => ({ ...prev, enableStadiumLights: !prev.enableStadiumLights }))}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors font-medium ${
                config.enableStadiumLights
                  ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
              title="Toggle Stadium Beams (Shortcut: L)"
            >
              <span>{config.enableStadiumLights ? 'Lights: ON' : 'Lights: OFF'}</span>
              <kbd className="px-1 py-0.2 bg-black/40 rounded text-[9px] font-mono text-slate-300">L</kbd>
            </button>

            <span className="w-px h-4 bg-slate-800 mx-0.5" />

            <button
              onClick={() => setConfig((prev) => ({ ...prev, simulateGameplayPitch: !prev.simulateGameplayPitch }))}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors font-medium ${
                config.simulateGameplayPitch
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="Toggle simulated pitch alignment guide (Shortcut: P)"
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>{config.simulateGameplayPitch ? 'Pitch: ON' : 'Test Game'}</span>
            </button>

            <button
              onClick={() => setConfig((prev) => ({ ...prev, showCheckerboard: !prev.showCheckerboard }))}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors font-medium ${
                config.showCheckerboard
                  ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="Show checkerboard to prove transparent gameplay cutout"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Transparency Check</span>
            </button>

            <button
              onClick={copyObsUrlToClipboard}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors shadow-sm"
              title="Copy OBS Browser Source URL with parameters"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUrl ? 'Copied URL!' : 'Copy OBS URL'}</span>
            </button>

            <button
              onClick={() => setShowGuideModal(true)}
              className="p-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
              title="Setup Guide & Hotkeys"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPureObsMode(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/40 transition-colors font-medium"
              title="Preview pure overlay with 0 UI controls (Press ESC to return)"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Clean Stream Mode</span>
            </button>

            <a
              href="?view=panel"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors shadow-sm ml-1"
              title="Buka remote control deck di tab/jendela terpisah untuk mengontrol overlay live"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-950" />
              <span>Control Panel ↗</span>
            </a>

            <button
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="p-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors ml-1"
              title="Toggle Configuration Studio (Hot key: C)"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </header>
      )}

      {/* ====================================================================
          MAIN WORKSPACE & OVERLAY VIEWPORT
          ==================================================================== */}
      <div className="relative flex-1 w-full h-full flex overflow-hidden">
        {/* Central Stage Area */}
        <div
          ref={containerRef}
          className="relative flex-1 h-full flex items-center justify-center p-2 overflow-hidden bg-slate-950/80"
        >
          {/* Subtle Viewport Guide Info */}
          {!isPureObsMode && (
            <div className="absolute top-3 left-4 text-[11px] text-slate-500 pointer-events-none flex items-center gap-2">
              <span>Zoom Scale: {(scale * 100).toFixed(0)}%</span>
              <span>·</span>
              <span>Native 1080 × 1920 Portrait Canvas</span>
            </div>
          )}

          {/* Floating Exit Button for Pure OBS Mode preview */}
          {isPureObsMode && (
            <button
              onClick={() => setIsPureObsMode(false)}
              className="absolute top-4 right-4 z-50 px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs backdrop-blur-sm opacity-20 hover:opacity-100 transition-opacity"
            >
              Exit Pure View (ESC)
            </button>
          )}

          {/* Scaled Wrapper for 1080x1920 Canvas */}
          <div
            style={{
              width: 1080,
              height: 1920,
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
            }}
            className="relative shrink-0 shadow-2xl overflow-hidden"
          >
            {/* Optional Checkerboard Background to verify transparency */}
            {config.showCheckerboard && (
              <div className="absolute inset-0 checkerboard-bg z-0 opacity-80 pointer-events-none" />
            )}

            {renderOverlayContent()}
          </div>
        </div>

        {/* ====================================================================
            CONFIGURATION STUDIO SIDEBAR (Collapsible)
            ==================================================================== */}
        {!isPureObsMode && (
          <aside
            className={`w-[380px] h-full bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 transition-all duration-300 ease-in-out z-40 ${
              isSidebarOpen ? 'translate-x-0' : 'translate-x-full absolute right-0'
            }`}
          >
            {/* Header */}
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-400" />
                <h2 className="font-semibold text-sm text-white">Overlay Studio Control</h2>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Hide Sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Controls */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 text-xs text-slate-300">
              {/* Live Lighting FX & Streamer Hotkeys */}
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-950/60 to-slate-900 border border-blue-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-white text-[12px]">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Live Lighting Hotkeys</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60">
                    Active
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={triggerGoalCelebration}
                    className="p-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-medium flex items-center justify-between transition-colors text-left"
                  >
                    <span>Goal Celebration</span>
                    <kbd className="px-1.5 py-0.5 bg-black/60 rounded text-[10px] font-mono text-amber-300">G</kbd>
                  </button>

                  <button
                    onClick={triggerStrobeFlash}
                    className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-200 font-medium flex items-center justify-between transition-colors text-left"
                  >
                    <span>Stadium Flash</span>
                    <kbd className="px-1.5 py-0.5 bg-black/60 rounded text-[10px] font-mono text-blue-300">F</kbd>
                  </button>

                  <button
                    onClick={() => setConfig((prev) => ({ ...prev, enableStadiumLights: !prev.enableStadiumLights }))}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-medium flex items-center justify-between transition-colors text-left"
                  >
                    <span>Light Beams</span>
                    <kbd className="px-1.5 py-0.5 bg-black/60 rounded text-[10px] font-mono text-slate-300">L</kbd>
                  </button>

                  <div className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-medium flex items-center justify-between">
                    <span>Brightness</span>
                    <div className="flex gap-1">
                      <kbd className="px-1.5 py-0.5 bg-black/60 rounded text-[10px] font-mono text-slate-300">[</kbd>
                      <kbd className="px-1.5 py-0.5 bg-black/60 rounded text-[10px] font-mono text-slate-300">]</kbd>
                    </div>
                  </div>
                </div>

                {/* Hotkeys Quick Reference */}
                <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-slate-400">
                  <div className="flex justify-between"><span>Neon Glow</span><kbd className="font-mono text-slate-300">B</kbd></div>
                  <div className="flex justify-between"><span>Yellow Slashes</span><kbd className="font-mono text-slate-300">S</kbd></div>
                  <div className="flex justify-between"><span>Pitch Guide</span><kbd className="font-mono text-slate-300">P</kbd></div>
                  <div className="flex justify-between"><span>Themes</span><kbd className="font-mono text-slate-300">1-4</kbd></div>
                </div>
              </div>

              {/* Presets */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-blue-400" />
                  Color Themes
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.name}
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          primaryColor: p.primary,
                          primaryGlow: p.glow,
                          accentColor: p.accent,
                        }))
                      }
                      className="p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-blue-500/50 flex flex-col items-start gap-1.5 text-left transition-colors"
                    >
                      <div className="flex items-center gap-1.5 w-full">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.primary }} />
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.accent }} />
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.glow }} />
                      </div>
                      <span className="text-[11px] font-medium text-white truncate w-full">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Customizers */}
              <div className="space-y-3">
                <label className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">
                  Custom Colors
                </label>

                {/* Primary Blue */}
                <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.primaryColor}
                      onChange={(e) => setConfig((prev) => ({ ...prev, primaryColor: e.target.value }))}
                      className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <div>
                      <div className="font-medium text-white">Primary Stadium Blue</div>
                      <div className="text-[10px] text-slate-400 font-mono">{config.primaryColor}</div>
                    </div>
                  </div>
                </div>

                {/* Accent Volt Yellow */}
                <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.accentColor}
                      onChange={(e) => setConfig((prev) => ({ ...prev, accentColor: e.target.value }))}
                      className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <div>
                      <div className="font-medium text-white">Volt Yellow Slashes</div>
                      <div className="text-[10px] text-slate-400 font-mono">{config.accentColor}</div>
                    </div>
                  </div>
                </div>

                {/* Neon Rim Cyan */}
                <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.primaryGlow}
                      onChange={(e) => setConfig((prev) => ({ ...prev, primaryGlow: e.target.value }))}
                      className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <div>
                      <div className="font-medium text-white">Neon Cyan Rim & Glow</div>
                      <div className="text-[10px] text-slate-400 font-mono">{config.primaryGlow}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sliders: Light & Animation */}
              <div className="space-y-4">
                <label className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">
                  Atmosphere & Speed
                </label>

                {/* Light Intensity */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Light Intensity</span>
                    <span className="font-mono text-blue-400">{(config.lightIntensity * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={config.lightIntensity}
                    onChange={(e) => setConfig((prev) => ({ ...prev, lightIntensity: parseFloat(e.target.value) }))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>

                {/* Animation Speed */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Animation Speed</span>
                    <span className="font-mono text-blue-400">{config.animationSpeed.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.0"
                    step="0.1"
                    value={config.animationSpeed}
                    onChange={(e) => setConfig((prev) => ({ ...prev, animationSpeed: parseFloat(e.target.value) }))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Gameplay Frame Adjustments */}
              <div className="space-y-4">
                <label className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">
                  Gameplay 16:9 Frame
                </label>

                {/* Vertical Y-Offset */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Vertical Position (Y-Offset)</span>
                    <span className="font-mono text-blue-400">{config.gameplayYOffset}px</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="5"
                    value={config.gameplayYOffset}
                    onChange={(e) => setConfig((prev) => ({ ...prev, gameplayYOffset: parseInt(e.target.value, 10) }))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>

                {/* Frame Width (Keeps 16:9) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Frame Size (16:9 Locked)</span>
                    <span className="font-mono text-blue-400">
                      {config.gameplayWidth} × {config.gameplayHeight}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="960"
                    max="1080"
                    step="10"
                    value={config.gameplayWidth}
                    onChange={(e) => {
                      const w = parseInt(e.target.value, 10);
                      const h = Math.round(w / (16 / 9));
                      setConfig((prev) => ({ ...prev, gameplayWidth: w, gameplayHeight: h }));
                    }}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Effect Toggles */}
              <div className="space-y-2.5">
                <label className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">
                  Enable / Disable Effects
                </label>

                {[
                  {
                    key: 'enableStadiumLights' as const,
                    label: 'Volumetric Stadium Light Beams',
                    desc: 'Sweeping stadium searchlight cones',
                  },
                  {
                    key: 'enableDiagonalSlashes' as const,
                    label: 'Volt Yellow Speed Slashes',
                    desc: 'Energetic geometric sports cuts',
                  },
                  {
                    key: 'enableAtmosphericDust' as const,
                    label: 'Atmospheric Arena Particles',
                    desc: 'Floating dust motes in stadium air',
                  },
                  {
                    key: 'enableCrowdLeds' as const,
                    label: 'Spectators Cheering Sparkles',
                    desc: 'Cheer stick sparkles in bleachers',
                  },
                  {
                    key: 'enableBorderGlow' as const,
                    label: 'Frame Breathing Neon Glow',
                    desc: 'Pulsing outer esports frame border',
                  },
                ].map(({ key, label, desc }) => (
                  <label
                    key={key}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/40 cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="font-medium text-white">{label}</div>
                      <div className="text-[10px] text-slate-400">{desc}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={config[key]}
                      onChange={(e) => setConfig((prev) => ({ ...prev, [key]: e.target.checked }))}
                      className="w-4 h-4 rounded accent-blue-500 cursor-pointer"
                    />
                  </label>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <button
                  onClick={copyConfigJson}
                  className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center justify-center gap-2 transition-colors border border-slate-700/50"
                >
                  {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedJson ? 'Configuration Copied!' : 'Export Config (JSON)'}</span>
                </button>

                <a
                  href="/efootball-overlay/index.html"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center justify-center gap-2 transition-colors border border-slate-700/50"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                  <span>Open Standalone HTML File</span>
                </a>

                <button
                  onClick={() => setConfig(DEFAULT_CONFIG)}
                  className="w-full py-2 px-3 rounded-lg bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Default Colors & Speeds</span>
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* ====================================================================
          SETUP GUIDE MODAL (OBS Studio & TikTok LIVE Studio)
          ==================================================================== */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-xl w-full p-6 space-y-5 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Tv className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Streaming Setup Guide</h3>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-slate-300">
              <div>
                <h4 className="font-semibold text-white mb-1.5 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-mono">
                    1
                  </span>
                  Setup di OBS Studio (Browser Source)
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-2">
                  <li>Atur resolusi Base Canvas OBS ke <strong>1080 × 1920 (Portrait)</strong>.</li>
                  <li>Di panel <strong>Sources</strong>, klik <strong>+</strong> lalu pilih <strong>Browser</strong>.</li>
                  <li>Bisa centang <em>Local file</em> dan arahkan ke file <code>efootball-overlay/index.html</code>, atau paste URL dengan parameter <code>?stream=1</code>.</li>
                  <li>Isi <strong>Width: 1080</strong>, <strong>Height: 1920</strong>.</li>
                  <li>Letakkan sumber <em>Game Capture</em> eFootball di bawah lapisan overlay.</li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-1.5 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-mono">
                    2
                  </span>
                  Setup di TikTok LIVE Studio
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-2">
                  <li>Pilih template tata letak Portrait 9:16.</li>
                  <li>Klik <strong>Add Source (+)</strong> &rarr; pilih <strong>Link / Web</strong>.</li>
                  <li>Atur resolusi ke 1080 × 1920.</li>
                  <li>Area bawah sengaja dibuat gelap dan lapang agar chat asli TikTok LIVE terbaca dengan kontras maksimal.</li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-1.5 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-mono">
                    3
                  </span>
                  Tombol Pintas Keyboard (Streamer Hotkeys)
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Goal Strobe FX</span>
                    <kbd className="px-1.5 py-0.5 bg-black/60 rounded text-[10px] font-mono text-amber-300">G</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Stadium Flash</span>
                    <kbd className="px-1.5 py-0.5 bg-black/60 rounded text-[10px] font-mono text-blue-300">F</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Toggle Lampu</span>
                    <kbd className="px-1.5 py-0.5 bg-black/60 rounded text-[10px] font-mono text-slate-300">L</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Brightness (- / +)</span>
                    <div className="flex gap-1">
                      <kbd className="px-1 py-0.5 bg-black/60 rounded text-[10px] font-mono text-slate-300">[</kbd>
                      <kbd className="px-1 py-0.5 bg-black/60 rounded text-[10px] font-mono text-slate-300">]</kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Neon Border Glow</span>
                    <kbd className="px-1.5 py-0.5 bg-black/60 rounded text-[10px] font-mono text-slate-300">B</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Slashes Kuning</span>
                    <kbd className="px-1.5 py-0.5 bg-black/60 rounded text-[10px] font-mono text-slate-300">S</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Panduan Lapangan</span>
                    <kbd className="px-1.5 py-0.5 bg-black/60 rounded text-[10px] font-mono text-slate-300">P</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Preset Warna (1-4)</span>
                    <kbd className="px-1.5 py-0.5 bg-black/60 rounded text-[10px] font-mono text-slate-300">1-4</kbd>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-1.5 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-mono">
                    4
                  </span>
                  Pasang Panel Remote di OBS (Custom Browser Dock)
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-2">
                  <li>Di menu atas OBS Studio, klik <strong>Docks</strong> &rarr; pilih <strong>Custom Browser Docks...</strong></li>
                  <li>Di kolom <em>Dock Name</em>, ketik <code>eFootball Remote</code>.</li>
                  <li>Di kolom <em>URL</em>, masukkan alamat panel: <code>{window.location.origin}/?view=panel</code></li>
                  <li>Klik <strong>Apply</strong>. Panel Stream Deck akan langsung muncul dan menempel di dalam OBS Studio Anda!</li>
                </ol>
              </div>

              <div className="p-3 bg-blue-950/40 border border-blue-800/50 rounded-lg text-blue-200">
                <strong>Tips Transparansi:</strong> Area gameplay 16:9 berstatus 100% transparan murni, tanpa background warna yang menutupi game Anda.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={copyObsUrlToClipboard}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Salin URL OBS</span>
              </button>
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
