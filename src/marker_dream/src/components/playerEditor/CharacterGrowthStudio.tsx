import React, { useState, useMemo } from 'react';
import type { MapProject, PlayerConfig } from '../../types/map';
import type {
  AttributeGrowthMode,
  AttributeGrowthRule,
  AttributeRoundingMode,
  CharacterGrowthConfig,
  ExcessXpPolicy,
  LevelCurveType,
} from '../../types/questSystem';
import {
  DEFAULT_CHARACTER_GROWTH,
  computeGrowthTable,
  grantXpCentralService,
  getOrCreateProjectQuestsConfig,
} from '../../utils/questEngine';
import {
  TrendingUp,
  Zap,
  Sparkles,
  RotateCcw,
  Award,
  Sliders,
  Table,
  CheckCircle2,
  ArrowRight,
  Download,
} from 'lucide-react';

interface CharacterGrowthStudioProps {
  project: MapProject;
  selectedCharacter: PlayerConfig;
  onUpdateProject: (updates: Partial<MapProject>) => void;
  onUpdateCharacter: (updates: Partial<PlayerConfig>) => void;
  onOpenQuestEditor?: () => void;
  showToast: (msg: string) => void;
}

export const CharacterGrowthStudio: React.FC<CharacterGrowthStudioProps> = ({
  project,
  selectedCharacter,
  onUpdateProject,
  onUpdateCharacter,
  onOpenQuestEditor,
  showToast,
}) => {
  const growthCfg: CharacterGrowthConfig = useMemo(
    () => selectedCharacter.growthConfig || project.player?.growthConfig || DEFAULT_CHARACTER_GROWTH,
    [selectedCharacter.growthConfig, project.player?.growthConfig]
  );

  const questsConfig = useMemo(() => getOrCreateProjectQuestsConfig(project), [project.questsConfig]);
  const levelTable = useMemo(() => computeGrowthTable(growthCfg), [growthCfg]);

  const [customXpInput, setCustomXpInput] = useState<number>(250);
  const [growthLogs, setGrowthLogs] = useState<string[]>([]);
  const [previewLevelCompare, setPreviewLevelCompare] = useState<number>(3);

  const currentLevel =
    questsConfig.playerState.currentLevel || selectedCharacter.currentLevel || 1;
  const currentLevelXp =
    questsConfig.playerState.currentLevelXp ?? selectedCharacter.currentXp ?? 0;
  const totalCumulativeXp =
    questsConfig.playerState.totalCumulativeXp ?? selectedCharacter.totalCumulativeXp ?? 0;

  const currentRow =
    levelTable.find((r) => r.level === currentLevel) || levelTable[0];
  const compareRow =
    levelTable.find((r) => r.level === previewLevelCompare) ||
    levelTable[Math.min(2, levelTable.length - 1)];

  const xpNeededForNext = currentRow?.xpToNextLevel || 100;
  const xpProgressPercent =
    xpNeededForNext > 0
      ? Math.min(100, Math.round((currentLevelXp / xpNeededForNext) * 100))
      : 100;

  const handleUpdateGrowthConfig = (updates: Partial<CharacterGrowthConfig>) => {
    const nextCfg: CharacterGrowthConfig = {
      ...growthCfg,
      ...updates,
    };
    onUpdateCharacter({ growthConfig: nextCfg });
    onUpdateProject({
      player: {
        ...(project.player || selectedCharacter),
        growthConfig: nextCfg,
      },
    });
  };

  const handleUpdateManualLevelOverride = (lvl: number, xpVal: number) => {
    const nextOverrides = {
      ...(growthCfg.manualIncrementalOverrides || {}),
      [lvl]: Math.max(10, Math.round(xpVal)),
    };
    handleUpdateGrowthConfig({ manualIncrementalOverrides: nextOverrides });
  };

  const handleUpdateAttributeRule = (
    attr: AttributeGrowthRule['attribute'],
    updates: Partial<AttributeGrowthRule>
  ) => {
    const nextRules = (growthCfg.attributeRules || []).map((r) =>
      r.attribute === attr ? { ...r, ...updates } : r
    );
    handleUpdateGrowthConfig({ attributeRules: nextRules });
  };

  const handleGrantXpLive = (amount: number, label: string) => {
    const res = grantXpCentralService(
      {
        ...project,
        player: {
          ...(project.player || selectedCharacter),
          growthConfig: growthCfg,
        },
      },
      amount,
      label
    );

    onUpdateProject({
      player: res.updatedProject.player,
      playerInventory: res.updatedProject.playerInventory,
      questsConfig: res.updatedProject.questsConfig,
    });
    onUpdateCharacter({
      currentLevel: res.newLevel,
      currentXp: res.newLevelXp,
      totalCumulativeXp: res.totalCumulativeXp,
      stats: res.updatedProject.player?.stats,
    });

    setGrowthLogs((prev) => [...res.logs, ...prev].slice(0, 20));
    showToast(
      `📈 +${amount} XP! Nível Atual: ${res.newLevel} (${res.newLevelXp} XP no nível | ${res.totalCumulativeXp} XP acumulado)`
    );
  };

  const handleResetToLevel1 = () => {
    const row1 = levelTable[0];
    const qCfg = getOrCreateProjectQuestsConfig(project);
    const nextQCfg = {
      ...qCfg,
      playerState: {
        ...qCfg.playerState,
        currentLevel: 1,
        currentLevelXp: 0,
        totalCumulativeXp: 0,
        unlockedShopIds: [],
        firedGlobalRuleIds: [],
      },
    };

    onUpdateCharacter({
      currentLevel: 1,
      currentXp: 0,
      totalCumulativeXp: 0,
      stats: {
        hp: row1.attributes.hp,
        maxHp: row1.attributes.hp,
        mp: row1.attributes.mp,
        maxMp: row1.attributes.mp,
        attack: row1.attributes.attack,
        defense: row1.attributes.defense,
        speed: row1.attributes.speed,
        magic: row1.attributes.magic,
      },
    });

    onUpdateProject({
      questsConfig: nextQCfg,
      player: {
        ...(project.player || selectedCharacter),
        currentLevel: 1,
        currentXp: 0,
        totalCumulativeXp: 0,
      },
    });

    setGrowthLogs(['🔄 Progresso de XP e Nível resetado para Nível 1 (0 XP).']);
    showToast('🔄 Personagem resetado para Nível 1 (0 XP) para testes de progressão!');
  };

  const handleExportCurveJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(growthCfg, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `curva_crescimento_${selectedCharacter.name.toLowerCase()}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('📥 Curva de Crescimento e Atributos exportada em JSON!');
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho e Atalho para o Quest Engine */}
      <div className="p-4 rounded-xl bg-zinc-950 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-white">
                Crescimento, Curva de XP &amp; Progressão por Nível (Seção 18)
              </h3>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold">
                INTEGRADO AO QUEST ENGINE
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              XP Incremental vs Acumulado, Curvas Editáveis, Crescimento Percentual Composto e Gatilhos de Nível (`player.level_reached`).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCurveJson}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportar Curva</span>
          </button>

          {onOpenQuestEditor && (
            <button
              type="button"
              onClick={onOpenQuestEditor}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span>📜 Abrir Editor de Quests</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* BARRA DE XP AO VIVO E SIMULADOR DE GRANT_XP (TESTE DE MÚLTIPLOS NÍVEIS E DESBLOQUEIOS) */}
      <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-extrabold text-sm">
              NÍVEL {currentLevel} / {growthCfg.maxLevel}
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>
                  XP no Nível Atual:{' '}
                  <strong className="text-emerald-300 font-mono">
                    {currentLevelXp} / {xpNeededForNext} XP
                  </strong>
                </span>
                <span className="text-zinc-600">|</span>
                <span>
                  XP Total Acumulado:{' '}
                  <strong className="text-amber-300 font-mono">{totalCumulativeXp} XP</strong>
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                Lojas desbloqueadas por nível:{' '}
                {questsConfig.playerState.unlockedShopIds.length > 0 ? (
                  <span className="text-emerald-300 font-semibold">
                    {questsConfig.playerState.unlockedShopIds.join(', ')}
                  </span>
                ) : (
                  <span className="text-zinc-500 italic">
                    Nenhuma (alcance o Nível 2 para desbloquear Loja do Viajante 1)
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetToLevel1}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-rose-500/20 border border-zinc-800 hover:border-rose-500/40 text-zinc-300 hover:text-rose-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Resetar Nv. 1 (0 XP)</span>
          </button>
        </div>

        {/* Barra de Progresso Visual de XP */}
        <div className="w-full h-3 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-amber-300 transition-all duration-300"
            style={{ width: `${xpProgressPercent}%` }}
          />
        </div>

        {/* Botões Rápidos de Teste do Serviço Central grant_xp(amount) */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] text-zinc-400 font-semibold">
            Testar `grant_xp(amount)` ao vivo:
          </span>
          <button
            type="button"
            onClick={() => handleGrantXpLive(100, 'Teste +100 XP (Transição 1➔2)')}
            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-xs cursor-pointer"
          >
            +100 XP (Nv 1➔2)
          </button>
          <button
            type="button"
            onClick={() => handleGrantXpLive(300, 'Teste +300 XP (Transição 2➔3)')}
            className="px-2.5 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 font-mono font-bold text-xs cursor-pointer"
          >
            +300 XP (Nv 2➔3)
          </button>
          <button
            type="button"
            onClick={() =>
              handleGrantXpLive(1000, 'Cenário 4: +1.000 XP (Salto Múltiplo Nv 1➔3 com 600 XP)')
            }
            className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-mono font-extrabold text-xs cursor-pointer shadow-sm"
            title="Testa o Cenário 4 da especificação: parte do Nível 1 (0 XP), gasta 100 + 300 e mantém 600 XP no Nível 3!"
          >
            ⚡ +1.000 XP (Cenário 4 Multi-Level)
          </button>

          <div className="flex items-center gap-1 ml-auto">
            <input
              type="number"
              min={1}
              value={customXpInput}
              onChange={(e) => setCustomXpInput(Math.max(1, Number(e.target.value) || 1))}
              className="w-20 bg-zinc-900 border border-zinc-750 rounded-lg px-2 py-1 text-xs font-mono text-white"
            />
            <button
              type="button"
              onClick={() => handleGrantXpLive(customXpInput, 'Concessão Manual')}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold cursor-pointer"
            >
              Conceder XP
            </button>
          </div>
        </div>

        {growthLogs.length > 0 && (
          <div className="p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800 max-h-28 overflow-y-auto space-y-1 font-mono text-[11px]">
            {growthLogs.map((l, i) => (
              <div key={i} className="text-zinc-300">
                {l}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CONFIGURAÇÃO DA CURVA DE XP E POLÍTICA DE TETO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-850 space-y-3">
          <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5" />
            <span>1. Curva de XP &amp; Limites de Nível</span>
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Nível Inicial</label>
              <input
                type="number"
                min={1}
                max={growthCfg.maxLevel - 1}
                value={growthCfg.initialLevel}
                onChange={(e) =>
                  handleUpdateGrowthConfig({ initialLevel: Math.max(1, Number(e.target.value) || 1) })
                }
                className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-2.5 py-1.5 font-mono font-bold text-white"
              />
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Nível Máximo (Cap)</label>
              <input
                type="number"
                min={2}
                max={99}
                value={growthCfg.maxLevel}
                onChange={(e) =>
                  handleUpdateGrowthConfig({
                    maxLevel: Math.max(2, Math.min(99, Number(e.target.value) || 20)),
                  })
                }
                className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-2.5 py-1.5 font-mono font-bold text-amber-300"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="text-[10px] text-zinc-400 block mb-1">XP Excedente no Nv. Máx</label>
              <select
                value={growthCfg.excessXpPolicy}
                onChange={(e) =>
                  handleUpdateGrowthConfig({
                    excessXpPolicy: e.target.value as ExcessXpPolicy,
                  })
                }
                className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-2 py-1.5 text-xs text-white font-semibold cursor-pointer"
              >
                <option value="retain">Reter XP</option>
                <option value="discard">Descartar</option>
                <option value="convert_to_gold">Converter em Ouro</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Tipo de Curva de XP</label>
              <select
                value={growthCfg.curveType}
                onChange={(e) =>
                  handleUpdateGrowthConfig({ curveType: e.target.value as LevelCurveType })
                }
                className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold cursor-pointer"
              >
                <option value="manual">Manual por Nível + Linear</option>
                <option value="linear">Progressão Linear (`base + (n-1)*step`)</option>
                <option value="geometric">Percentual / Geométrica (`base * (1+r)^(n-1)`)</option>
                <option value="polynomial">Polinomial (`base * n^exp`)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Fórmula Base / Passo</label>
              <div className="flex items-center gap-1.5 font-mono">
                <input
                  type="number"
                  value={growthCfg.baseXp}
                  onChange={(e) =>
                    handleUpdateGrowthConfig({ baseXp: Math.max(10, Number(e.target.value) || 100) })
                  }
                  title="XP Base (Nível 1->2)"
                  className="w-1/2 bg-zinc-900 border border-zinc-750 rounded-lg px-2 py-1.5 text-xs text-emerald-300 font-bold"
                />
                <input
                  type="number"
                  value={growthCfg.linearStep}
                  onChange={(e) =>
                    handleUpdateGrowthConfig({
                      linearStep: Math.max(0, Number(e.target.value) || 200),
                    })
                  }
                  title="Incremento por Nível (ex: +200 -> 100, 300, 500, 700, 900)"
                  className="w-1/2 bg-zinc-900 border border-zinc-750 rounded-lg px-2 py-1.5 text-xs text-blue-300 font-bold"
                />
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-[11px] text-zinc-300 font-mono">
            📐 Fórmula ativa: <strong className="text-amber-300">xp_next(n) = {growthCfg.baseXp} + (n - 1) × {growthCfg.linearStep}</strong> (ex: 1→2 = 100, 2→3 = 300, 3→4 = 500)
          </div>
        </div>

        {/* COMPARADOR ANTES / DEPOIS DE ATRIBUTOS */}
        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-850 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>2. Preview de Atributos Antes / Depois</span>
            </h4>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-zinc-400">Comparar Nv.{currentLevel} com:</span>
              <select
                value={previewLevelCompare}
                onChange={(e) => setPreviewLevelCompare(Number(e.target.value))}
                className="bg-zinc-900 border border-zinc-750 rounded px-2 py-0.5 text-xs font-mono font-bold text-amber-300 cursor-pointer"
              >
                {levelTable.map((r) => (
                  <option key={r.level} value={r.level}>
                    Nível {r.level}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-xs">
            {(['hp', 'mp', 'attack', 'defense', 'speed', 'magic'] as const).map((attrKey) => {
              const curVal = currentRow?.attributes[attrKey] ?? 0;
              const nextVal = compareRow?.attributes[attrKey] ?? 0;
              const diff = Math.round((nextVal - curVal) * 100) / 100;
              return (
                <div
                  key={attrKey}
                  className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col justify-between"
                >
                  <span className="text-[10px] uppercase text-zinc-400 font-sans font-bold">
                    {attrKey.toUpperCase()}
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-white font-bold">{curVal}</span>
                    <span className="text-zinc-500">➔</span>
                    <span className="text-emerald-300 font-extrabold">{nextVal}</span>
                  </div>
                  <span className="text-[10px] text-amber-300">
                    {diff >= 0 ? `+${diff}` : diff}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* REGRAS DE CRESCIMENTO PERCENTUAL POR ATRIBUTO (SEÇÃO 18.2) */}
      <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-850 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span>3. Crescimento Percentual por Atributo (Composição vs Base Linear — Seção 18.2)</span>
            </h4>
            <p className="text-[11px] text-zinc-400">
              Exemplo oficial: HP Base 100 com +5% composto sobre nível anterior ➔ Nível 2 = 105 | Nível 3 = 110.25.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {(growthCfg.attributeRules || []).map((rule) => (
            <div
              key={rule.attribute}
              className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">{rule.label}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  +{rule.percentPerLevel}% / nv
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 font-mono">
                <div>
                  <label className="text-[9px] text-zinc-400 block font-sans">Base (Nv.1)</label>
                  <input
                    type="number"
                    value={rule.baseValue}
                    onChange={(e) =>
                      handleUpdateAttributeRule(rule.attribute, {
                        baseValue: Number(e.target.value) || 10,
                      })
                    }
                    className="w-full bg-zinc-950 border border-zinc-750 rounded px-1.5 py-1 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-zinc-400 block font-sans">Taxa (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={rule.percentPerLevel}
                    onChange={(e) =>
                      handleUpdateAttributeRule(rule.attribute, {
                        percentPerLevel: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-zinc-950 border border-zinc-750 rounded px-1.5 py-1 text-emerald-300 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-zinc-400 block font-sans">+Bônus Fixo</label>
                  <input
                    type="number"
                    value={rule.flatBonusPerLevel}
                    onChange={(e) =>
                      handleUpdateAttributeRule(rule.attribute, {
                        flatBonusPerLevel: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-zinc-950 border border-zinc-750 rounded px-1.5 py-1 text-amber-300 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="text-[9px] text-zinc-400 block">Modo de Cálculo</label>
                  <select
                    value={rule.growthMode}
                    onChange={(e) =>
                      handleUpdateAttributeRule(rule.attribute, {
                        growthMode: e.target.value as AttributeGrowthMode,
                      })
                    }
                    className="w-full bg-zinc-950 border border-zinc-750 rounded px-1.5 py-1 text-[10px] text-zinc-200 cursor-pointer"
                  >
                    <option value="compound_previous">Composto (Nível Anterior)</option>
                    <option value="base_linear">Linear (Sobre Valor Base)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-zinc-400 block">Arredondamento</label>
                  <select
                    value={rule.rounding}
                    onChange={(e) =>
                      handleUpdateAttributeRule(rule.attribute, {
                        rounding: e.target.value as AttributeRoundingMode,
                      })
                    }
                    className="w-full bg-zinc-950 border border-zinc-750 rounded px-1.5 py-1 text-[10px] text-zinc-200 cursor-pointer"
                  >
                    <option value="two_decimals">2 Decimais (110.25)</option>
                    <option value="round">Inteiro Mais Próximo</option>
                    <option value="floor">Para Baixo (Floor)</option>
                    <option value="ceil">Para Cima (Ceil)</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TABELA INTERATIVA DE TRANSIÇÃO DE NÍVEIS (SEÇÃO 18.1: XP INCREMENTAL vs XP ACUMULADO) */}
      <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-850 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Table className="w-3.5 h-3.5 text-amber-400" />
              <span>4. Tabela de Níveis: XP Incremental (Próximo Nível) vs XP Acumulado Total</span>
            </h4>
            <p className="text-[11px] text-zinc-400">
              Você pode sobrescrever manualmente o custo de transição de qualquer nível diretamente na tabela.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto max-h-72 border border-zinc-850 rounded-xl">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead className="bg-zinc-900 text-zinc-400 text-[10px] uppercase sticky top-0">
              <tr>
                <th className="py-2 px-3">Nível Atual</th>
                <th className="py-2 px-3">XP p/ Próximo Nível (Incremental)</th>
                <th className="py-2 px-3">XP Acumulado p/ Próximo Nível</th>
                <th className="py-2 px-3">HP</th>
                <th className="py-2 px-3">MP</th>
                <th className="py-2 px-3">ATQ</th>
                <th className="py-2 px-3">DEF</th>
                <th className="py-2 px-3">Desbloqueios / Marcos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {levelTable.slice(0, 12).map((row) => {
                const isCurrent = row.level === currentLevel;
                const milestone = (growthCfg.levelMilestones || []).find(
                  (m) => m.level === row.level
                );
                return (
                  <tr
                    key={row.level}
                    className={
                      isCurrent
                        ? 'bg-emerald-500/15 text-white font-bold'
                        : 'hover:bg-zinc-900/60 text-zinc-300'
                    }
                  >
                    <td className="py-2 px-3 flex items-center gap-1.5">
                      <span>Nv. {row.level}</span>
                      {isCurrent && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-black text-[9px] font-sans font-extrabold">
                          ATUAL
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {row.level < growthCfg.maxLevel ? (
                        <input
                          type="number"
                          min={10}
                          value={row.xpToNextLevel}
                          onChange={(e) =>
                            handleUpdateManualLevelOverride(
                              row.level,
                              Number(e.target.value) || 100
                            )
                          }
                          className="w-24 bg-zinc-900 border border-zinc-750 rounded px-2 py-0.5 text-amber-300 font-bold"
                        />
                      ) : (
                        <span className="text-zinc-500">MAX</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-blue-300 font-bold">
                      {row.cumulativeXpForNextLevel} XP
                    </td>
                    <td className="py-2 px-3 text-rose-300">{row.attributes.hp}</td>
                    <td className="py-2 px-3 text-sky-300">{row.attributes.mp}</td>
                    <td className="py-2 px-3 text-amber-300">{row.attributes.attack}</td>
                    <td className="py-2 px-3 text-emerald-300">{row.attributes.defense}</td>
                    <td className="py-2 px-3 font-sans text-[11px]">
                      {milestone ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-200">
                          <Award className="w-3 h-3 text-purple-400" />
                          <span>{milestone.description}</span>
                        </span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
