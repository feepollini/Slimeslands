export type ShowcaseVfxType =
  | 'none'
  | 'frost'
  | 'hellfire'
  | 'venom'
  | 'acid-melt'
  | 'dimensional-slash'
  | 'arcane-storm';

export interface ShowcaseVfxPreset {
  id: ShowcaseVfxType;
  name: string;
  shortName: string;
  subtitle: string;
  accentColor: string;
  badgeBg: string;
}

export const SHOWCASE_VFX_PRESETS: ShowcaseVfxPreset[] = [
  {
    id: 'frost',
    name: 'Congelamento Procedural',
    shortName: 'Gelo Fractal',
    subtitle: 'Cristais dendríticos hexagonais crescendo pelas bordas, refração glacial e névoa fria',
    accentColor: '#38BDF8',
    badgeBg: 'from-cyan-500/30 via-sky-500/20 to-blue-900/30 border-cyan-400/60 text-cyan-200',
  },
  {
    id: 'hellfire',
    name: 'Fogo & Brasas Volumétricas',
    shortName: 'Fogo Realista',
    subtitle: 'Labaredas turbulentas em múltiplas camadas térmicas, fagulhas em espiral e calor',
    accentColor: '#F97316',
    badgeBg: 'from-orange-500/30 via-red-500/25 to-amber-900/30 border-orange-400/60 text-orange-200',
  },
  {
    id: 'venom',
    name: 'Veneno Gasoso & Miasma',
    shortName: 'Veneno Gasoso',
    subtitle: 'Nuvens densas de gás tóxico em movimento, bolhas ácidas que estouram e esporos',
    accentColor: '#84CC16',
    badgeBg: 'from-lime-500/30 via-emerald-500/25 to-green-950/30 border-lime-400/60 text-lime-200',
  },
  {
    id: 'acid-melt',
    name: 'Derretimento Viscoso',
    shortName: 'Derretimento',
    subtitle: 'Fluxo viscoso escorrendo com tensão superficial e distorção líquida real da arte',
    accentColor: '#A855F7',
    badgeBg: 'from-purple-500/30 via-fuchsia-500/25 to-violet-950/30 border-purple-400/60 text-purple-200',
  },
  {
    id: 'dimensional-slash',
    name: 'Golpes que Fatiam a Tela',
    shortName: 'Fatiar Tela',
    subtitle: 'Cortes de lâmina dimensional que deslocam fatias reais da carta com aberração cromática',
    accentColor: '#F43F5E',
    badgeBg: 'from-rose-500/30 via-pink-500/25 to-red-950/30 border-rose-400/60 text-rose-200',
  },
  {
    id: 'arcane-storm',
    name: 'Tempestade de Raios',
    shortName: 'Raios Arcanos',
    subtitle: 'Arcos voltaicos ramificados por deslocamento de ponto médio e pulso de plasma',
    accentColor: '#60A5FA',
    badgeBg: 'from-blue-500/30 via-indigo-500/25 to-slate-900/30 border-blue-400/60 text-blue-200',
  },
  {
    id: 'none',
    name: 'Sem Efeito VFX (Apenas Arte)',
    shortName: 'Sem VFX',
    subtitle: 'Expande a carta exibindo apenas a arte limpa sem sobreposição de partículas',
    accentColor: '#94A3B8',
    badgeBg: 'from-slate-700/30 to-slate-900/30 border-slate-600 text-slate-300',
  },
];
