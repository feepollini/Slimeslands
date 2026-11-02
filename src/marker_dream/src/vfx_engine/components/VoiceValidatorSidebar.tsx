import React, { useEffect, useState } from 'react';
import {
  Check,
  ChevronRight,
  Copy,
  Play,
  RefreshCw,
  Sliders,
  ThumbsDown,
  ThumbsUp,
  Volume2,
} from 'lucide-react';
import {
  PersonalityVoiceProfile,
  treeChatVoiceManager,
} from '../extra_modules/TreeChatVoice';
import {
  loadFishAudioGallery,
  stripFishAudioTags,
} from '../extra_modules/FishAudioStudio';
import { SlimeActor } from '../vfx/types';
import { TreeChatEmotionId } from '../vfx/modules/treeChatProceduralStatsModule';

interface VoiceValidatorSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  slimes: SlimeActor[];
  onVoiceChange?: () => void;
}

const PREVIEW_EMOTIONS: Array<{ id: TreeChatEmotionId; label: string; phrase: string }> = [
  { id: 'divertido', label: '😄 Divertido (Lilli prilili)', phrase: 'Lilli prilili! Bloob litli!' },
  { id: 'exagerado_divertido', label: '🤩 Eufórico (Globeryss)', phrase: 'Globeryss! Wubba zulu!' },
  { id: 'furioso', label: '😡 Furioso (Graaaanini)', phrase: 'Graaaanini! Vrrrakash!' },
  { id: 'ultra_furioso', label: '🤬 Fúria Extrema (Ig graniii)', phrase: 'Ig graniiiiii lilil! Zorba klin!' },
  { id: 'desinteressado', label: '😴 Entediado (Fluff fluff)', phrase: 'Fluff fluff... Meh bloob.' },
  { id: 'curioso', label: '🧐 Curioso (Humm broli?)', phrase: 'Humm broli? Kiki zola?' },
  { id: 'amoroso', label: '😍 Amoroso (Mimi shulala)', phrase: 'Mimi shulala! Luvu prilili!' },
  { id: 'assustado', label: '😱 Assustado (Uwaaa klin!)', phrase: 'Uwaaa klin! Eeeek bobo!' },
];

export const VoiceValidatorSidebar: React.FC<VoiceValidatorSidebarProps> = ({
  isOpen,
  onToggle,
  slimes,
  onVoiceChange,
}) => {
  const [, setTick] = useState(0);
  const [selectedEmotion, setSelectedEmotion] = useState<TreeChatEmotionId>('divertido');
  const [filterMode, setFilterMode] = useState<'all' | 'creatures' | 'approved' | 'disliked'>('all');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [expandedTuneId, setExpandedTuneId] = useState<string | null>(null);
  const [copiedDisliked, setCopiedDisliked] = useState(false);

  useEffect(() => {
    const onGalleryUpdated = () => {
      treeChatVoiceManager.syncGalleryVoicesForSlimes(slimes);
      setTick((t) => t + 1);
    };
    window.addEventListener('fish-gallery-updated', onGalleryUpdated);
    return () => window.removeEventListener('fish-gallery-updated', onGalleryUpdated);
  }, [slimes]);

  const galleryItems = loadFishAudioGallery();
  treeChatVoiceManager.syncGalleryVoicesForSlimes(slimes);

  const catalog = treeChatVoiceManager.getVoiceCatalog();
  const dislikedIds = treeChatVoiceManager.getDislikedVoiceIds();
  const approvedCount = catalog.length - dislikedIds.length;
  const creaturesCount = catalog.filter((v) => v.effectType.startsWith('FOFA_')).length;

  const filteredVoices = catalog.filter((v) => {
    const isDisliked = treeChatVoiceManager.isVoiceDisliked(v.voiceId);
    if (filterMode === 'creatures') return v.effectType.startsWith('FOFA_');
    if (filterMode === 'approved') return !isDisliked;
    if (filterMode === 'disliked') return isDisliked;
    return true;
  });

  const handlePlayPreview = (voice: PersonalityVoiceProfile) => {
    const emMeta = PREVIEW_EMOTIONS.find((e) => e.id === selectedEmotion);
    const phraseToSpeak =
      selectedEmotion === 'divertido'
        ? voice.samplePhrase
        : emMeta?.phrase || voice.samplePhrase;

    setPlayingVoiceId(voice.voiceId);
    treeChatVoiceManager.previewVoiceById(voice.voiceId, phraseToSpeak, selectedEmotion);
    setTimeout(() => {
      setPlayingVoiceId((prev) => (prev === voice.voiceId ? null : prev));
    }, 850);
  };

  const handleToggleDislike = (voiceId: string) => {
    treeChatVoiceManager.toggleVoiceDisliked(voiceId);
    setTick((t) => t + 1);
    onVoiceChange?.();
  };

  const handleAssignToSlime = (slimeId: string, voiceId: string) => {
    if (!slimeId) return;
    treeChatVoiceManager.setNpcVoiceOverride(slimeId, voiceId);
    const target = slimes.find((s) => (s.isPlayer ? 'player_slime' : s.id) === slimeId || s.id === slimeId);
    if (target) {
      treeChatVoiceManager.getVoiceProfileForSlime(target, 'divertido');
    }
    setTick((t) => t + 1);
    onVoiceChange?.();
  };

  const handleCopyDisliked = () => {
    if (dislikedIds.length === 0) return;
    navigator.clipboard?.writeText(dislikedIds.join(', ')).catch(() => {});
    setCopiedDisliked(true);
    setTimeout(() => setCopiedDisliked(false), 1800);
  };

  const handleReshuffleGalleryLinks = () => {
    treeChatVoiceManager.syncGalleryVoicesForSlimes(slimes, true);
    setTick((t) => t + 1);
    onVoiceChange?.();
  };

  const handleTestNpcGalleryAudio = (npc: SlimeActor) => {
    const player = slimes.find((s) => s.isPlayer) || slimes[0] || npc;
    treeChatVoiceManager.speakOnOptionSelected(npc, '', 'divertido', player, slimes);
    setTick((t) => t + 1);
    onVoiceChange?.();
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed top-14 right-3 z-30 flex items-center gap-2 px-3 py-2 liquid-glass-elevated chromatic-border-subtle text-white font-mono text-xs font-bold uppercase rounded-xl shadow-2xl transition cursor-pointer"
        title="Abrir Menu Lateral de Áudios da Galeria nos NPCs e Validador de Vozes"
      >
        <Volume2 className="w-4 h-4 text-white" />
        <span>
          Áudios Galeria ({galleryItems.length}) • NPCs ({slimes.length})
        </span>
      </button>
    );
  }

  return (
    <aside className="fixed top-14 right-3 bottom-16 w-88 sm:w-96 liquid-glass-elevated chromatic-border rounded-2xl shadow-2xl z-30 flex flex-col overflow-hidden text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-white/[0.03] border-b border-white/10">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-white shrink-0" />
          <div>
            <h2 className="font-mono font-bold text-xs uppercase text-white tracking-wide">
              Áudios da Galeria nos NPCs ({galleryItems.length})
            </h2>
            <p className="text-[10px] text-zinc-400 font-mono">
              Vinculados de forma automática e random ao ID de cada NPC
            </p>
          </div>
        </div>
        <button
          onClick={onToggle}
          className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded cursor-pointer"
          title="Recolher Menu Lateral"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Live Fish Audio Gallery Generated Audios Linked per NPC ID */}
      <div className="p-2.5 bg-white/[0.02] border-b border-white/10 space-y-2 max-h-60 overflow-y-auto">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono font-bold uppercase text-zinc-200">
            🎙️ {galleryItems.length} Áudios na Galeria → {slimes.length} NPCs
          </span>
          <button
            onClick={handleReshuffleGalleryLinks}
            className="flex items-center gap-1 px-2 py-1 rounded-md btn-liquid-glass text-[10px] font-mono font-semibold text-white cursor-pointer"
            title="Re-sortear todos os áudios gerados da galeria de forma aleatória entre os IDs dos NPCs"
          >
            <RefreshCw className="w-3 h-3" />
            Re-sortear Random
          </button>
        </div>

        {galleryItems.length === 0 ? (
          <div className="p-2 rounded-lg bg-black/40 border border-white/10 text-[10px] text-zinc-400 font-mono">
            Nenhum áudio gerado na galeria ainda. Assim que você gerar áudios no Fish Audio Studio, eles entram automaticamente aqui vinculados ao ID de cada NPC!
          </div>
        ) : (
          <div className="space-y-1.5">
            {slimes.map((npc) => {
              const npcClips = treeChatVoiceManager.getGalleryClipsForNpc(npc, slimes);
              const assign = treeChatVoiceManager.getGalleryAssignmentForNpc(npc.id);
              const nextClip =
                npcClips.length > 0
                  ? npcClips[(assign?.clipCursor ?? 0) % npcClips.length]
                  : null;
              const nextPhrase = nextClip
                ? stripFishAudioTags(nextClip.taggedText)
                : 'Sem áudio';

              return (
                <div
                  key={npc.id}
                  className="p-2 rounded-lg bg-black/50 border border-white/10 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-[11px] truncate">
                        {npc.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono text-zinc-300">
                        ID: {npc.id}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-white/15 text-[9px] font-mono font-bold text-white">
                        {npcClips.length} áudios
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate mt-0.5 font-mono">
                      {nextClip ? `${nextClip.voiceName}: "${nextPhrase}"` : 'Aguardando galeria'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleTestNpcGalleryAudio(npc)}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md btn-monochrome-primary text-[10px] font-mono font-bold cursor-pointer"
                    title="Tocar próximo áudio da galeria vinculado ao ID deste NPC"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    Ouvir
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Emotion Selector & Filter Tabs */}
      <div className="p-2.5 bg-slate-900/50 border-b border-slate-800/80 space-y-2">
        <div>
          <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
            Emoção / Frase Fictícia do Preview:
          </label>
          <select
            value={selectedEmotion}
            onChange={(e) => setSelectedEmotion(e.target.value as TreeChatEmotionId)}
            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] font-mono text-cyan-200 focus:outline-none focus:border-cyan-400"
          >
            {PREVIEW_EMOTIONS.map((em) => (
              <option key={em.id} value={em.id}>
                {em.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-4 gap-1">
          <button
            onClick={() => setFilterMode('all')}
            className={`py-1 rounded font-mono text-[9.5px] font-bold uppercase transition cursor-pointer ${
              filterMode === 'all'
                ? 'bg-cyan-500 text-slate-950'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            Todas ({catalog.length})
          </button>
          <button
            onClick={() => setFilterMode('creatures')}
            className={`py-1 rounded font-mono text-[9.5px] font-bold uppercase transition cursor-pointer ${
              filterMode === 'creatures'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-slate-900 text-amber-300 hover:bg-slate-800'
            }`}
          >
            🐾 Criaturinhas ({creaturesCount})
          </button>
          <button
            onClick={() => setFilterMode('approved')}
            className={`py-1 rounded font-mono text-[9.5px] font-bold uppercase transition cursor-pointer ${
              filterMode === 'approved'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-900 text-emerald-400 hover:bg-slate-800'
            }`}
          >
            👍 Gostei ({approvedCount})
          </button>
          <button
            onClick={() => setFilterMode('disliked')}
            className={`py-1 rounded font-mono text-[9.5px] font-bold uppercase transition cursor-pointer ${
              filterMode === 'disliked'
                ? 'bg-rose-500 text-white'
                : 'bg-slate-900 text-rose-400 hover:bg-slate-800'
            }`}
          >
            👎 Ruim ({dislikedIds.length})
          </button>
        </div>
      </div>

      {/* Disliked Voices Summary Box (if any marked) */}
      {dislikedIds.length > 0 && (
        <div className="px-3 py-2 bg-rose-950/40 border-b border-rose-800/60 flex items-center justify-between gap-2">
          <div className="truncate">
            <span className="text-[10px] font-mono font-bold text-rose-300 uppercase block">
              🚫 Vozes Desativadas ({dislikedIds.length}):
            </span>
            <span className="text-[10px] font-mono text-rose-200 truncate block">
              {dislikedIds.join(', ')}
            </span>
          </div>
          <button
            onClick={handleCopyDisliked}
            className="shrink-0 flex items-center gap-1 px-2 py-1 bg-rose-900/80 hover:bg-rose-800 text-rose-100 rounded text-[10px] font-mono font-bold cursor-pointer"
            title="Copiar IDs das vozes que você não gostou"
          >
            {copiedDisliked ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copiedDisliked ? 'Copiado!' : 'Copiar IDs'}
          </button>
        </div>
      )}

      {/* Scrollable Voice List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {filteredVoices.map((voice) => {
          const isDisliked = treeChatVoiceManager.isVoiceDisliked(voice.voiceId);
          const isPlaying = playingVoiceId === voice.voiceId;
          const isTuning = expandedTuneId === voice.voiceId;

          // Find which slimes currently use this voiceId
          const linkedSlimes = slimes.filter(
            (s) => treeChatVoiceManager.getNpcVoiceId(s) === voice.voiceId
          );

          return (
            <div
              key={voice.voiceId}
              className={`rounded border p-2.5 transition ${
                isDisliked
                  ? 'bg-rose-950/20 border-rose-800/60 opacity-75'
                  : isPlaying
                  ? 'bg-cyan-950/50 border-cyan-400 shadow-lg'
                  : 'bg-slate-900/85 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Top Row: ID + Effect Badge + Like/Dislike */}
              <div className="flex items-start justify-between gap-1.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-1.5 py-0.5 bg-slate-950 border border-cyan-500/40 text-cyan-300 font-mono font-bold text-[10px] rounded">
                      {voice.voiceId}
                    </span>
                    <span className="px-1.5 py-0.5 bg-purple-500/20 border border-purple-400/40 text-purple-200 font-mono text-[9px] rounded">
                      {voice.effectType}
                    </span>
                  </div>
                  <div className="font-bold text-slate-100 text-[11px] mt-1 truncate">
                    {voice.name} — <span className="text-slate-400 font-normal">{voice.toneDescription}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleDislike(voice.voiceId)}
                  className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded font-mono text-[10px] font-bold uppercase border transition cursor-pointer ${
                    isDisliked
                      ? 'bg-rose-600 text-white border-rose-400'
                      : 'bg-emerald-950/70 text-emerald-300 border-emerald-600/60 hover:bg-rose-950/60 hover:text-rose-200 hover:border-rose-500/60'
                  }`}
                  title={
                    isDisliked
                      ? 'Voz marcada como Não Gostei (Desativada na Arena). Clique para reativar.'
                      : 'Clique se você NÃO gostou desta voz para desativá-la e identificá-la'
                  }
                >
                  {isDisliked ? (
                    <>
                      <ThumbsDown className="w-3 h-3" />
                      Não Gostei
                    </>
                  ) : (
                    <>
                      <ThumbsUp className="w-3 h-3" />
                      Ativa
                    </>
                  )}
                </button>
              </div>

              {/* Specs & Sample Phrase */}
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-slate-400">
                <span className="px-1.5 py-0.5 bg-slate-950 rounded">
                  Grave: <strong className="text-amber-300">{Math.round(voice.bassFrequency)}Hz</strong> (+{voice.bassGainDb}dB)
                </span>
                <span className="px-1.5 py-0.5 bg-slate-950 rounded">
                  Pitch: <strong className="text-sky-300">{voice.ttsPitch.toFixed(2)}x</strong>
                </span>
                <span className="px-1.5 py-0.5 bg-slate-950 rounded">
                  RingMod: <strong className="text-fuchsia-300">{Math.round(voice.roboticModFreq)}Hz</strong>
                </span>
              </div>

              {/* Linked NPCs Badge */}
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1">
                  {linkedSlimes.length > 0 ? (
                    linkedSlimes.map((s) => (
                      <span
                        key={s.id}
                        className="px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 font-mono text-[9px] font-bold rounded"
                      >
                        👤 {s.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] font-mono text-slate-500">
                      Disponível no pool procedural
                    </span>
                  )}
                </div>

                <select
                  value=""
                  onChange={(e) => handleAssignToSlime(e.target.value, voice.voiceId)}
                  className="bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-300 cursor-pointer"
                  title="Vincular esta voz diretamente a um personagem da arena"
                >
                  <option value="">Vincular a NPC...</option>
                  {slimes.map((s) => (
                    <option key={s.id} value={s.isPlayer ? 'player_slime' : s.id}>
                      {s.name} {s.isPlayer ? '(Player)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Row: Play Preview + Live Effect Sliders Toggle */}
              <div className="mt-2 flex items-center gap-1.5">
                <button
                  onClick={() => handlePlayPreview(voice)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded font-mono text-[11px] font-bold uppercase transition cursor-pointer ${
                    isPlaying
                      ? 'bg-amber-400 text-slate-950 shadow-md'
                      : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {isPlaying ? `Tocando "${voice.samplePhrase}"` : `Play Preview ("${voice.samplePhrase}")`}
                </button>

                <button
                  onClick={() => setExpandedTuneId(isTuning ? null : voice.voiceId)}
                  className={`p-1.5 rounded border transition cursor-pointer ${
                    isTuning
                      ? 'bg-sky-500 text-slate-950 border-sky-400'
                      : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                  title="Ajustar Grave (Hz), Pitch e RingMod desta voz"
                >
                  <Sliders className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Expandable Effect Tuning Sliders */}
              {isTuning && (
                <div className="mt-2 pt-2 border-t border-slate-800 space-y-1.5 bg-slate-950/70 p-2 rounded">
                  <div>
                    <div className="flex justify-between font-mono text-[10px]">
                      <span>Frequência Doce / Sininho (Hz)</span>
                      <span className="text-amber-300">{Math.round(voice.bassFrequency)} Hz</span>
                    </div>
                    <input
                      type="range"
                      min="560"
                      max="1300"
                      step="10"
                      value={voice.bassFrequency}
                      onChange={(e) => {
                        treeChatVoiceManager.updateVoiceProfileParams(voice.voiceId, {
                          bassFrequency: parseFloat(e.target.value),
                        });
                        setTick((t) => t + 1);
                      }}
                      className="w-full accent-amber-400"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between font-mono text-[10px]">
                      <span>Pitch Fofinho (Agudo Kawaii)</span>
                      <span className="text-sky-300">{voice.ttsPitch.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="1.65"
                      max="2.00"
                      step="0.02"
                      value={voice.ttsPitch}
                      onChange={(e) => {
                        treeChatVoiceManager.updateVoiceProfileParams(voice.voiceId, {
                          ttsPitch: parseFloat(e.target.value),
                        });
                        setTick((t) => t + 1);
                      }}
                      className="w-full accent-sky-400"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between font-mono text-[10px]">
                      <span>Vibrato Fofo / Piu-Piu (Hz)</span>
                      <span className="text-fuchsia-300">{Math.round(voice.roboticModFreq)} Hz</span>
                    </div>
                    <input
                      type="range"
                      min="8"
                      max="24"
                      step="1"
                      value={voice.roboticModFreq}
                      onChange={(e) => {
                        treeChatVoiceManager.updateVoiceProfileParams(voice.voiceId, {
                          roboticModFreq: parseFloat(e.target.value),
                        });
                        setTick((t) => t + 1);
                      }}
                      className="w-full accent-fuchsia-400"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};
