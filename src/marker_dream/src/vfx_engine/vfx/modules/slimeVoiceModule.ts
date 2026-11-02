// ============================================================================
// MODULE: SLIME VOICE SYNTHESIZER BRIDGE
// Delegates 100% of voice synthesis to extra_modules/TreeChatVoice.ts
// Ensuring ZERO normal human voices and 100% Web Audio DSP Effected Voices!
// ============================================================================

import { SlimeActor } from '../types';
import { TreeChatEmotionId } from './treeChatProceduralStatsModule';
import { treeChatVoiceManager, AcousticRipple } from '../../extra_modules/TreeChatVoice';

export type { AcousticRipple };

export class SlimeVoiceSynthesizer {
  public initContext(): AudioContext | null {
    return treeChatVoiceManager.initAudioContext();
  }

  public setMuted(muted: boolean) {
    treeChatVoiceManager.setMuted(muted);
  }

  public toggleMute(): boolean {
    return treeChatVoiceManager.toggleMute();
  }

  public getIsMuted(): boolean {
    return treeChatVoiceManager.getIsMuted();
  }

  public getActiveRipples(): AcousticRipple[] {
    return [];
  }

  public updateRipples(_dt: number) {
    // Handled by treeChatVoiceManager.updateRipples(dt)
  }

  public vocalizeSlimeSpeech(
    speaker: SlimeActor,
    phrase: string,
    emotionId: TreeChatEmotionId,
    player: SlimeActor
  ) {
    treeChatVoiceManager.speakOnOptionSelected(speaker, phrase, emotionId, player);
  }
}

export const slimeVoiceEngine = new SlimeVoiceSynthesizer();
