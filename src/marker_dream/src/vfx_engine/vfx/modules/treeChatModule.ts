import { ShaderParams, SlimeActor } from '../types';
import type { VfxEngine } from '../vfxEngine';
import { getCharacterVisualBounds } from './slimeActorModule';
import { treeChatVoiceManager } from '../../extra_modules/TreeChatVoice';
import { stripFishAudioTags } from '../../extra_modules/FishAudioStudio';
import { slimeVoiceEngine } from './slimeVoiceModule';

import {
  MASSIVE_TREECHAT_EMOTIONS,
  TreeChatEmotionId,
  TreeChatEmotionDef,
  TreeChatIconType,
  TreeChatPillOption,
  generateProceduralPillOptions,
  selectPillOptionByProceduralStats,
  evaluateDialogueInitiationAffinity,
  getShortEmotionPillStateLabel,
  getOrCreateDnaBond,
  applyEmotionToDnaBond,
  triggerRelationshipCapsuleOnBoth,
} from './treeChatProceduralStatsModule';

export type { TreeChatEmotionId, TreeChatEmotionDef, TreeChatIconType, TreeChatPillOption };
export const TREECHAT_EMOTIONS = MASSIVE_TREECHAT_EMOTIONS;

export interface TreeChatSession {
  id: string;
  npcAId: string; // Left NPC
  npcBId: string; // Right NPC
  activeSpeakerId: string; // Who is currently displaying the 3 pills
  listenerId: string; // Who is currently displaying the 3D white thought bubble
  phase: 'deliberating' | 'selected';
  phaseTimer: number;
  currentOptions: [TreeChatPillOption, TreeChatPillOption, TreeChatPillOption];
  selectedIndex: number; // -1 while deliberating, 0..2 once selected
  lastChosenEmotion: TreeChatEmotionId | null;
  lastChosenPhrase: string | null;
  tension: number; // 0..100 (Green -> Yellow -> Orange -> Red; >= 100 triggers Brawl!)
  displayTension: number; // Smoothly interpolated tension for the vertical bar
  round: number;
  maxRounds: number;
  interest: number; // 0..100 (if it drops too low or round >= maxRounds, conversation ends)
  centerX: number;
  centerY: number;
}

const activeTreeChatSessions: TreeChatSession[] = [];
let sessionCounter = 1;

export function getActiveTreeChatSessions(): TreeChatSession[] {
  return activeTreeChatSessions;
}

export function clearTreeChatSessions() {
  activeTreeChatSessions.length = 0;
}

function buildGalleryAwarePillOptions(
  speaker: SlimeActor,
  listener: SlimeActor,
  prevEmotion: TreeChatEmotionId | null,
  tension: number,
  round: number
): [TreeChatPillOption, TreeChatPillOption, TreeChatPillOption] {
  const baseOptions = generateProceduralPillOptions(
    speaker,
    listener,
    prevEmotion,
    tension,
    round
  );
  const linkedClips = treeChatVoiceManager.getGalleryClipsForNpc(speaker);
  if (linkedClips.length === 0) {
    return baseOptions;
  }

  const assign = treeChatVoiceManager.getGalleryAssignmentForNpc(speaker.id);
  const startCursor = assign ? assign.clipCursor : 0;

  return baseOptions.map((opt, idx) => {
    const clip = linkedClips[(startCursor + idx) % linkedClips.length];
    const cleanText = stripFishAudioTags(clip.taggedText);
    return {
      emotionId: opt.emotionId,
      phrase: cleanText || opt.phrase,
    };
  }) as [TreeChatPillOption, TreeChatPillOption, TreeChatPillOption];
}

/**
 * Starts a new TreeChat conversation between two NPCs!
 */
export function startTreeChatSession(npc1: SlimeActor, npc2: SlimeActor): TreeChatSession {
  // Order left and right NPC so they stand side-by-side cleanly like the reference images
  const isNpc1Left = npc1.x <= npc2.x;
  const npcA = isNpc1Left ? npc1 : npc2;
  const npcB = isNpc1Left ? npc2 : npc1;

  const midX = (npcA.x + npcB.x) * 0.5;
  const midY = (npcA.y + npcB.y) * 0.5;

  // Procedural DNA chemistry between the two NPCs shapes initial tension, interest & rounds
  const dna1 = npc1.proceduralDnaSeed ?? 1337;
  const dna2 = npc2.proceduralDnaSeed ?? 7331;
  const combinedDna = Math.abs(dna1 ^ (dna2 * 31));
  const tags1 = npc1.allowedTags || [];
  const tags2 = npc2.allowedTags || [];
  const sharedTags = tags1.filter((t) => tags2.includes(t)).length;
  const bond = getOrCreateDnaBond(npc1, npc2);

  // Relative DNA bond & same-species kinship shape initial tension, interest & rounds
  const bondCalmness = Math.round(bond.affinity * 0.22 + bond.romance * 0.18 - bond.rivalry * 0.3);
  const baseTension =
    (sharedTags > 0 || bond.sameSpecies ? 18 + (combinedDna % 14) : 30 + (combinedDna % 20)) -
    bondCalmness;
  const initialTension = Math.max(8, Math.min(72, baseTension + Math.floor(Math.random() * 8)));
  const maxRounds = 3 + ((combinedDna + Math.floor(Math.random() * 4)) % 5); // 3 to 7 turns
  const initialInterest = Math.min(
    98,
    Math.max(
      35,
      68 +
        sharedTags * 8 +
        (bond.sameSpecies ? 14 : 0) +
        Math.round(bond.affinity * 0.2 + bond.romance * 0.25) +
        (combinedDna % 12)
    )
  );

  const session: TreeChatSession = {
    id: `treechat_${sessionCounter++}`,
    npcAId: npcA.id,
    npcBId: npcB.id,
    activeSpeakerId: npc1.id, // Initiator speaks first
    listenerId: npc2.id,
    phase: 'deliberating',
    phaseTimer: 1.35, // 1.35s deliberating with all 3 pills lit
    currentOptions: buildGalleryAwarePillOptions(npc1, npc2, null, initialTension, 1),
    selectedIndex: -1,
    lastChosenEmotion: null,
    lastChosenPhrase: null,
    tension: initialTension,
    displayTension: initialTension,
    round: 1,
    maxRounds,
    interest: initialInterest,
    centerX: midX,
    centerY: midY,
  };

  npc1.treeChatSessionId = session.id;
  npc2.treeChatSessionId = session.id;
  npc1.tacticalState = 'interacao_social';
  npc2.tacticalState = 'interacao_social';
  npc1.socialPartnerId = npc2.id;
  npc2.socialPartnerId = npc1.id;
  npc1.socialEmote = null;
  npc2.socialEmote = null;

  activeTreeChatSessions.push(session);
  return session;
}

/**
 * Updates all active TreeChat sessions, advancing turn phases, tension, and triggering Brawls if tension hits 100!
 * Supports multiple simultaneous conversations within the player's spatial hearing radius.
 */
export function updateTreeChatSessionsModule(
  engine: VfxEngine,
  dt: number,
  _params: ShaderParams
) {
  const slimes = engine.slimes;
  const playerSlime = slimes.find((s) => s.isPlayer) || slimes[0];

  // Dynamically update spatial volume for all simultaneously playing NPC conversation streams
  // based on each speaker's real-time distance to the player's hearing radius!
  if (playerSlime) {
    treeChatVoiceManager.updateSpatialAudioForActiveSpeakers(playerSlime, slimes);
  }

  for (let i = activeTreeChatSessions.length - 1; i >= 0; i--) {
    const chat = activeTreeChatSessions[i];
    const npcA = slimes.find((s) => s.id === chat.npcAId);
    const npcB = slimes.find((s) => s.id === chat.npcBId);

    // Cancel session if either NPC was removed, is desperate, or entered combat
    if (
      !npcA ||
      !npcB ||
      npcA.isDesperate ||
      npcB.isDesperate ||
      (engine.simulationEnabled && !npcA.treeChatSessionId)
    ) {
      if (npcA) {
        treeChatVoiceManager.stopSpeakerAudio(npcA.id);
        if (npcA.treeChatSessionId === chat.id) {
          npcA.treeChatSessionId = null;
          npcA.socialPartnerId = null;
          npcA.socialEmote = null;
        }
      }
      if (npcB) {
        treeChatVoiceManager.stopSpeakerAudio(npcB.id);
        if (npcB.treeChatSessionId === chat.id) {
          npcB.treeChatSessionId = null;
          npcB.socialPartnerId = null;
          npcB.socialEmote = null;
        }
      }
      activeTreeChatSessions.splice(i, 1);
      continue;
    }

    // Smoothly position npcA (left) and npcB (right) side-by-side facing each other
    const boundsA = getCharacterVisualBounds(npcA);
    const boundsB = getCharacterVisualBounds(npcB);
    const halfSpan = Math.max(82, (boundsA.drawW + boundsB.drawW) * 0.46);

    const targetAX = chat.centerX - halfSpan;
    const targetAY = chat.centerY;
    const targetBX = chat.centerX + halfSpan;
    const targetBY = chat.centerY;

    npcA.vx += (targetAX - npcA.x) * 6.5 * dt;
    npcA.vy += (targetAY - npcA.y) * 6.5 * dt;
    npcB.vx += (targetBX - npcB.x) * 6.5 * dt;
    npcB.vy += (targetBY - npcB.y) * 6.5 * dt;

    npcA.facingAngle = 0; // Face right toward npcB
    npcB.facingAngle = Math.PI; // Face left toward npcA
    npcA.tacticalState = 'interacao_social';
    npcB.tacticalState = 'interacao_social';
    npcA.socialEmote = null;
    npcB.socialEmote = null;

    // Smoothly interpolate displayed tension bar level
    chat.displayTension += (chat.tension - chat.displayTension) * Math.min(1, dt * 8);

    chat.phaseTimer -= dt;

    if (chat.phase === 'deliberating') {
      const speaker = npcA.id === chat.activeSpeakerId ? npcA : npcB;
      const listener = npcA.id === chat.activeSpeakerId ? npcB : npcA;

      // ONLY when the active speaker is the human player (`speaker.isPlayer`), wait for manual choice via [1], [2], [3] or click.
      // When the speaker is an NPC (`!speaker.isPlayer`), the NPC ALWAYS chooses its own response automatically!
      if (speaker.isPlayer) {
        continue;
      }

      if (chat.phaseTimer <= 0) {
        // NPC selects its own response via multi-dimensional procedural utility scoring!
        const decision = selectPillOptionByProceduralStats(
          speaker,
          listener,
          chat.currentOptions,
          chat.tension,
          chat.round
        );
        const chosenIdx = decision.selectedIndex;
        chat.selectedIndex = chosenIdx;
        const chosenOpt = chat.currentOptions[chosenIdx];
        const emotionDef = TREECHAT_EMOTIONS[chosenOpt.emotionId];

        chat.lastChosenEmotion = chosenOpt.emotionId;
        chat.lastChosenPhrase = chosenOpt.phrase;
        chat.tension = Math.max(0, Math.min(100, chat.tension + emotionDef.tensionDelta));
        chat.interest = Math.max(0, Math.min(100, chat.interest + emotionDef.interestDelta - 10));
        chat.phase = 'selected';

        // Evolve bidirectional DNA Relationship Bond & trigger dual capsule on milestone!
        applyEmotionToDnaBond(speaker, listener, chosenOpt.emotionId);

        if (speaker.z <= 0) {
          speaker.vz = 115;
          speaker.squashX = 1.12;
          speaker.squashY = 0.88;
        }

        // Audio ONLY triggers now, after the emotion/response option has been selected!
        const playedClip = treeChatVoiceManager.speakOnOptionSelected(
          speaker,
          chosenOpt.phrase,
          chosenOpt.emotionId,
          playerSlime,
          slimes
        );
        if (playedClip) {
          const cleanClipText = stripFishAudioTags(playedClip.taggedText);
          if (cleanClipText) {
            chat.lastChosenPhrase = cleanClipText;
          }
        }

        // Set initial listening duration to match the chosen audio length (with live extension below while playing)
        const expectedAudioDur =
          playedClip && playedClip.durationSec > 0 ? playedClip.durationSec : 1.45;
        chat.phaseTimer = Math.max(1.45, expectedAudioDur + 0.3);
      }
    } else if (chat.phase === 'selected') {
      // Keep THIS conversation's listener phase active until THIS speaker's chosen audio finishes playing completely!
      if (treeChatVoiceManager.isAudioPlaying(chat.activeSpeakerId)) {
        const remainingAudioSec = treeChatVoiceManager.getRemainingAudioDurationSec(
          chat.activeSpeakerId
        );
        chat.phaseTimer = Math.max(chat.phaseTimer, remainingAudioSec + 0.25);
      }

      if (chat.phaseTimer <= 0) {
        // Check 1: Did Tension hit the Red limit (>= 95)? -> START A BRAWL!
        if (chat.tension >= 95) {
          treeChatVoiceManager.stopSpeakerAudio(npcA.id);
          treeChatVoiceManager.stopSpeakerAudio(npcB.id);
          npcA.treeChatSessionId = null;
          npcB.treeChatSessionId = null;
          npcA.socialPartnerId = null;
          npcB.socialPartnerId = null;

          // Reset social desire so after the brawl they go explore regions again
          npcA.socialDesire = 5;
          npcB.socialDesire = 5;
          npcA.regionsExploredSinceLastChat = 0;
          npcB.regionsExploredSinceLastChat = 0;

          // Trigger a real skill brawl between the two NPCs!
          const brawlDuration = 6.5;
          npcA.treeChatBrawlTimer = brawlDuration;
          npcB.treeChatBrawlTimer = brawlDuration;
          npcA.treeChatBrawlOpponentId = npcB.id;
          npcB.treeChatBrawlOpponentId = npcA.id;
          npcA.tacticalState = 'duelo_treechat';
          npcB.tacticalState = 'duelo_treechat';
          npcA.socialEmote = null;
          npcB.socialEmote = null;
          npcA.socialCooldownTimer = 14.0 + ((npcA.proceduralDnaSeed ?? 0) % 7);
          npcB.socialCooldownTimer = 14.0 + ((npcB.proceduralDnaSeed ?? 0) % 7);

          engine.spawnFloatingText(
            chat.centerX,
            chat.centerY - 75,
            'TENSÃO MÁXIMA!',
            'CONVERSA VIROU BRIGA!',
            '#FF2A4B'
          );

          activeTreeChatSessions.splice(i, 1);
          continue;
        }

        // Check 2: Did interest run out or max rounds reached? -> End Conversation naturally
        const randomEndChance = chat.round >= 2 ? (100 - chat.interest) * 0.0065 : 0;
        if (chat.round >= chat.maxRounds || chat.interest <= 15 || Math.random() < randomEndChance) {
          treeChatVoiceManager.stopSpeakerAudio(npcA.id);
          treeChatVoiceManager.stopSpeakerAudio(npcB.id);
          npcA.treeChatSessionId = null;
          npcB.treeChatSessionId = null;
          npcA.socialPartnerId = null;
          npcB.socialPartnerId = null;
          npcA.socialDesire = 8 + ((npcA.proceduralDnaSeed ?? 0) % 12);
          npcB.socialDesire = 8 + ((npcB.proceduralDnaSeed ?? 0) % 12);
          npcA.regionsExploredSinceLastChat = 0;
          npcB.regionsExploredSinceLastChat = 0;
          npcA.socialCooldownTimer = 12.0 + ((npcA.proceduralDnaSeed ?? 0) % 8);
          npcB.socialCooldownTimer = 12.0 + ((npcB.proceduralDnaSeed ?? 0) % 8);
          npcA.tacticalState = 'caminhada_pacifica';
          npcB.tacticalState = 'caminhada_pacifica';
          npcA.socialEmote = null;
          npcB.socialEmote = null;

          const finalBond = getOrCreateDnaBond(npcA, npcB);
          if (finalBond.tier !== 'desconhecido') {
            triggerRelationshipCapsuleOnBoth(npcA, npcB, finalBond.tier, 3.8);
          }

          // If they are lovers ('par_romantico' or 'alma_gemea') or best friends, keep their targets close together!
          if (
            finalBond.tier === 'par_romantico' ||
            finalBond.tier === 'alma_gemea' ||
            finalBond.romance >= 45
          ) {
            npcA.romanticSnugglePartnerId = npcB.id;
            npcB.romanticSnugglePartnerId = npcA.id;
            npcA.wanderTargetX = chat.centerX - 26;
            npcA.wanderTargetY = chat.centerY;
            npcB.wanderTargetX = chat.centerX + 26;
            npcB.wanderTargetY = chat.centerY;
            npcA.wanderTimer = 8.0;
            npcB.wanderTimer = 8.0;
          } else {
            // Push their wander targets apart so they walk away to explore distant regions
            npcA.wanderTargetX = Math.max(140, chat.centerX - 380 - Math.random() * 280);
            npcA.wanderTargetY = Math.max(
              140,
              Math.min(engine.getHeight() - 160, chat.centerY + (Math.random() - 0.5) * 420)
            );
            npcA.wanderTimer = 4.5;

            npcB.wanderTargetX = Math.min(
              engine.getWidth() - 140,
              chat.centerX + 380 + Math.random() * 280
            );
            npcB.wanderTargetY = Math.max(
              140,
              Math.min(engine.getHeight() - 160, chat.centerY + (Math.random() - 0.5) * 420)
            );
            npcB.wanderTimer = 4.5;
          }

          activeTreeChatSessions.splice(i, 1);
          continue;
        }

        // Otherwise: Invert roles! Listener becomes the new Active Speaker with procedural options
        const prevSpeakerId = chat.activeSpeakerId;
        chat.activeSpeakerId = chat.listenerId;
        chat.listenerId = prevSpeakerId;
        chat.round += 1;
        chat.phase = 'deliberating';

        const nextSpeaker = npcA.id === chat.activeSpeakerId ? npcA : npcB;
        const nextListener = npcA.id === chat.activeSpeakerId ? npcB : npcA;

        // If the NPC is replying to the Player, the NPC decides quickly on its own (0.45s) without showing 3 choice pills!
        const isNpcReplyingToPlayer = !nextSpeaker.isPlayer && nextListener.isPlayer;
        chat.phaseTimer = isNpcReplyingToPlayer ? 0.45 : 1.15;
        chat.selectedIndex = -1;

        chat.currentOptions = buildGalleryAwarePillOptions(
          nextSpeaker,
          nextListener,
          chat.lastChosenEmotion,
          chat.tension,
          chat.round
        );
      }
    }
  }
}

/**
 * Triggers immediate TreeChat conversations among available NPCs!
 * If 4+ NPCs are free, starts multiple simultaneous conversations so the player can hear
 * multiple conversations at the same time within their hearing radius.
 */
export function triggerRandomTreeChatPair(engine: VfxEngine): boolean {
  const available = engine.slimes.filter(
    (s) =>
      !s.isPlayer &&
      !s.isDesperate &&
      !s.treeChatSessionId &&
      (!s.treeChatBrawlTimer || s.treeChatBrawlTimer <= 0)
  );
  if (available.length < 2) return false;

  const remaining = [...available];
  let startedCount = 0;

  while (remaining.length >= 2) {
    const npc1 = remaining.shift()!;
    let bestIdx = 0;
    let bestD = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = Math.hypot(remaining[i].x - npc1.x, remaining[i].y - npc1.y);
      if (d < bestD) {
        bestD = d;
        bestIdx = i;
      }
    }
    const npc2 = remaining.splice(bestIdx, 1)[0];

    const midX = (npc1.x + npc2.x) * 0.5;
    const midY = (npc1.y + npc2.y) * 0.5;
    npc1.x = midX - 85;
    npc1.y = midY;
    npc2.x = midX + 85;
    npc2.y = midY;

    const session = startTreeChatSession(npc1, npc2);
    // Slightly stagger deliberation timers across simultaneous conversations so their voices layer naturally
    session.phaseTimer = 0.85 + startedCount * 0.55;
    startedCount++;
  }

  return startedCount > 0;
}

/**
 * Closes any active TreeChat session involving the Player (triggered when pressing F again).
 * Returns true if an active player dialogue was closed.
 */
export function closePlayerTreeChat(
  player: SlimeActor,
  slimes?: SlimeActor[]
): boolean {
  if (!player) return false;
  const sessionIdx = activeTreeChatSessions.findIndex(
    (c) =>
      c.id === player.treeChatSessionId ||
      c.npcAId === player.id ||
      c.npcBId === player.id
  );
  if (sessionIdx < 0) {
    player.treeChatSessionId = undefined;
    player.socialPartnerId = null;
    return false;
  }

  const chat = activeTreeChatSessions[sessionIdx];
  treeChatVoiceManager.stopSpeakerAudio(chat.npcAId);
  treeChatVoiceManager.stopSpeakerAudio(chat.npcBId);

  const partnerId = chat.npcAId === player.id ? chat.npcBId : chat.npcAId;
  const partner = slimes?.find((s) => s.id === partnerId);

  if (partner) {
    const bond = getOrCreateDnaBond(player, partner);
    if (bond.tier !== 'desconhecido') {
      triggerRelationshipCapsuleOnBoth(player, partner, bond.tier);
    }
    partner.treeChatSessionId = undefined;
    partner.socialPartnerId = null;
    if (partner.tacticalState === 'duelo_treechat' || partner.tacticalState === 'interacao_social') {
      partner.tacticalState = 'caminhada_pacifica';
      partner.wanderTimer = 3.0 + Math.random() * 2.5;
    }
  }

  player.treeChatSessionId = undefined;
  player.socialPartnerId = null;
  activeTreeChatSessions.splice(sessionIdx, 1);
  return true;
}

/**
 * Starts or toggles an interactive TreeChat session between the Player and a target NPC.
 * Pressing F again while already in dialogue immediately ends the conversation.
 */
export function interactPlayerTreeChat(
  player: SlimeActor,
  targetNpc: SlimeActor,
  allSlimes?: SlimeActor[]
): TreeChatSession | null {
  if (!player || !targetNpc || player.id === targetNpc.id) return null;

  // Check if player is already in an active conversation -> pressing F again closes it!
  const existingPlayerSession = activeTreeChatSessions.find(
    (c) =>
      c.id === player.treeChatSessionId ||
      c.npcAId === player.id ||
      c.npcBId === player.id
  );
  if (existingPlayerSession) {
    closePlayerTreeChat(player, allSlimes || [player, targetNpc]);
    return null;
  }

  // If target NPC was in another conversation, cancel it politely
  if (targetNpc.treeChatSessionId) {
    const oldIdx = activeTreeChatSessions.findIndex((s) => s.id === targetNpc.treeChatSessionId);
    if (oldIdx >= 0) {
      const oldChat = activeTreeChatSessions[oldIdx];
      treeChatVoiceManager.stopSpeakerAudio(oldChat.npcAId);
      treeChatVoiceManager.stopSpeakerAudio(oldChat.npcBId);
      activeTreeChatSessions.splice(oldIdx, 1);
    }
  }

  // Bring them gently facing each other
  const midX = (player.x + targetNpc.x) * 0.5;
  const midY = (player.y + targetNpc.y) * 0.5;
  const isPlayerLeft = player.x <= targetNpc.x;
  player.x = midX + (isPlayerLeft ? -82 : 82);
  player.y = midY;
  targetNpc.x = midX + (isPlayerLeft ? 82 : -82);
  targetNpc.y = midY;

  // Start fresh interactive session with player as the initial speaker!
  const session = startTreeChatSession(player, targetNpc);
  session.activeSpeakerId = player.id;
  session.listenerId = targetNpc.id;
  session.phase = 'deliberating';
  session.selectedIndex = -1;

  return session;
}

/**
 * Executes player's choice of dialogue option 0, 1, or 2 (mapped to keys [1], [2], [3] or pill click)
 * Strictly restricted to when the HUMAN PLAYER is the active speaker!
 */
export function selectPlayerTreeChatOption(
  chat: TreeChatSession,
  chosenIdx: number,
  engine: VfxEngine
): boolean {
  if (!chat || chat.phase !== 'deliberating' || chosenIdx < 0 || chosenIdx > 2) {
    return false;
  }

  const npcA = engine.slimes.find((s) => s.id === chat.npcAId);
  const npcB = engine.slimes.find((s) => s.id === chat.npcBId);
  if (!npcA || !npcB) return false;

  const speaker = npcA.id === chat.activeSpeakerId ? npcA : npcB;
  const listener = npcA.id === chat.activeSpeakerId ? npcB : npcA;
  // Player ONLY ever chooses their own response — never the NPC's!
  if (!speaker.isPlayer) return false;

  const chosenOpt = chat.currentOptions[chosenIdx];
  if (!chosenOpt) return false;

  chat.selectedIndex = chosenIdx;
  const emotionDef = TREECHAT_EMOTIONS[chosenOpt.emotionId];

  chat.lastChosenEmotion = chosenOpt.emotionId;
  chat.lastChosenPhrase = chosenOpt.phrase;
  chat.tension = Math.max(0, Math.min(100, chat.tension + emotionDef.tensionDelta));
  chat.interest = Math.max(0, Math.min(100, chat.interest + emotionDef.interestDelta - 10));
  chat.phase = 'selected';

  // Evolve Player <-> NPC DNA Relationship Bond & pop dual capsule on milestone!
  applyEmotionToDnaBond(speaker, listener, chosenOpt.emotionId);

  speaker.socialEmote = null;
  if (speaker.z <= 0) {
    speaker.vz = 145;
    speaker.squashX = 1.16;
    speaker.squashY = 0.84;
  }

  // Audio ONLY triggers after the player selects their emotion/response option!
  const playerSlime = engine.getPlayerSlime() || speaker;
  const playedClip = treeChatVoiceManager.speakOnOptionSelected(
    speaker,
    chosenOpt.phrase,
    chosenOpt.emotionId,
    playerSlime,
    engine.slimes
  );
  if (playedClip) {
    const cleanClipText = stripFishAudioTags(playedClip.taggedText);
    if (cleanClipText) {
      chat.lastChosenPhrase = cleanClipText;
    }
  }

  const expectedAudioDur =
    playedClip && playedClip.durationSec > 0 ? playedClip.durationSec : 1.45;
  chat.phaseTimer = Math.max(1.45, expectedAudioDur + 0.3);

  return true;
}

/**
 * Checks if a pointer click was on one of the player's own active TreeChat dialogue pills (options 0, 1, or 2)
 */
export function checkTreeChatPillClick(
  worldX: number,
  worldY: number,
  engine: VfxEngine
): boolean {
  const player = engine.getPlayerSlime();
  if (!player) return false;

  const playerChat = activeTreeChatSessions.find(
    (c) =>
      (c.npcAId === player.id || c.npcBId === player.id) &&
      c.activeSpeakerId === player.id &&
      c.phase === 'deliberating'
  );
  if (!playerChat) return false;

  const npcA = engine.slimes.find((s) => s.id === playerChat.npcAId);
  const npcB = engine.slimes.find((s) => s.id === playerChat.npcBId);
  if (!npcA || !npcB) return false;

  const leftNpc = npcA.x <= npcB.x ? npcA : npcB;
  const rightNpc = npcA.x <= npcB.x ? npcB : npcA;
  const leftBounds = getCharacterVisualBounds(leftNpc);
  const rightBounds = getCharacterVisualBounds(rightNpc);

  const speakerIsLeft = playerChat.activeSpeakerId === leftNpc.id;
  const fanOriginX = speakerIsLeft
    ? leftNpc.x - leftBounds.drawW * 0.48 - 14
    : rightNpc.x + rightBounds.drawW * 0.48 + 14;
  const fanOriginY = speakerIsLeft
    ? leftNpc.y - leftBounds.drawH * 0.46
    : rightNpc.y - rightBounds.drawH * 0.46;

  const pillW = 92;
  const side = speakerIsLeft ? 'left' : 'right';
  const verticalOffsets = [-33, 0, 33];
  const horizontalOffsets =
    side === 'left'
      ? [-pillW * 0.54 + 4, -pillW * 0.62, -pillW * 0.54 + 4]
      : [pillW * 0.54 - 4, pillW * 0.62, pillW * 0.54 - 4];

  for (let idx = 0; idx < 3; idx++) {
    const px = fanOriginX + horizontalOffsets[idx];
    const py = fanOriginY + verticalOffsets[idx];
    const dist = Math.hypot(worldX - px, worldY - py);
    if (dist <= 36) {
      return selectPlayerTreeChatOption(playerChat, idx, engine);
    }
  }

  return false;
}

/**
 * Checks if the player clicked directly on an NPC within interaction distance
 */
export function checkNpcClickInteraction(
  worldX: number,
  worldY: number,
  engine: VfxEngine
): boolean {
  const player = engine.getPlayerSlime();
  if (!player) return false;

  for (const s of engine.slimes) {
    if (s.isPlayer || s.isDesperate) continue;
    // If already in a conversation with this NPC, don't reset or interfere with it on click
    if (player.treeChatSessionId && s.treeChatSessionId === player.treeChatSessionId) {
      continue;
    }
    const distClick = Math.hypot(worldX - s.x, worldY - s.y);
    const distPlayer = Math.hypot(player.x - s.x, player.y - s.y);
    if (distClick <= s.radius * 1.6 && distPlayer <= 320) {
      interactPlayerTreeChat(player, s);
      return true;
    }
  }
  return false;
}

// ============================================================================
// TREECHAT RENDERER:
// 1. Center Vertical Tension Capsule Thermometer (Green -> Yellow -> Orange -> Red)
// 2. 3-Pill Fan on Active Speaker (For Player: shows 3 choices; For NPC replying to Player: shows ONLY the chosen reply!)
// 3. 3D Glossy White Thought Bubble on Listener
// ============================================================================
export function renderTreeChatSessionsModule(
  ctx: CanvasRenderingContext2D,
  slimes: SlimeActor[]
) {
  if (activeTreeChatSessions.length === 0) return;

  const playerSlime = slimes.find((s) => s.isPlayer) || slimes[0];

  for (let i = 0; i < activeTreeChatSessions.length; i++) {
    const chat = activeTreeChatSessions[i];
    const npcA = slimes.find((s) => s.id === chat.npcAId);
    const npcB = slimes.find((s) => s.id === chat.npcBId);
    if (!npcA || !npcB) continue;

    const leftNpc = npcA.x <= npcB.x ? npcA : npcB;
    const rightNpc = npcA.x <= npcB.x ? npcB : npcA;
    const leftBounds = getCharacterVisualBounds(leftNpc);
    const rightBounds = getCharacterVisualBounds(rightNpc);

    const midX = (leftNpc.x + rightNpc.x) * 0.5;
    const topAnchorY =
      Math.min(
        leftNpc.y - leftBounds.drawH * 0.65,
        rightNpc.y - rightBounds.drawH * 0.65
      ) - 18;

    // 1. CENTER VERTICAL RELATIONAL & TENSION METER
    drawVerticalTensionCapsule(ctx, midX, topAnchorY, chat.displayTension, leftNpc, rightNpc);

    // 2. Determine which side is speaking and which side is listening
    const speakerIsLeft = chat.activeSpeakerId === leftNpc.id;
    const speaker = speakerIsLeft ? leftNpc : rightNpc;
    const isPlayerInThisChat = leftNpc.isPlayer || rightNpc.isPlayer;
    const isNpcTurnInPlayerChat = isPlayerInThisChat && !speaker.isPlayer;

    // Compute spatial audibility for the player's hearing radius
    const spatial = playerSlime
      ? treeChatVoiceManager.computeSpatialParameters(
          speaker.x,
          speaker.y,
          playerSlime.x,
          playerSlime.y
        )
      : { volume: 1, isAudible: true, distance: 0, filterCutoffHz: 8000, pan: 0 };



    if (speakerIsLeft) {
      // Speaker is on the LEFT
      const fanOriginX = leftNpc.x - leftBounds.drawW * 0.48 - 14;
      const fanOriginY = leftNpc.y - leftBounds.drawH * 0.46;

      if (isNpcTurnInPlayerChat && chat.phase === 'deliberating') {
        // When talking to the Player, the NPC NEVER displays 3 selectable options — it thinks on its own!
        drawGlossyThoughtBubble(
          ctx,
          leftNpc.x - leftBounds.drawW * 0.42,
          leftNpc.y - leftBounds.drawH * 0.58,
          'left',
          chat.lastChosenEmotion
        );
      } else {
        drawThreePillFan(
          ctx,
          fanOriginX,
          fanOriginY,
          'left',
          chat.currentOptions,
          chat.phase,
          chat.selectedIndex,
          isNpcTurnInPlayerChat // If NPC is replying to player, only show the single chosen pill!
        );
      }

      const bubbleOriginX = rightNpc.x + rightBounds.drawW * 0.42;
      const bubbleOriginY = rightNpc.y - rightBounds.drawH * 0.58;
      drawGlossyThoughtBubble(
        ctx,
        bubbleOriginX,
        bubbleOriginY,
        'right',
        chat.lastChosenEmotion
      );
    } else {
      // Speaker is on the RIGHT -> Thought Bubble on the Left, Speaker on the Right
      const bubbleOriginX = leftNpc.x - leftBounds.drawW * 0.42;
      const bubbleOriginY = leftNpc.y - leftBounds.drawH * 0.58;
      drawGlossyThoughtBubble(
        ctx,
        bubbleOriginX,
        bubbleOriginY,
        'left',
        chat.lastChosenEmotion
      );

      const fanOriginX = rightNpc.x + rightBounds.drawW * 0.48 + 14;
      const fanOriginY = rightNpc.y - rightBounds.drawH * 0.46;

      if (isNpcTurnInPlayerChat && chat.phase === 'deliberating') {
        // When talking to the Player, the NPC NEVER displays 3 selectable options — it thinks on its own!
        drawGlossyThoughtBubble(
          ctx,
          rightNpc.x + rightBounds.drawW * 0.42,
          rightNpc.y - rightBounds.drawH * 0.58,
          'right',
          chat.lastChosenEmotion
        );
      } else {
        drawThreePillFan(
          ctx,
          fanOriginX,
          fanOriginY,
          'right',
          chat.currentOptions,
          chat.phase,
          chat.selectedIndex,
          isNpcTurnInPlayerChat // If NPC is replying to player, only show the single chosen pill!
        );
      }
    }
  }

  // Render expanding acoustic soundwave ripples from speaking slimes
  const ripples = [
    ...treeChatVoiceManager.getActiveRipples(),
    ...slimeVoiceEngine.getActiveRipples(),
  ];
  if (ripples.length > 0) {
    ctx.save();
    for (const r of ripples) {
      const alpha = Math.max(0, (r.life / r.maxLife) * r.volumeAlpha);
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = alpha * 0.75;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, r.radius, r.radius * 0.65, 0, 0, Math.PI * 2);
      ctx.stroke();

      if (r.radius > 40) {
        ctx.lineWidth = 1.3;
        ctx.globalAlpha = alpha * 0.35;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, r.radius * 0.68, r.radius * 0.68 * 0.65, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

/**
 * Renders the Vertical Tension Thermometer Capsule between the two NPCs
 * (Exact match to /public/assets/aistudio/image_9a96ca25.png)
 */
function drawVerticalTensionCapsule(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  tension: number,
  leftNpc?: SlimeActor,
  rightNpc?: SlimeActor
) {
  const barW = 14;
  const barH = 56;
  const radius = barW * 0.5;
  const x = cx - barW * 0.5;
  const y = cy - barH * 0.5;

  // Compute relative relational level combining live bond (affinity + romance - rivalry) and conversation tension
  const bond = leftNpc && rightNpc ? getOrCreateDnaBond(leftNpc, rightNpc) : null;
  const isRomantic =
    bond &&
    (bond.tier === 'paquera' ||
      bond.tier === 'par_romantico' ||
      bond.tier === 'alma_gemea' ||
      bond.romance >= 28);
  const isFriendly =
    bond && (bond.tier === 'amigo' || bond.tier === 'melhor_amigo' || bond.affinity >= 28);
  const isHostile =
    tension >= 62 ||
    (bond &&
      (bond.tier === 'rival' ||
        bond.tier === 'inimigo' ||
        bond.tier === 'inimigo_mortal' ||
        bond.affinity <= -15));

  // Relative meter level: rises with positive affinity/romance or rises in red mode when hostility/tension spikes
  let relativeLevel = tension;
  if (bond) {
    if (isHostile) {
      relativeLevel = Math.max(tension, 45 + bond.rivalry * 0.55 - bond.affinity * 0.35);
    } else if (isRomantic) {
      relativeLevel = Math.max(25, Math.min(100, 35 + bond.romance * 0.55 + bond.affinity * 0.25));
    } else if (isFriendly) {
      relativeLevel = Math.max(22, Math.min(100, 30 + bond.affinity * 0.65));
    } else {
      relativeLevel = Math.max(15, Math.min(95, 50 + bond.affinity * 0.45 - (tension - 35) * 0.4));
    }
  }

  const clamped = Math.max(6, Math.min(100, relativeLevel));
  const fillRatio = clamped / 100;

  ctx.save();

  // Outer drop shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 2;

  // Outer silver/white capsule frame (tinted slightly by active bond state)
  ctx.fillStyle = isRomantic
    ? '#FBCFE8'
    : isFriendly
    ? '#A7F3D0'
    : isHostile
    ? '#FECDD3'
    : '#E2E8F0';
  ctx.beginPath();
  ctx.roundRect(x - 1.5, y - 1.5, barW + 3, barH + 3, radius + 1.5);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Clip inside the vertical capsule
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, barW, barH, radius);
  ctx.clip();

  // 1. Dark unlit background
  const unlitGrad = ctx.createLinearGradient(0, y, 0, y + barH);
  unlitGrad.addColorStop(0, '#1E1B4B');
  unlitGrad.addColorStop(0.5, '#0F172A');
  unlitGrad.addColorStop(1, '#1E293B');
  ctx.fillStyle = unlitGrad;
  ctx.fillRect(x, y, barW, barH);

  // 2. Relative Relational Fill Gradient (adapts to Romance, Friendship, or Hostility/Tension!)
  const fillH = barH * fillRatio;
  const fillTopY = y + barH - fillH;

  const fullColorGrad = ctx.createLinearGradient(0, y + barH, 0, y);
  if (isHostile) {
    fullColorGrad.addColorStop(0.0, '#FACC15');
    fullColorGrad.addColorStop(0.45, '#F97316');
    fullColorGrad.addColorStop(1.0, '#FF002B');
  } else if (isRomantic) {
    fullColorGrad.addColorStop(0.0, '#38BDF8');
    fullColorGrad.addColorStop(0.4, '#F472B6');
    fullColorGrad.addColorStop(1.0, '#E879F9');
  } else if (isFriendly) {
    fullColorGrad.addColorStop(0.0, '#0EA5E9');
    fullColorGrad.addColorStop(0.5, '#10B981');
    fullColorGrad.addColorStop(1.0, '#2DD4BF');
  } else {
    fullColorGrad.addColorStop(0.0, '#65FF00');
    fullColorGrad.addColorStop(0.35, '#38BDF8');
    fullColorGrad.addColorStop(0.7, '#FACC15');
    fullColorGrad.addColorStop(1.0, '#FF2A4B');
  }

  ctx.fillStyle = fullColorGrad;
  ctx.fillRect(x, fillTopY, barW, fillH);

  // 3. Bright white horizontal meniscus divider line at current tension level
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x, fillTopY - 1, barW, 2);

  // 4. 10 Horizontal white graduation tick marks along the capsule
  const tickCount = 10;
  for (let t = 1; t < tickCount; t++) {
    const ty = y + (barH / tickCount) * t;
    const isLit = ty >= fillTopY;
    ctx.strokeStyle = isLit
      ? 'rgba(255, 255, 255, 0.92)'
      : 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + 2.5, ty);
    ctx.lineTo(x + barW - 2.5, ty);
    ctx.stroke();
  }

  // 5. Left-edge vertical 3D glass highlight reflection
  const glassGrad = ctx.createLinearGradient(x, 0, x + barW * 0.45, 0);
  glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
  glassGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = glassGrad;
  ctx.fillRect(x + 1, y + 2.5, barW * 0.38, barH - 5);

  ctx.restore(); // End capsule clip
  ctx.restore();
}

/**
 * Renders the 3D Glossy White Thought Bubble above the Listener
 * (Exact match to /public/assets/aistudio/image_bf7dcdee.png)
 */
function drawGlossyThoughtBubble(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  side: 'left' | 'right',
  lastHeardEmotion: TreeChatEmotionId | null
) {
  ctx.save();
  const dir = side === 'left' ? -1 : 1;

  // Small 3D sphere 1 (closest to character head, scaled 40% down)
  const c1X = originX + dir * 6;
  const c1Y = originY - 3;
  drawGlossyWhiteSphere(ctx, c1X, c1Y, 2.7);

  // Medium 3D sphere 2
  const c2X = originX + dir * 13;
  const c2Y = originY - 9;
  drawGlossyWhiteSphere(ctx, c2X, c2Y, 5.1);

  // Main Puffy 3D White Capsule Bubble (scaled down 40%: 86 * 0.6 = 52, 38 * 0.6 = 23)
  const bubW = 52;
  const bubH = 23;
  const bubR = bubH * 0.5;
  const bubCenterX = originX + dir * (18 + bubW * 0.5);
  const bubCenterY = originY - 24;
  const bx = bubCenterX - bubW * 0.5;
  const by = bubCenterY - bubH * 0.5;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2.5;

  // Base 3D shaded white capsule
  const bodyGrad = ctx.createLinearGradient(bx, by, bx + bubW * 0.25, by + bubH);
  bodyGrad.addColorStop(0, '#FFFFFF');
  bodyGrad.addColorStop(0.68, '#F8FAFC');
  bodyGrad.addColorStop(1, '#94A3B8');

  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(bx, by, bubW, bubH, bubR);
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Pure white inner highlight dome
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(bx + 2, by + 1.5, bubW - 5, bubH - 5, (bubH - 5) * 0.5);
  ctx.fill();

  // Animated thinking dots + subtle tint of the emotion being processed
  const now = performance.now() * 0.005;
  const dotColor = lastHeardEmotion
    ? TREECHAT_EMOTIONS[lastHeardEmotion].colorMid
    : '#64748B';

  for (let d = 0; d < 3; d++) {
    const bounce = Math.sin(now + d * 1.1) * 1.6;
    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(bubCenterX - 9 + d * 9, bubCenterY + bounce, 2.3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawGlossyWhiteSphere(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number
) {
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 2;
  const g = ctx.createRadialGradient(
    x - r * 0.3,
    y - r * 0.3,
    r * 0.1,
    x,
    y,
    r
  );
  g.addColorStop(0, '#FFFFFF');
  g.addColorStop(0.65, '#F1F5F9');
  g.addColorStop(1, '#64748B');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Renders the 3-Pill Fan beside the Active Speaker:
 * When `onlyShowSelectedPill` is true (e.g. when an NPC is replying to the Player),
 * only the single chosen pill is rendered at the center position so the player never sees 3 choice options on the NPC!
 */
function drawThreePillFan(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  side: 'left' | 'right',
  options: [TreeChatPillOption, TreeChatPillOption, TreeChatPillOption],
  phase: 'deliberating' | 'selected',
  selectedIndex: number,
  onlyShowSelectedPill: boolean = false
) {
  const pillW = 92;
  const pillH = 21;

  // Fan geometry with wider separation so cards never touch or overlap:
  // Top pill gently inclined, center pill horizontal (0 rad), bottom pill gently inclined opposite!
  const tiltAngles =
    side === 'left'
      ? [0.16, 0.0, -0.16] // Fanning outward to the left
      : [-0.16, 0.0, 0.16]; // Fanning outward to the right

  // Expanded vertical spacing (-33px, 0px, +33px) for clean breathing room between the 3 emotion cards
  const verticalOffsets = [-33, 0, 33];
  const horizontalOffsets =
    side === 'left'
      ? [-pillW * 0.54 + 4, -pillW * 0.62, -pillW * 0.54 + 4]
      : [pillW * 0.54 - 4, pillW * 0.62, pillW * 0.54 - 4];

  for (let idx = 0; idx < 3; idx++) {
    const opt = options[idx];
    const def = TREECHAT_EMOTIONS[opt.emotionId];
    const isChosen = phase === 'selected' && selectedIndex === idx;
    const isDimmed = phase === 'selected' && selectedIndex !== idx;

    if (onlyShowSelectedPill && !isChosen) {
      continue;
    }

    // Subtle deliberation scan pulse before selection
    const scanPulse =
      phase === 'deliberating'
        ? 1 + Math.max(0, Math.sin(performance.now() * 0.008 - idx * 1.4)) * 0.035
        : isChosen
        ? 1.08
        : 0.95;

    const px = originX + (onlyShowSelectedPill ? horizontalOffsets[1] : horizontalOffsets[idx]);
    const py = originY + (onlyShowSelectedPill ? 0 : verticalOffsets[idx]);
    const angle = onlyShowSelectedPill ? 0 : tiltAngles[idx];

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);
    ctx.scale(scanPulse, scanPulse);

    drawSingleGlossyEmotionPill(
      ctx,
      pillW,
      pillH,
      def,
      opt.phrase,
      isChosen,
      isDimmed
    );

    ctx.restore();
  }
}

/**
 * Renders a single 3D Glossy Emotion Pill with Silver Rim, White Vector Emotion Icon,
 * and Fictional NPC Language Text (Matches the 4 Emotion Reference Sheets!)
 */
function drawSingleGlossyEmotionPill(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  def: TreeChatEmotionDef,
  phrase: string,
  isChosen: boolean,
  isDimmed: boolean
) {
  const r = h * 0.5;
  const x = -w * 0.5;
  const y = -h * 0.5;

  // 1. Drop shadow & outer metallic silver/white capsule bezel
  ctx.shadowColor = isChosen
    ? def.colorTop
    : 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = isChosen ? 9 : 4;
  ctx.shadowOffsetY = isChosen ? 0 : 2;

  ctx.fillStyle = isChosen
    ? '#FFFFFF'
    : isDimmed
    ? '#94A3B8'
    : '#CBD5E1';
  ctx.beginPath();
  ctx.roundRect(x - 1.5, y - 1.5, w + 3, h + 3, r + 1.5);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // 2. Inner 3D Pill Body Fill
  const bodyGrad = ctx.createLinearGradient(0, y, 0, y + h);
  if (isDimmed) {
    // Darkened unchosen state (matches Reference Image 7: image_cd5f4c02.png!)
    bodyGrad.addColorStop(0, def.colorDimmed);
    bodyGrad.addColorStop(1, '#090D16');
  } else {
    bodyGrad.addColorStop(0, def.colorTop);
    bodyGrad.addColorStop(0.52, def.colorMid);
    bodyGrad.addColorStop(1, def.colorBottom);
  }

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();

  // 3. Top-Left 3D Glossy Specular Highlight Crescent (signature look from the reference sheets)
  if (!isDimmed) {
    const shineGrad = ctx.createLinearGradient(0, y + 1.2, 0, y + h * 0.55);
    shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.62)');
    shineGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = shineGrad;
    ctx.beginPath();
    ctx.roundRect(x + 3, y + 1.2, w - 6, h * 0.44, (h * 0.44) * 0.5);
    ctx.fill();
  }

  // 4. Left White Vector Emotion Icon (scaled 40% smaller)
  const iconCx = x + 12.5;
  const iconCy = 0;
  ctx.save();
  ctx.globalAlpha = isDimmed ? 0.35 : 1.0;
  drawEmotionVectorIcon(ctx, iconCx, iconCy, 6.3, def.icon, isDimmed ? def.colorDimmed : def.colorBottom);

  // 5. Emotion / Sentiment / State Label (e.g., "CURIOSO", "RAIVA", "CONFUSO", "DIVERTIDO", "AMOROSO")
  const stateLabel = getShortEmotionPillStateLabel(def.id);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 8.5px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = 2.5;
  ctx.fillText(stateLabel, 7, 0.5, w - 26);

  ctx.restore();
}

/**
 * Draws the crisp white vector emotion face/symbol on the left side of the pill
 */
function drawEmotionVectorIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  icon: TreeChatIconType,
  cutoutColor: string
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#FFFFFF';

  if (icon === 'heart') {
    ctx.beginPath();
    ctx.moveTo(0, r * 0.75);
    ctx.bezierCurveTo(-r * 1.2, r * 0.1, -r * 1.1, -r * 0.85, 0, -r * 0.25);
    ctx.bezierCurveTo(r * 1.1, -r * 0.85, r * 1.2, r * 0.1, 0, r * 0.75);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (icon === 'question') {
    ctx.font = `900 ${Math.round(r * 1.8)}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', 0, 0.5);
    ctx.restore();
    return;
  }

  if (icon === 'magnifier') {
    ctx.lineWidth = Math.max(1.2, r * 0.24);
    ctx.beginPath();
    ctx.arc(-1.5, -1.5, r * 0.56, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(1.8, 1.8);
    ctx.lineTo(r * 0.8, r * 0.8);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (icon === 'trophy') {
    ctx.beginPath();
    ctx.arc(0, -2, r * 0.62, 0, Math.PI);
    ctx.lineTo(-r * 0.62, -r * 0.7);
    ctx.lineTo(r * 0.62, -r * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-2, r * 0.35, 4, r * 0.45);
    ctx.fillRect(-r * 0.45, r * 0.72, r * 0.9, 2.5);
    ctx.restore();
    return;
  }

  if (icon === 'muscle') {
    // Flexed bicep / power arm vector
    ctx.lineWidth = Math.max(1.3, r * 0.22);
    ctx.beginPath();
    ctx.arc(r * 0.1, -r * 0.1, r * 0.45, Math.PI * 0.9, Math.PI * 1.85);
    ctx.lineTo(r * 0.55, r * 0.35);
    ctx.lineTo(-r * 0.35, r * 0.45);
    ctx.lineTo(-r * 0.45, -r * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (icon === 'ghost') {
    // Spectral cute ghost silhouette
    ctx.beginPath();
    ctx.arc(0, -r * 0.2, r * 0.55, Math.PI, 0);
    ctx.lineTo(r * 0.55, r * 0.55);
    ctx.lineTo(r * 0.25, r * 0.35);
    ctx.lineTo(0, r * 0.55);
    ctx.lineTo(-r * 0.25, r * 0.35);
    ctx.lineTo(-r * 0.55, r * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = cutoutColor;
    ctx.beginPath();
    ctx.arc(-r * 0.22, -r * 0.2, 1.4, 0, Math.PI * 2);
    ctx.arc(r * 0.22, -r * 0.2, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (icon === 'broken_heart') {
    ctx.beginPath();
    ctx.moveTo(0, r * 0.75);
    ctx.bezierCurveTo(-r * 1.2, r * 0.1, -r * 1.1, -r * 0.85, 0, -r * 0.25);
    ctx.bezierCurveTo(r * 1.1, -r * 0.85, r * 1.2, r * 0.1, 0, r * 0.75);
    ctx.fill();
    ctx.strokeStyle = cutoutColor;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.4);
    ctx.lineTo(-r * 0.2, -r * 0.1);
    ctx.lineTo(r * 0.18, r * 0.15);
    ctx.lineTo(-r * 0.12, r * 0.45);
    ctx.lineTo(0, r * 0.75);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (icon === 'mask') {
    // Masquerade mystery mask
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.8, r * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = cutoutColor;
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, 0, r * 0.22, r * 0.16, -0.2, 0, Math.PI * 2);
    ctx.ellipse(r * 0.35, 0, r * 0.22, r * 0.16, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Standard White Circle Face Base for Facial Emotion Icons
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Sun rays around face if 'sun'
  if (icon === 'sun') {
    ctx.lineWidth = 1.8;
    for (let a = 0; a < 8; a++) {
      const ang = (a * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * (r + 1.5), Math.sin(ang) * (r + 1.5));
      ctx.lineTo(Math.cos(ang) * (r + 4.2), Math.sin(ang) * (r + 4.2));
      ctx.stroke();
    }
  }

  // Facial features cut out using the pill's dark shade
  ctx.fillStyle = cutoutColor;
  ctx.strokeStyle = cutoutColor;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';

  if (icon === 'angry' || icon === 'rage') {
    // Angry slanted brows + frown
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, -r * 0.38);
    ctx.lineTo(-r * 0.15, -r * 0.12);
    ctx.moveTo(r * 0.55, -r * 0.38);
    ctx.lineTo(r * 0.15, -r * 0.12);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(-r * 0.34, -r * 0.05, 1.5, 0, Math.PI * 2);
    ctx.arc(r * 0.34, -r * 0.05, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, r * 0.58, r * 0.38, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else if (icon === 'laugh' || icon === 'star_eyes') {
    // Happy >< eyes + big open laugh mouth
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.18, 1.7, 0, Math.PI * 2);
    ctx.arc(r * 0.35, -r * 0.18, 1.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, r * 0.08, r * 0.52, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
  } else if (icon === 'bored_zzz' || icon === 'serene') {
    // Closed peaceful/sleepy eyes + small mouth
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.1, r * 0.22, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(r * 0.35, -r * 0.1, r * 0.22, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, r * 0.32, icon === 'bored_zzz' ? 2.2 : r * 0.3, 0, Math.PI);
    ctx.stroke();
  } else if (icon === 'sunglasses') {
    // Cool sunglasses + smirk
    ctx.fillRect(-r * 0.72, -r * 0.32, r * 0.62, r * 0.38);
    ctx.fillRect(r * 0.1, -r * 0.32, r * 0.62, r * 0.38);
    ctx.fillRect(-r * 0.2, -r * 0.25, r * 0.4, 2);
    ctx.beginPath();
    ctx.arc(0, r * 0.2, r * 0.38, 0.1 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  } else if (icon === 'cry') {
    // Sad eyes + tear + frown
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.15, 1.6, 0, Math.PI * 2);
    ctx.arc(r * 0.35, -r * 0.15, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, r * 0.58, r * 0.36, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else if (icon === 'shock') {
    // Wide eyes + O mouth
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.2, 1.7, 0, Math.PI * 2);
    ctx.arc(r * 0.35, -r * 0.2, 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, r * 0.32, r * 0.24, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Friendly smile / blush / wink
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.15, 1.6, 0, Math.PI * 2);
    ctx.arc(r * 0.35, -r * 0.15, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, r * 0.12, r * 0.42, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  }

  ctx.restore();
}
