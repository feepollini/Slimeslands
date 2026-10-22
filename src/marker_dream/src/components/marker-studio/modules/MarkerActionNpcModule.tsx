import React, { useState } from 'react';
import { MarkerModuleCommonProps } from '../types';
import {
  ActionNpcConfig,
  ActionNpcRole,
  ActionNpcProjectileType,
} from '../../../types/map';
import {
  DEFAULT_ACTION_NPC_CONFIG,
  DEFAULT_ATTACK_CONFIGS,
  isSlimeMarker,
} from '../../../utils/npcActionEngine';
import { Swords, Eye, ShieldAlert, Sparkles, MessageSquare, Zap, Crosshair, Heart } from 'lucide-react';
import { AttackAssetSelector } from './AttackAssetSelector';

export const MarkerActionNpcModule: React.FC<MarkerModuleCommonProps> = ({
  marker,
  onUpdateMarker,
  project,
  galleryAssets,
}) => {
  const cfg: ActionNpcConfig = marker.actionNpc || {
    ...DEFAULT_ACTION_NPC_CONFIG,
    enabled: false,
    spawnOrigin: { x: marker.x, y: marker.y },
  };

  const updateCfg = (updates: Partial<ActionNpcConfig>) => {
    onUpdateMarker(marker.id, {
      actionNpc: {
        ...cfg,
        ...updates,
      },
    });
  };

  const attacks = cfg.attacks || DEFAULT_ACTION_NPC_CONFIG.attacks;

  const updateAttacks = (attackUpdates: Partial<typeof attacks>) => {
    updateCfg({
      attacks: {
        ...attacks,
        ...attackUpdates,
      },
    });
  };

  const roles: { id: ActionNpcRole; label: string; icon: string; desc: string }[] = [
    { id: 'hostile', label: 'Hostil', icon: '⚔️', desc: 'Ataca intrusos no território' },
    { id: 'guardian', label: 'Guardião', icon: '🛡️', desc: 'Defende a base e reage a brigas' },
    { id: 'peaceful', label: 'Pacífico', icon: '🕊️', desc: 'Tranquilo, foge se presenciar brigas' },
    { id: 'curious', label: 'Curioso', icon: '🔍', desc: 'Aproxima-se do herói e conversa' },
    { id: 'coward', label: 'Covarde', icon: '🐔', desc: 'Foge apavorado e espalha pânico' },
    { id: 'custom', label: 'Personalizado', icon: '⚙️', desc: 'Ajuste fino de todos os parâmetros' },
  ];

  const projectileTypes: { id: ActionNpcProjectileType; label: string; icon: string }[] = [
    { id: 'magic_orb', label: 'Orbe Mágica', icon: '🔮' },
    { id: 'fireball', label: 'Bola de Fogo', icon: '🔥' },
    { id: 'arrow', label: 'Flecha', icon: '🏹' },
    { id: 'rock', label: 'Pedra', icon: '🪨' },
    { id: 'knife', label: 'Adaga', icon: '🗡️' },
    { id: 'energy_beam', label: 'Raio Cósmico', icon: '⚡' },
    { id: 'custom', label: 'Customizado (PNG)', icon: '🖼️' },
  ];

  return (
    <div className="space-y-3.5">
      {/* 1. Header com Master Switch do Modo Action NPC */}
      <div className="p-3 bg-gradient-to-r from-red-950/40 via-slate-950 to-amber-950/30 border border-red-500/40 rounded-xl space-y-2.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30">
              <Swords className="w-4 h-4" />
            </span>
            <div>
              <div className="text-xs font-bold text-red-200">Modalidade Action NPC</div>
              <div className="text-[10px] text-slate-400">Inteligência autônoma, combate procedural e emoções</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const nextEnabled = !cfg.enabled;
              updateCfg({
                enabled: nextEnabled,
                spawnOrigin: cfg.spawnOrigin || { x: marker.x, y: marker.y },
              });
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm ${
              cfg.enabled
                ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-red-500/20 border border-red-400'
                : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {cfg.enabled ? '🔴 Ativo' : '⚪ Inativo'}
          </button>
        </div>

        {cfg.enabled && (
          <div className="pt-2 border-t border-slate-800/80 space-y-2 text-[11px]">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                <span>Vida Máxima (HP):</span>
                <input
                  type="number"
                  min={10}
                  max={9999}
                  value={cfg.maxHealth || 100}
                  onChange={(e) => {
                    const val = Math.max(10, parseInt(e.target.value) || 100);
                    updateCfg({ maxHealth: val, health: val });
                  }}
                  className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono text-rose-300 font-bold focus:border-rose-400 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-1.5 text-slate-400">
                <span className="text-[10px]">Origem Spawn:</span>
                <span className="font-mono text-amber-300 text-[10px]">
                  X:{Math.round(cfg.spawnOrigin?.x ?? marker.x)} Y:{Math.round(cfg.spawnOrigin?.y ?? marker.y)}
                </span>
              </div>
            </div>

            {/* Regra de Respawn (ao ser Escaneado ou Derrotado) */}
            <div className="p-2 rounded-lg bg-slate-950/90 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                  🔄 Regra de Respawn (Ao Escanear / Morrer):
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateCfg({ respawnMode: 'timed' })}
                    className={`px-2 py-0.5 rounded text-[9.5px] font-bold border transition-all cursor-pointer ${
                      (cfg.respawnMode || 'timed') === 'timed'
                        ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    ⏱️ Por Tempo
                  </button>
                  <button
                    type="button"
                    onClick={() => updateCfg({ respawnMode: 'never' })}
                    className={`px-2 py-0.5 rounded text-[9.5px] font-bold border transition-all cursor-pointer ${
                      cfg.respawnMode === 'never'
                        ? 'bg-rose-500/25 border-rose-400 text-rose-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    🚫 Único (Sem Respawn)
                  </button>
                </div>
              </div>

              {(cfg.respawnMode || 'timed') === 'timed' && (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[10px] text-slate-400">Tempo p/ Reaparecer:</span>
                  <div className="flex items-center gap-1">
                    {[10, 20, 25, 45, 60].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => updateCfg({ respawnTimeSeconds: sec })}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border cursor-pointer ${
                          (cfg.respawnTimeSeconds ?? 25) === sec
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                    <input
                      type="number"
                      min={3}
                      max={600}
                      value={cfg.respawnTimeSeconds ?? 25}
                      onChange={(e) =>
                        updateCfg({ respawnTimeSeconds: Math.max(3, parseInt(e.target.value) || 25) })
                      }
                      className="w-12 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-right font-mono text-[10px] text-amber-300 font-bold"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {cfg.enabled && (
        <>
          {/* 2. Personalidade & Papel Inicial */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <label className="text-[10px] font-bold text-amber-200 uppercase tracking-wider block">
              Comportamento Base (Personalidade):
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {roles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    let atkUpdates = { ...attacks };
                    // Ajuste de preset inteligente
                    if (r.id === 'peaceful' || r.id === 'coward') {
                      atkUpdates = {
                        jump: { ...DEFAULT_ATTACK_CONFIGS.jump, enabled: false },
                        dash: { ...DEFAULT_ATTACK_CONFIGS.dash, enabled: false },
                        hackSlash: { ...DEFAULT_ATTACK_CONFIGS.hackSlash, enabled: false },
                        ranged: { ...DEFAULT_ATTACK_CONFIGS.ranged, enabled: false },
                      };
                    } else if (r.id === 'hostile' || r.id === 'guardian') {
                      atkUpdates = {
                        jump: { ...DEFAULT_ATTACK_CONFIGS.jump, enabled: true },
                        dash: { ...DEFAULT_ATTACK_CONFIGS.dash, enabled: true },
                        hackSlash: { ...DEFAULT_ATTACK_CONFIGS.hackSlash, enabled: true },
                        ranged: { ...DEFAULT_ATTACK_CONFIGS.ranged, enabled: attacks.ranged?.enabled ?? false },
                      };
                    }
                    updateCfg({
                      role: r.id,
                      attacks: atkUpdates,
                      fleeOnWitnessCombat: r.id === 'peaceful' || r.id === 'coward',
                    });
                  }}
                  className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center gap-1 transition-all cursor-pointer ${
                    cfg.role === r.id
                      ? 'bg-amber-500/20 border-amber-400 text-amber-100 font-bold shadow-xs'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-base">{r.icon}</span>
                  <span className="text-[11px] leading-tight">{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Áreas de Percepção (Raio Interno de Detecção e Raio Sensorial Maior) */}
          <div className="p-3 bg-slate-950 border border-indigo-500/30 rounded-xl space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
              <Eye className="w-4 h-4 text-indigo-400" />
              <span>Áreas de Percepção & Sensores</span>
            </div>

            {/* Raio Interno de Detecção */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span>Raio Interno de Detecção (Combate):</span>
                </span>
                <span className="font-mono text-red-300 font-bold">{cfg.detectionRadius || 110}px</span>
              </div>
              <input
                type="range"
                min={40}
                max={300}
                step={10}
                value={cfg.detectionRadius || 110}
                onChange={(e) => updateCfg({ detectionRadius: Number(e.target.value) })}
                className="w-full accent-red-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex gap-1">
                {[60, 90, 110, 150, 220].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => updateCfg({ detectionRadius: d })}
                    className={`flex-1 py-0.5 text-[9px] rounded border transition-colors cursor-pointer ${
                      (cfg.detectionRadius || 110) === d
                        ? 'bg-red-500/30 border-red-400 text-red-200 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {d}px
                  </button>
                ))}
              </div>
            </div>

            {/* Raio Sensorial Maior */}
            <div className="space-y-1.5 pt-2 border-t border-slate-850">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span>Raio Sensorial Maior (Mundo & Emoções):</span>
                </span>
                <span className="font-mono text-cyan-300 font-bold">{cfg.sensoryRadius || 260}px</span>
              </div>
              <input
                type="range"
                min={120}
                max={600}
                step={20}
                value={cfg.sensoryRadius || 260}
                onChange={(e) => updateCfg({ sensoryRadius: Number(e.target.value) })}
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex gap-1">
                {[180, 260, 340, 450].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => updateCfg({ sensoryRadius: d })}
                    className={`flex-1 py-0.5 text-[9px] rounded border transition-colors cursor-pointer ${
                      (cfg.sensoryRadius || 260) === d
                        ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {d}px
                  </button>
                ))}
              </div>
            </div>

            {/* Distância Máxima do Spawn (Leash) */}
            <div className="space-y-1.5 pt-2 border-t border-slate-850">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Limite de Território do Spawn (Leash):</span>
                </span>
                <span className="font-mono text-amber-300 font-bold">{cfg.leashDistance || 340}px</span>
              </div>
              <input
                type="range"
                min={100}
                max={800}
                step={25}
                value={cfg.leashDistance || 340}
                onChange={(e) => updateCfg({ leashDistance: Number(e.target.value) })}
                className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Velocidade de Movimento / Perseguição em Combate */}
            <div className="space-y-1.5 pt-2 border-t border-slate-850">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Velocidade de Movimento / Perseguição:</span>
                </span>
                <span className="font-mono text-emerald-300 font-bold">{cfg.moveSpeed || 85} px/s</span>
              </div>
              <input
                type="range"
                min={30}
                max={220}
                step={5}
                value={cfg.moveSpeed || 85}
                onChange={(e) => updateCfg({ moveSpeed: Number(e.target.value) })}
                className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex gap-1">
                {[50, 75, 95, 130, 175].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => updateCfg({ moveSpeed: s })}
                    className={`flex-1 py-0.5 text-[9px] rounded border transition-colors cursor-pointer ${
                      (cfg.moveSpeed || 85) === s
                        ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {s}px/s
                  </button>
                ))}
              </div>
            </div>

            {/* 3.1 Estilo de Locomoção & Animação (Slime Hop vs Bípede/Humanoide) */}
            <div className="space-y-1.5 pt-2 border-t border-slate-850">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-lime-400" />
                  <span>Estilo de Locomoção & Movimento:</span>
                </span>
                <span className="font-mono text-lime-300 text-[10px] font-bold">
                  {cfg.locomotionStyle === 'slime_hop'
                    ? '🟢 Slime Hop (Pulo Contínuo)'
                    : cfg.locomotionStyle === 'biped'
                    ? '🚶 Bípede (Humanoide)'
                    : isSlimeMarker(marker)
                    ? '🟢 Slime Hop (Detectado)'
                    : '🚶 Bípede (Detectado)'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'auto', label: '⚙️ Auto-detectar', desc: 'Identifica slime pelo nome, categoria ou PNG' },
                  { id: 'slime_hop', label: '🟢 Pulinho Slime', desc: 'Pula continuamente ao andar e salta no ataque' },
                  { id: 'biped', label: '🚶 Bípede / Passos', desc: 'Passos normais com os pés no chão' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => updateCfg({ locomotionStyle: mode.id as any })}
                    className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                      (cfg.locomotionStyle || 'auto') === mode.id
                        ? 'bg-lime-500/25 border-lime-400 text-lime-200 font-bold shadow-xs'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                    title={mode.desc}
                  >
                    <div className="text-[10px] truncate">{mode.label}</div>
                  </button>
                ))}
              </div>
              {isSlimeMarker(marker) && (
                <div className="text-[10px] text-lime-300/90 bg-lime-950/40 p-2 rounded-lg border border-lime-500/30 leading-relaxed">
                  🧪 <strong>Física de Slime Ativa:</strong> Este NPC desloca-se pulando elasticamente como um slime real (sem animação de pernas humanas) e desfere o <strong>Ataque de Salto Esmagador (Body Slam)</strong> caindo em cima do jogador com SPLAT e onda de choque!
                </div>
              )}
            </div>
          </div>

          {/* 4. Tipos de Ataques Selecionáveis (Individuais ou Simultâneos) */}
          <div className="p-3 bg-slate-950 border border-rose-500/30 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300">
                <Zap className="w-4 h-4 text-rose-400" />
                <span>Tipos de Ataque (Combinação Livre)</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {[attacks.jump?.enabled, attacks.dash?.enabled, attacks.hackSlash?.enabled, attacks.ranged?.enabled].filter(Boolean).length}/4 ativos
              </span>
            </div>

            <div className="space-y-2.5">
              {/* ATAQUE 1: PULO */}
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <span>🦘</span>
                    <span>Pulo (Salto de Impacto no Pouso)</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={!!attacks.jump?.enabled}
                    onChange={(e) => {
                      const cur = attacks.jump || DEFAULT_ATTACK_CONFIGS.jump;
                      updateAttacks({ jump: { ...cur, enabled: e.target.checked } });
                    }}
                    className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                  />
                </div>

                {attacks.jump?.enabled && (
                  <>
                    <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-800 text-[10px]">
                      <div>
                        <span className="text-slate-400 block mb-0.5">Dano (HP):</span>
                        <input
                          type="number"
                          min={1}
                          value={attacks.jump.damage || 18}
                          onChange={(e) => {
                            const cur = attacks.jump!;
                            updateAttacks({ jump: { ...cur, damage: Number(e.target.value) } });
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-rose-300 font-bold font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Duração (s):</span>
                        <input
                          type="number"
                          step={0.05}
                          min={0.2}
                          max={5}
                          value={attacks.jump.durationSec ?? 0.85}
                          onChange={(e) => {
                            const cur = attacks.jump!;
                            updateAttacks({ jump: { ...cur, durationSec: Number(e.target.value) } });
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-amber-300 font-mono font-bold"
                          title="Duração visual do salto / animação de ataque"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Recarga (s):</span>
                        <input
                          type="number"
                          step={0.5}
                          min={0.5}
                          value={attacks.jump.cooldown || 3.5}
                          onChange={(e) => {
                            const cur = attacks.jump!;
                            updateAttacks({ jump: { ...cur, cooldown: Number(e.target.value) } });
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-slate-300 font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Altura (px):</span>
                        <input
                          type="number"
                          min={30}
                          max={180}
                          value={attacks.jump.jumpHeight || 75}
                          onChange={(e) => {
                            const cur = attacks.jump!;
                            updateAttacks({ jump: { ...cur, jumpHeight: Number(e.target.value) } });
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-slate-300 font-mono"
                        />
                      </div>
                    </div>

                    {/* Asset dedicado do Pulo */}
                    <AttackAssetSelector
                      label="Asset Visual do Pulo / Salto (Vídeo, Motion ou PNG)"
                      attackType="jump"
                      attackDurationSec={attacks.jump.durationSec || 0.85}
                      attackAsset={attacks.jump.attackAsset}
                      onChange={(asset) => {
                        const cur = attacks.jump!;
                        updateAttacks({ jump: { ...cur, attackAsset: asset } });
                      }}
                      availableAssets={galleryAssets || project?.galleryAssets}
                    />
                  </>
                )}
              </div>

              {/* ATAQUE 2: DASH */}
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <span>⚡</span>
                    <span>Dash (Investida Rápida com Contato)</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={!!attacks.dash?.enabled}
                    onChange={(e) => {
                      const cur = attacks.dash || DEFAULT_ATTACK_CONFIGS.dash;
                      updateAttacks({ dash: { ...cur, enabled: e.target.checked } });
                    }}
                    className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                  />
                </div>

                {attacks.dash?.enabled && (
                  <>
                    <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-800 text-[10px]">
                      <div>
                        <span className="text-slate-400 block mb-0.5">Dano (HP):</span>
                        <input
                          type="number"
                          min={1}
                          value={attacks.dash.damage || 15}
                          onChange={(e) => {
                            const cur = attacks.dash!;
                            updateAttacks({ dash: { ...cur, damage: Number(e.target.value) } });
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-rose-300 font-bold font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Duração (s):</span>
                        <input
                          type="number"
                          step={0.05}
                          min={0.2}
                          max={4}
                          value={attacks.dash.durationSec ?? 0.65}
                          onChange={(e) => {
                            const cur = attacks.dash!;
                            updateAttacks({ dash: { ...cur, durationSec: Number(e.target.value) } });
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-amber-300 font-mono font-bold"
                          title="Duração visual do avanço rápido"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Recarga (s):</span>
                        <input
                          type="number"
                          step={0.5}
                          min={0.5}
                          value={attacks.dash.cooldown || 2.5}
                          onChange={(e) => {
                            const cur = attacks.dash!;
                            updateAttacks({ dash: { ...cur, cooldown: Number(e.target.value) } });
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-slate-300 font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Distância (px):</span>
                        <input
                          type="number"
                          min={40}
                          max={300}
                          value={attacks.dash.dashDistance || 130}
                          onChange={(e) => {
                            const cur = attacks.dash!;
                            updateAttacks({ dash: { ...cur, dashDistance: Number(e.target.value) } });
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-slate-300 font-mono"
                        />
                      </div>
                    </div>

                    {/* Asset dedicado do Dash */}
                    <AttackAssetSelector
                      label="Asset Visual do Dash (Vídeo, Motion ou PNG)"
                      attackType="dash"
                      attackDurationSec={attacks.dash.durationSec || 0.65}
                      attackAsset={attacks.dash.attackAsset}
                      onChange={(asset) => {
                        const cur = attacks.dash!;
                        updateAttacks({ dash: { ...cur, attackAsset: asset } });
                      }}
                      availableAssets={galleryAssets || project?.galleryAssets}
                    />
                  </>
                )}
              </div>

              {/* ATAQUE 3: HACK AND SLASH */}
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <span>🗡️</span>
                    <span>Hack and Slash (Golpe Corporal Curto)</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={!!attacks.hackSlash?.enabled}
                    onChange={(e) => {
                      const cur = attacks.hackSlash || DEFAULT_ATTACK_CONFIGS.hackSlash;
                      updateAttacks({ hackSlash: { ...cur, enabled: e.target.checked } });
                    }}
                    className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                  />
                </div>

                {attacks.hackSlash?.enabled && (
                  <>
                    <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-800 text-[10px]">
                      <div>
                        <span className="text-slate-400 block mb-0.5">Dano (HP):</span>
                        <input
                          type="number"
                          min={1}
                          value={attacks.hackSlash.damage || 12}
                          onChange={(e) => {
                            const cur = attacks.hackSlash!;
                            updateAttacks({ hackSlash: { ...cur, damage: Number(e.target.value) } });
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-rose-300 font-bold font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Duração (s):</span>
                        <input
                          type="number"
                          step={0.05}
                          min={0.2}
                          max={4}
                          value={attacks.hackSlash.durationSec ?? 0.75}
                          onChange={(e) => {
                            const cur = attacks.hackSlash!;
                            updateAttacks({ hackSlash: { ...cur, durationSec: Number(e.target.value) } });
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-amber-300 font-mono font-bold"
                          title="Duração visual do golpe / animação de corte"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Recarga (s):</span>
                        <input
                          type="number"
                          step={0.2}
                          min={0.4}
                          value={attacks.hackSlash.cooldown || 1.4}
                          onChange={(e) => {
                            const cur = attacks.hackSlash!;
                            updateAttacks({ hackSlash: { ...cur, cooldown: Number(e.target.value) } });
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-slate-300 font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Alcance (px):</span>
                        <input
                          type="number"
                          min={30}
                          max={120}
                          value={attacks.hackSlash.range || 60}
                          onChange={(e) => {
                            const cur = attacks.hackSlash!;
                            updateAttacks({ hackSlash: { ...cur, range: Number(e.target.value) } });
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-slate-300 font-mono"
                        />
                      </div>
                    </div>

                    {/* Asset dedicado do Hack and Slash */}
                    <AttackAssetSelector
                      label="Asset Visual do Golpe / Corte (Vídeo, Motion ou PNG)"
                      attackType="hackSlash"
                      attackDurationSec={attacks.hackSlash.durationSec || 0.75}
                      attackAsset={attacks.hackSlash.attackAsset}
                      onChange={(asset) => {
                        const cur = attacks.hackSlash!;
                        updateAttacks({ hackSlash: { ...cur, attackAsset: asset } });
                      }}
                      availableAssets={galleryAssets || project?.galleryAssets}
                    />
                  </>
                )}
              </div>

              {/* ATAQUE 4: À DISTÂNCIA (RANGED + PROJÉTIL PERSONALIZÁVEL) */}
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <span>🏹</span>
                    <span>À Distância (Projéteis Personalizáveis)</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={!!attacks.ranged?.enabled}
                    onChange={(e) => {
                      const cur = attacks.ranged || DEFAULT_ATTACK_CONFIGS.ranged;
                      updateAttacks({ ranged: { ...cur, enabled: e.target.checked } });
                    }}
                    className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                  />
                </div>

                {attacks.ranged?.enabled && (
                  <div className="space-y-2 pt-1 border-t border-slate-800 text-[10px]">
                    <div className="grid grid-cols-5 gap-2">
                      <div>
                        <span className="text-slate-400 block mb-0.5">Dano (HP):</span>
                        <input
                          type="number"
                          min={1}
                          value={attacks.ranged.damage || 16}
                          onChange={(e) => {
                            const cur = attacks.ranged!;
                            updateAttacks({ ranged: { ...cur, damage: Number(e.target.value) } });
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-rose-300 font-bold font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Duração (s):</span>
                        <input
                          type="number"
                          step={0.05}
                          min={0.2}
                          max={4}
                          value={attacks.ranged.durationSec ?? 0.50}
                          onChange={(e) => {
                            const cur = attacks.ranged!;
                            updateAttacks({ ranged: { ...cur, durationSec: Number(e.target.value) } });
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-amber-300 font-mono font-bold"
                          title="Duração visual da animação de disparo"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Recarga (s):</span>
                        <input
                          type="number"
                          step={0.2}
                          min={0.5}
                          value={attacks.ranged.cooldown || 2.8}
                          onChange={(e) => {
                            const cur = attacks.ranged!;
                            updateAttacks({ ranged: { ...cur, cooldown: Number(e.target.value) } });
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-slate-300 font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Alcance (px):</span>
                        <input
                          type="number"
                          min={80}
                          max={600}
                          value={attacks.ranged.range || 260}
                          onChange={(e) => {
                            const cur = attacks.ranged!;
                            updateAttacks({ ranged: { ...cur, range: Number(e.target.value) } });
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-slate-300 font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Vel. Disparo:</span>
                        <input
                          type="number"
                          step={25}
                          min={150}
                          max={1200}
                          value={attacks.ranged.projectileSpeed || 520}
                          onChange={(e) => {
                            const cur = attacks.ranged!;
                            updateAttacks({ ranged: { ...cur, projectileSpeed: Number(e.target.value) } });
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-cyan-300 font-bold font-mono"
                        />
                      </div>
                    </div>

                    {/* Asset dedicado do Projétil / Disparo à distância */}
                    <AttackAssetSelector
                      label="Asset do Projétil (Vídeo com Chroma, Motion ou PNG)"
                      attackType="ranged"
                      attackDurationSec={attacks.ranged.durationSec || 0.50}
                      attackAsset={attacks.ranged.attackAsset}
                      onChange={(asset) => {
                        const cur = attacks.ranged!;
                        updateAttacks({ ranged: { ...cur, attackAsset: asset } });
                      }}
                      availableAssets={galleryAssets || project?.galleryAssets}
                    />

                    {/* Seletor de Tipo de Projétil Nativo (caso não use asset dedicado) */}
                    {!attacks.ranged.attackAsset && (
                      <div className="space-y-1">
                        <span className="text-slate-300 font-semibold block">Tipo do Projétil Procedural:</span>
                        <div className="grid grid-cols-4 gap-1">
                          {projectileTypes.map((pt) => (
                            <button
                              key={pt.id}
                              type="button"
                              onClick={() => {
                                const cur = attacks.ranged!;
                                updateAttacks({ ranged: { ...cur, projectileType: pt.id } });
                              }}
                              className={`p-1.5 rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                                (attacks.ranged?.projectileType || 'magic_orb') === pt.id
                                  ? 'bg-rose-500/30 border-rose-400 text-rose-200 font-bold'
                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              <span className="text-sm">{pt.icon}</span>
                              <span className="text-[8px] text-center leading-tight truncate w-full">{pt.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Campo para Imagem PNG Customizada do Projétil */}
                    {attacks.ranged.projectileType === 'custom' && (
                      <div className="space-y-1 pt-1 border-t border-slate-800">
                        <span className="text-slate-400 block">URL ou DataURL da Imagem PNG do Projétil:</span>
                        <input
                          type="text"
                          placeholder="https://... ou data:image/png..."
                          value={attacks.ranged.projectileCustomUrl || ''}
                          onChange={(e) => {
                            const cur = attacks.ranged!;
                            updateAttacks({ ranged: { ...cur, projectileCustomUrl: e.target.value } });
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:border-rose-400 outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 5. Falas do Balão (Até 3 Frases) */}
          <div className="p-3 bg-slate-950 border border-amber-500/30 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-amber-300">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <span>Balões de Fala (Até 3 frases personalizáveis)</span>
              </span>
            </div>

            <div className="space-y-1.5">
              {[0, 1, 2].map((idx) => {
                const phrase = (cfg.speechPhrases || [])[idx] || '';
                return (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 font-mono w-4">#{idx + 1}</span>
                    <input
                      type="text"
                      placeholder={`Frase ${idx + 1} do balão...`}
                      value={phrase}
                      onChange={(e) => {
                        const nextPhrases: [string?, string?, string?] = [
                          cfg.speechPhrases?.[0] || '',
                          cfg.speechPhrases?.[1] || '',
                          cfg.speechPhrases?.[2] || '',
                        ];
                        nextPhrases[idx] = e.target.value;
                        updateCfg({ speechPhrases: nextPhrases });
                      }}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* 6. Sistema Procedural de Emoções & Comportamentos Coletivos */}
          <div className="p-3 bg-slate-950 border border-purple-500/30 rounded-xl space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Sistema Procedural de Emoções & Consequências Reais</span>
            </div>

            <div className="space-y-2 text-[11px]">
              {/* Retaliação ao dano */}
              <label className="flex items-center justify-between p-2 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer">
                <span className="text-slate-300">Contra-atacar ao sofrer dano (Muda para Hostil):</span>
                <input
                  type="checkbox"
                  checked={cfg.retaliateOnHit !== false}
                  onChange={(e) => updateCfg({ retaliateOnHit: e.target.checked })}
                  className="w-4 h-4 accent-purple-500 rounded cursor-pointer"
                />
              </label>

              {/* Fuga ao presenciar luta */}
              <label className="flex items-center justify-between p-2 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer">
                <span className="text-slate-300">Fugir e entrar em Pânico ao presenciar confrontos:</span>
                <input
                  type="checkbox"
                  checked={cfg.fleeOnWitnessCombat !== false}
                  onChange={(e) => updateCfg({ fleeOnWitnessCombat: e.target.checked })}
                  className="w-4 h-4 accent-purple-500 rounded cursor-pointer"
                />
              </label>

              {/* Propagação de medo coletivo */}
              <label className="flex items-center justify-between p-2 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer">
                <span className="text-slate-300">Propagar medo coletivo para outros NPCs vizinhos:</span>
                <input
                  type="checkbox"
                  checked={cfg.propagateFear !== false}
                  onChange={(e) => updateCfg({ propagateFear: e.target.checked })}
                  className="w-4 h-4 accent-purple-500 rounded cursor-pointer"
                />
              </label>

              {/* Aproximação espontânea */}
              <label className="flex items-center justify-between p-2 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer">
                <span className="text-slate-300">Aproximar-se espontaneamente do jogador quando calmo:</span>
                <input
                  type="checkbox"
                  checked={cfg.spontaneousPlayerApproach !== false}
                  onChange={(e) => updateCfg({ spontaneousPlayerApproach: e.target.checked })}
                  className="w-4 h-4 accent-purple-500 rounded cursor-pointer"
                />
              </label>

              {/* Camada visual anime */}
              <label className="flex items-center justify-between p-2 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer">
                <span className="text-slate-300 flex items-center gap-1">
                  <span>Camada visual de anime (💢, 💧, ❗, ❓, ✨):</span>
                </span>
                <input
                  type="checkbox"
                  checked={cfg.showAnimeEmotes !== false}
                  onChange={(e) => updateCfg({ showAnimeEmotes: e.target.checked })}
                  className="w-4 h-4 accent-purple-500 rounded cursor-pointer"
                />
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
