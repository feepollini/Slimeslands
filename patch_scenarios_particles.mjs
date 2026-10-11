import { readFileSync, writeFileSync } from 'fs';

const file = 'src/battleMain.ts';
let c = readFileSync(file, 'utf8');

// 1. Replace the SoundUtils import with SoundManager
c = c.replace(
  "import { SoundUtils } from './ui/utils/SoundUtils';",
  "import { SoundManager } from './ui/utils/SoundManager';"
);

// 2. Replace URL-based calls (SoundUtils.play('url', vol))
// Line 63 - difficulty screen ambient
c = c.replace(
  "SoundUtils.play('https://assets.mixkit.co/sfx/preview/mixkit-cinematic-mystery-sweep-2187.mp3', 0.4);",
  "SoundManager.playAmbient('difficulty');"
);
// Line 75 - difficulty button click
c = c.replace(
  "SoundUtils.play('https://assets.mixkit.co/sfx/preview/mixkit-hard-button-click-2851.mp3', 0.6);",
  "SoundManager.playAction('clique_geral', 0.6);"
);
// Line 88 - coin flip ambient
c = c.replace(
  "SoundUtils.play('https://assets.mixkit.co/sfx/preview/mixkit-dark-meditation-atmosphere-2179.mp3', 0.5);",
  "SoundManager.playAmbient('coin_flip');"
);
// Line 104 - coin spin
c = c.replace(
  "SoundUtils.play('https://assets.mixkit.co/sfx/preview/mixkit-classic-short-alarm-993.mp3', 0.2); // spin sound",
  "SoundManager.playAction('clique_geral', 0.3); // coin spin"
);
// Line 111 - reveal
c = c.replace(
  "SoundUtils.play('https://assets.mixkit.co/sfx/preview/mixkit-magical-light-pass-hover-2180.mp3', 0.5); // reveal",
  "SoundManager.playAction('carta_invocada', 0.5); // reveal"
);
// Line 489 - win/lose
c = c.replace(
  "SoundUtils.play(isWin ? 'https://assets.mixkit.co/sfx/preview/mixkit-celestial-magic-impact-2924.mp3' : 'https://assets.mixkit.co/sfx/preview/mixkit-horror-dark-thud-shaking-metal-2917.mp3', 0.6);",
  "SoundManager.playAction(isWin ? 'batalha_vitoria' : 'batalha_derrota', 0.7);"
);
// Line 551 - bell ring
c = c.replace(
  "SoundUtils.play('https://assets.mixkit.co/sfx/preview/mixkit-hand-bell-ring-single-743.mp3', 0.1);",
  "SoundManager.playAction('inicio_turno', 0.4);"
);

// 3. Replace playSfx calls — map SFX keys to SoundManager action keys
const sfxMap = {
  'CLICK':         'clique_geral',
  'SWOOSH':        'atk_basico_1',
  'DRAW':          'carta_sacada',
  'PLACE':         'carta_invocada',
  'DEATH':         'carta_morta',
  'IMPACT_MAGIC':  'atk_especial',
  'IMPACT_BLUNT':  'atk_basico_2',
};

// Replace all SoundUtils.playSfx('KEY', vol) -> SoundManager.playAction('mapped', vol)
for (const [sfxKey, actionKey] of Object.entries(sfxMap)) {
  // Match both with single and double quotes
  const regex = new RegExp(`SoundUtils\\.playSfx\\(['"\`]${sfxKey}['"\`]`, 'g');
  c = c.replace(regex, `SoundManager.playAction('${actionKey}'`);
}

// 4. Also add battle ambient start after battle begins (search for startBattle or render method)
// Add ambient call after the game loop starts — look for initBattle method
c = c.replace(
  "applyScenarioBackground((SCENARIOS as any).battle",
  "SoundManager.playAmbient('batalha');\n    applyScenarioBackground((SCENARIOS as any).battle"
);

console.log('SoundUtils calls replaced:', (c.match(/SoundUtils/g) || []).length, 'remaining');
writeFileSync(file, c, 'utf8');
console.log('Done!');
