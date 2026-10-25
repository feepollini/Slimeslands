// i18n.ts — Idiomas do GAME (lobby, deck, duelo...). A forja fica fora.
export type Lang = 'pt' | 'en' | 'es';

const DICT: Record<string, Record<Lang, string>> = {
// ─── NAV (BottomNav) ───
'nav.deck': { pt: 'DECK', en: 'DECK', es: 'MAZO' },
'nav.battle': { pt: 'BATALHAR', en: 'BATTLE', es: 'BATALLA' },
'nav.start': { pt: 'INICIAR!', en: 'START!', es: '¡INICIAR!' },
'nav.map': { pt: 'MAPA', en: 'MAP', es: 'MAPA' },
'nav.academy': { pt: 'INVENTÁRIO', en: 'INVENTORY', es: 'INVENTARIO' },
'nav.store': { pt: 'LOJA', en: 'STORE', es: 'TIENDA' },
// ─── HEADER ───
'header.name': { pt: 'CRIADOR DE LENDAS', en: 'LEGEND MAKER', es: 'CREADOR DE LEYENDAS' },
'header.lv': { pt: 'LV', en: 'LV', es: 'NV' },
'header.xps': { pt: 'XPS', en: 'XP', es: 'XP' },
// ─── LATERAIS (SideActions) ───
'side.missoes': { pt: 'MISSÕES', en: 'QUESTS', es: 'MISIONES' },
'side.correio': { pt: 'CORREIO', en: 'MAIL', es: 'CORREO' },
'side.ranking': { pt: 'RANKING', en: 'RANKING', es: 'RANKING' },
'side.amigos': { pt: 'AMIGOS', en: 'FRIENDS', es: 'AMIGOS' },
'side.eventos': { pt: 'EVENTOS', en: 'EVENTS', es: 'EVENTOS' },
'side.ajuda': { pt: 'AJUDA', en: 'HELP', es: 'AYUDA' },
'side.wallet': { pt: 'CARTEIRA', en: 'WALLET', es: 'CARTERA' },
'side.forja': { pt: 'FORJA', en: 'FORGE', es: 'FORJA' },
'side.mapa': { pt: 'MAPA', en: 'MAP', es: 'MAPA' },
'side.mobile': { pt: 'DISPOSITIVO', en: 'DEVICE', es: 'DISPOSITIVO' },
'side.checkin': { pt: 'CHECK-IN', en: 'CHECK-IN', es: 'CHECK-IN' },
'side.soon': { pt: 'EM BREVE', en: 'COMING SOON', es: 'PRÓXIMAMENTE' },
// ─── HUB ───
'hub.storeLocked': { pt: 'LOJA BLOQUEADA', en: 'STORE LOCKED', es: 'TIENDA BLOQUEADA' },
// ─── SETTINGS ───
'set.title': { pt: 'AJUSTES', en: 'SETTINGS', es: 'AJUSTES' },
'set.audio': { pt: 'Áudio', en: 'Audio', es: 'Audio' },
'set.sfx': { pt: 'EFEITOS (SFX)', en: 'EFFECTS (SFX)', es: 'EFECTOS (SFX)' },
'set.ambient': { pt: 'MÚSICA AMBIENTE', en: 'AMBIENT MUSIC', es: 'MÚSICA AMBIENTE' },
'set.forgeDesc': { pt: 'EDITOR DE CENÁRIOS E CARTAS', en: 'SCENARIO & CARD EDITOR', es: 'EDITOR DE ESCENARIOS Y CARTAS' },
'set.forgeV2Desc': { pt: 'NOVA ARQUITETURA MODULAR', en: 'NEW MODULAR ARCHITECTURE', es: 'NUEVA ARQUITECTURA MODULAR' },
'set.lang': { pt: 'IDIOMA', en: 'LANGUAGE', es: 'IDIOMA' },
'set.skip': { pt: 'PULAR INTRO', en: 'SKIP INTRO', es: 'SALTAR INTRO' },
'set.skipOn': { pt: 'ATIVADO — recarregar vai direto ao hub', en: 'ON — reload goes straight to hub', es: 'ACTIVADO — recargar va directo al hub' },
'set.skipOff': { pt: 'DESATIVADO — recarregar mostra a intro', en: 'OFF — reload shows the intro', es: 'DESACTIVADO — recargar muestra la intro' },
// ─── NOMES DOS IDIOMAS ───
'lang.pt': { pt: 'PORTUGUÊS (BR)', en: 'PORTUGUESE (BR)', es: 'PORTUGUÉS (BR)' },
'lang.en': { pt: 'INGLÊS (EUA)', en: 'ENGLISH (US)', es: 'INGLÉS (EE. UU.)' },
'lang.es': { pt: 'ESPANHOL', en: 'SPANISH', es: 'ESPAÑOL' },
// ─── START (splash) ───
'start.madeBy': { pt: 'A GAME MADE BY ONE HAND', en: 'A GAME MADE BY ONE HAND', es: 'UN JUEGO HECHO POR UNA MANO' },
'start.by': { pt: 'BY', en: 'BY', es: 'POR' },
'start.tap': { pt: 'TOQUE PARA CONTINUAR', en: 'TAP TO CONTINUE', es: 'TOCA PARA CONTINUAR' },
// ─── STORE ───
'store.market': { pt: 'LOJA MERCADO', en: 'STORE MARKET', es: 'MERCADO' },
'store.soon': { pt: 'EM BREVE', en: 'COMING SOON', es: 'PRÓXIMAMENTE' },
'store.soonDesc': { pt: 'Estamos preparando novas cartas e expansões para sua jornada.', en: "We're preparing new cards and expansions for your journey.", es: 'Estamos preparando nuevas cartas y expansiones para tu viaje.' },
'store.back': { pt: 'VOLTAR AO HUB', en: 'BACK TO HUB', es: 'VOLVER AL HUB' },
// ─── GAME (quest runner, sem fase) ───
'game.noPhase': { pt: 'NENHUMA FASE CARREGADA', en: 'NO STAGE LOADED', es: 'NINGUNA FASE CARGADA' },
'game.noPhaseDesc': { pt: 'Crie uma fase no editor primeiro', en: 'Create a stage in the editor first', es: 'Crea una fase en el editor primero' },
'game.goEditor': { pt: 'IR PARA O EDITOR', en: 'GO TO EDITOR', es: 'IR AL EDITOR' },
// ─── ARSENAL (página) ───
'arsMain.prep': { pt: ' (PREPARAÇÃO)', en: ' (LOADOUT)', es: ' (PREPARACIÓN)' },
'arsMain.play': { pt: 'JOGAR ⚔️', en: 'PLAY ⚔️', es: 'JUGAR ⚔️' },
// ─── PERFIL ───
'profile.exp': { pt: 'EXPERIÊNCIA', en: 'EXPERIENCE', es: 'EXPERIENCIA' },
'profile.wins': { pt: 'VITÓRIAS', en: 'WINS', es: 'VICTORIAS' },
'profile.losses': { pt: 'DERROTAS', en: 'LOSSES', es: 'DERROTAS' },
'profile.cards': { pt: 'CARTAS', en: 'CARDS', es: 'CARTAS' },
'profile.trophies': { pt: 'CONQUISTAS & TROFÉUS', en: 'ACHIEVEMENTS & TROPHIES', es: 'LOGROS Y TROFEOS' },
'profile.level': { pt: 'NÍVEL', en: 'LEVEL', es: 'NIVEL' },
// ─── MAPA ───
'map.map': { pt: 'MAPA', en: 'MAP', es: 'MAPA' },
'map.phases': { pt: 'FASES CRIADAS', en: 'CREATED STAGES', es: 'FASES CREADAS' },
'map.noPhases': { pt: 'Nenhuma fase salva', en: 'No saved stages', es: 'Ninguna fase guardada' },
'map.phaseFallback': { pt: 'Fase', en: 'Stage', es: 'Fase' },
'map.preview': { pt: 'MODO PREVIEW - Spawn Ativo', en: 'PREVIEW MODE - Spawn Active', es: 'MODO VISTA PREVIA - Spawn activo' },
'map.playing': { pt: 'JOGANDO', en: 'PLAYING', es: 'JUGANDO' },
'map.previewTag': { pt: 'PRÉVIA', en: 'PREVIEW', es: 'VISTA' },
'map.battle': { pt: 'BATALHA', en: 'BATTLE', es: 'BATALLA' },
'map.fight': { pt: 'COMBATER', en: 'FIGHT', es: 'LUCHAR' },
'map.back': { pt: 'RETORNAR', en: 'RETURN', es: 'VOLVER' },
'map.continue': { pt: 'CONTINUAR ▼', en: 'CONTINUE ▼', es: 'CONTINUAR ▼' },
'map.camera': { pt: 'CÂMERA', en: 'CAMERA', es: 'CÁMARA' },
// ─── RUNTIME (quest runner) ───
'runtime.loading': { pt: 'CARREGANDO FASE', en: 'LOADING STAGE', es: 'CARGANDO FASE' },
'runtime.preparing': { pt: 'Preparando mundo...', en: 'Preparing world...', es: 'Preparando mundo...' },
'runtime.pressEnter': { pt: 'PRESSIONE E OU ENTER', en: 'PRESS E OR ENTER', es: 'PULSA E O ENTER' },
'runtime.paused': { pt: 'PAUSADO', en: 'PAUSED', es: 'EN PAUSA' },
'runtime.continue': { pt: 'CONTINUAR', en: 'CONTINUE', es: 'CONTINUAR' },
'runtime.restart': { pt: 'REINICIAR', en: 'RESTART', es: 'REINICIAR' },
'runtime.exit': { pt: 'SAIR PARA O MENU', en: 'EXIT TO MENU', es: 'SALIR AL MENÚ' },
'runtime.defeat': { pt: 'DERROTA', en: 'DEFEAT', es: 'DERROTA' },
'runtime.retry': { pt: 'TENTAR NOVAMENTE', en: 'TRY AGAIN', es: 'INTENTAR DE NUEVO' },
'runtime.victory': { pt: 'VITÓRIA!', en: 'VICTORY!', es: '¡VICTORIA!' },
'runtime.phaseDone': { pt: 'Fase completada!', en: 'Stage complete!', es: '¡Fase completada!' },
'runtime.next': { pt: 'PRÓXIMA FASE', en: 'NEXT STAGE', es: 'PRÓXIMA FASE' },
'runtime.hp': { pt: 'VIDA', en: 'HP', es: 'VIDA' },
'runtime.phase': { pt: 'FASE 1', en: 'STAGE 1', es: 'FASE 1' },
'runtime.explore': { pt: 'EXPLORAR', en: 'EXPLORE', es: 'EXPLORAR' },
'runtime.map': { pt: 'MAPA', en: 'MAP', es: 'MAPA' },
// ─── ARSENAL (deck builder) ───
'ars.showPrep': { pt: 'MOSTRAR PREPARAÇÃO', en: 'SHOW LOADOUT', es: 'MOSTRAR PREPARACIÓN' },
'ars.collapse': { pt: 'RECOLHER', en: 'COLLAPSE', es: 'OCULTAR' },
'ars.slot': { pt: 'SLOT', en: 'SLOT', es: 'SLOT' },
'ars.back': { pt: 'BACK', en: 'BACK', es: 'BACK' },
'ars.save': { pt: 'SALVAR DECK', en: 'SAVE DECK', es: 'GUARDAR MAZO' },
'ars.saved': { pt: 'SALVO!', en: 'SAVED!', es: '¡GUARDADO!' },
'ars.autofill': { pt: 'AUTO-PREENCHER', en: 'AUTO-FILL', es: 'AUTORRELLENAR' },
'ars.search': { pt: 'BUSCAR...', en: 'SEARCH...', es: 'BUSCAR...' },
'ars.all': { pt: 'TODAS', en: 'ALL', es: 'TODAS' },
'ars.common': { pt: 'COMUM', en: 'COMMON', es: 'COMÚN' },
'ars.rare': { pt: 'RARO', en: 'RARE', es: 'RARA' },
'ars.epic': { pt: 'ÉPICO', en: 'EPIC', es: 'ÉPICA' },
'ars.legendary': { pt: 'LENDÁRIO', en: 'LEGENDARY', es: 'LEGENDARIA' },
'ars.cards': { pt: 'CARTAS', en: 'CARDS', es: 'CARTAS' },
'ars.artifacts': { pt: 'ARTEFATOS', en: 'ARTIFACTS', es: 'ARTEFACTOS' },
'ars.boards': { pt: 'TABULEIROS', en: 'BOARDS', es: 'TABLEROS' },
'ars.favs': { pt: 'COLEÇÃO FAVORITOS', en: 'FAVORITES COLLECTION', es: 'COLECCIÓN FAVORITOS' },
'ars.locked': { pt: 'BLOQUEADO', en: 'LOCKED', es: 'BLOQUEADO' },
'ars.noArtifacts': { pt: 'NENHUM ARTEFATO ENCONTRADO', en: 'NO ARTIFACTS FOUND', es: 'NINGÚN ARTEFACTO ENCONTRADO' },
'ars.inDeck': { pt: 'NO DECK', en: 'IN DECK', es: 'EN MAZO' },
'ars.equip': { pt: 'EQUIPAR', en: 'EQUIP', es: 'EQUIPAR' },
'ars.remove': { pt: 'REMOVER', en: 'REMOVE', es: 'QUITAR' },
'ars.details': { pt: 'DETALHES', en: 'DETAILS', es: 'DETALLES' },
'ars.switchTitle': { pt: 'TROCAR DECK?', en: 'SWITCH DECK?', es: '¿CAMBIAR MAZO?' },
'ars.switchMsg': { pt: 'Deseja carregar as configurações do Slot {slot}?', en: 'Load Slot {slot} settings?', es: '¿Cargar la configuración del espacio {slot}?' },
'ars.cancel': { pt: 'CANCELAR', en: 'CANCEL', es: 'CANCELAR' },
'ars.load': { pt: 'CARREGAR', en: 'LOAD', es: 'CARGAR' },
'ars.ability': { pt: 'Habilidade', en: 'Ability', es: 'Habilidad' },
'ars.equipVerb': { pt: 'Equipar', en: 'Equip', es: 'Equipar' },
// ─── TABULEIRO (BoardScreen) ───
'board.opponent': { pt: 'OPONENTE', en: 'OPPONENT', es: 'OPONENTE' },
'board.you': { pt: 'VOCÊ', en: 'YOU', es: 'TÚ' },
'board.actions': { pt: 'AÇÕES', en: 'ACTIONS', es: 'ACCIONES' },
'board.surrender': { pt: 'Desistir da Batalha', en: 'Forfeit Battle', es: 'Abandonar la batalla' },
'board.sac': { pt: 'SACRIFICAR CARTA', en: 'SACRIFICE CARD', es: 'SACRIFICAR CARTA' },
'board.useNow': { pt: 'USAR AGORA', en: 'USE NOW', es: 'USAR AHORA' },
'board.mana': { pt: 'MANA', en: 'MANA', es: 'MANÁ' },
'board.stamina': { pt: 'STAMINA', en: 'STAMINA', es: 'STAMINA' },
'board.wait': { pt: 'AGUARDE', en: 'WAIT', es: 'ESPERA' },
'board.end': { pt: 'ENCERRAR', en: 'END TURN', es: 'TERMINAR' },
'board.confirm': { pt: 'CONFIRMAÇÃO', en: 'CONFIRMATION', es: 'CONFIRMACIÓN' },
'board.confirmDef': { pt: 'Mensagem...', en: 'Message...', es: 'Mensaje...' },
'board.yes': { pt: 'SIM', en: 'YES', es: 'SÍ' },
'board.no': { pt: 'NÃO', en: 'NO', es: 'NO' },
'board.perfect': { pt: 'PERFEITO!', en: 'PERFECT!', es: '¡PERFECTO!' },
'board.heads': { pt: 'CARA', en: 'HEADS', es: 'CARA' },
'board.tails': { pt: 'COROA', en: 'TAILS', es: 'CRUZ' },
'board.destiny': { pt: 'ESCOLHA SEU DESTINO', en: 'CHOOSE YOUR DESTINY', es: 'ELIGE TU DESTINO' },
'board.destinyQuote': { pt: '"Onde a neve cai, a inteligência é a única lanterna."', en: '"Where snow falls, wit is the only lantern."', es: '"Donde cae la nieve, el ingenio es la única linterna."' },
'board.easy': { pt: 'DESBRAVADOR', en: 'PATHFINDER', es: 'EXPLORADOR' },
'board.tierEasy': { pt: 'FÁCIL', en: 'EASY', es: 'FÁCIL' },
'board.easyDesc': { pt: 'IA limitada • Sem artefatos inimigos', en: 'Limited AI • No enemy artifacts', es: 'IA limitada • Sin artefactos enemigos' },
'board.mid': { pt: 'EQUILIBRISTA', en: 'BALANCED', es: 'EQUILIBRADO' },
'board.tierMid': { pt: 'MÉDIO', en: 'MEDIUM', es: 'MEDIO' },
'board.midDesc': { pt: 'IA estratégica • Combos moderados', en: 'Strategic AI • Moderate combos', es: 'IA estratégica • Combos moderados' },
'board.hard': { pt: 'MESTRE DO INVERNO', en: 'MASTER OF WINTER', es: 'MAESTRO DEL INVIERNO' },
'board.tierHard': { pt: 'DIFÍCIL', en: 'HARD', es: 'DIFÍCIL' },
'board.confirmGo': { pt: 'CONFIRMAR', en: 'CONFIRM', es: 'CONFIRMAR' },
'board.hardDesc': { pt: 'IA impiedosa • Uso total de artefatos', en: 'Ruthless AI • Full artifact use', es: 'IA despiadada • Uso total de artefactos' },
'board.omen': { pt: 'Um antigo presságio', en: 'An ancient omen', es: 'Un antiguo presagio' },
'board.luck': { pt: 'SORTE DE QUEM COMEÇA', en: 'STARTER’S LUCK', es: 'SUERTE DEL QUE EMPIEZA' },
'board.drawing': { pt: 'Sorteando...', en: 'Drawing...', es: 'Sorteando...' },
'board.summonCost': { pt: 'Custo de Invocação', en: 'Summon Cost', es: 'Coste de invocación' },
'board.empty': { pt: 'Vazio', en: 'Empty', es: 'Vacío' },
'board.pv': { pt: 'PV', en: 'HP', es: 'PV' },
'board.st.stun': { pt: 'Atordoado', en: 'Stunned', es: 'Aturdido' },
'board.st.poison': { pt: 'Envenenado', en: 'Poisoned', es: 'Envenenado' },
'board.st.shield': { pt: 'Escudo', en: 'Shield', es: 'Escudo' },
'board.st.burn': { pt: 'Queimando', en: 'Burning', es: 'Ardiendo' },
'board.st.regen': { pt: 'Regeneração', en: 'Regeneration', es: 'Regeneración' },
'board.st.camo': { pt: 'Camuflagem', en: 'Camouflage', es: 'Camuflaje' },
'board.st.double': { pt: 'Ataque Duplo', en: 'Double Strike', es: 'Ataque doble' },
'board.st.exposed': { pt: 'Exposto', en: 'Exposed', es: 'Expuesto' },
'board.st.vamp': { pt: 'Vampirismo', en: 'Vampirism', es: 'Vampirismo' },
'board.fs.stun': { pt: 'Paralisada', en: 'Paralyzed', es: 'Paralizada' },
'board.fs.poison': { pt: 'Veneno', en: 'Poison', es: 'Veneno' },
'board.fs.shield': { pt: 'Escudo', en: 'Shield', es: 'Escudo' },
// ─── DUELO (battleMain) ───
'bt.destinyWin': { pt: 'O DESTINO ESTÁ COM VOCÊ', en: 'DESTINY IS WITH YOU', es: 'EL DESTINO ESTÁ CONTIGO' },
'bt.destinyLose': { pt: 'A IA RECLAMA O INÍCIO', en: 'THE AI CLAIMS THE START', es: 'LA IA RECLAMA EL INICIO' },
'bt.yourTurn': { pt: 'SEU TURNO!', en: 'YOUR TURN!', es: '¡TU TURNO!' },
'bt.aiTurn': { pt: 'TURNO DA IA!', en: 'AI TURN!', es: '¡TURNO DE LA IA!' },
'bt.oppTurn': { pt: 'TURNO DO OPONENTE', en: "OPPONENT'S TURN", es: 'TURNO DEL RIVAL' },
'bt.giveUp': { pt: 'DESISTIR', en: 'FORFEIT', es: 'ABANDONAR' },
'bt.giveUpMsg': { pt: 'Tem certeza que deseja recuar da batalha? Isso custará sua dignidade.', en: 'Are you sure you want to retreat? It will cost your dignity.', es: '¿Seguro que quieres retirarte de la batalla? Te costará tu dignidad.' },
'bt.tooEarly': { pt: 'CEDO DEMAIS!', en: 'TOO EARLY!', es: '¡DEMASIADO PRONTO!' },
'bt.tooLate': { pt: 'TARDE DEMAIS!', en: 'TOO LATE!', es: '¡DEMASIADO TARDE!' },
'bt.parryCost': { pt: 'CUSTO PARRY > ESTAMINA', en: 'PARRY COST > STAMINA', es: 'COSTE PARRY > STAMINA' },
'bt.parryPerfect': { pt: 'PERFEITO!', en: 'PERFECT!', es: '¡PERFECTO!' },
'bt.parryReflected': { pt: 'PARRY! REFLETIDO!', en: 'PARRY! REFLECTED!', es: '¡PARRY! ¡REFLEJADO!' },
'bt.chooseTarget': { pt: 'ESCOLHA O ALVO', en: 'CHOOSE TARGET', es: 'ELIGE OBJETIVO' },
'bt.chooseSlot': { pt: 'ESCOLHA UM SLOT', en: 'CHOOSE A SLOT', es: 'ELIGE UN ESPACIO' },
'bt.oppDrew': { pt: 'SEU OPONENTE TIROU UMA CARTA', en: 'YOUR OPPONENT DREW A CARD', es: 'TU RIVAL ROBÓ UNA CARTA' },
'bt.noActions': { pt: 'SEM AÇÕES RESTANTES', en: 'NO ACTIONS LEFT', es: 'SIN ACCIONES RESTANTES' },
'bt.noMana': { pt: 'MANA INSUFICIENTE', en: 'INSUFFICIENT MANA', es: 'MANÁ INSUFICIENTE' },
'bt.summoned': { pt: 'CARTA INVOCADA!', en: 'CARD SUMMONED!', es: '¡CARTA INVOCADA!' },
'bt.direct': { pt: 'ATAQUE DIRETO!', en: 'DIRECT HIT!', es: '¡ATAQUE DIRECTO!' },
'bt.cbtStun': { pt: 'ESTADO: ATORDOADO', en: 'STATUS: STUNNED', es: 'ESTADO: ATURDIDO' },
'bt.cbtBurn': { pt: 'ESTADO: QUEIMANDO', en: 'STATUS: BURNING', es: 'ESTADO: ARDIENDO' },
'bt.cbtHeal': { pt: 'CURA VITAL', en: 'VITAL HEAL', es: 'CURA VITAL' },
'bt.cbtShield': { pt: 'ESCUDO ATIVO', en: 'SHIELD UP', es: 'ESCUDO ACTIVO' },
'bt.cbtDrain': { pt: 'DRENO DE ALMA', en: 'SOUL DRAIN', es: 'DRENAJE DE ALMA' },
'bt.touchSlot': { pt: 'TOQUE NO SLOT', en: 'TAP A SLOT', es: 'TOCA UN ESPACIO' },
'bt.handFull': { pt: 'MÃO CHEIA!', en: 'HAND FULL!', es: '¡MANO LLENA!' },
'bt.deckEmpty': { pt: 'DECK VAZIO!', en: 'DECK EMPTY!', es: '¡MAZO VACÍO!' },
'bt.choose': { pt: 'ESCOLHA UMA CARTA', en: 'CHOOSE A CARD', es: 'ELIGE UNA CARTA' },
'bt.remaining': { pt: 'RESTANTES', en: 'REMAINING', es: 'RESTANTES' },
'bt.skill': { pt: 'Habilidade', en: 'Skill', es: 'Habilidad' },
'bt.aiAttacks': { pt: 'IA ATACA!', en: 'AI ATTACKS!', es: '¡IA ATACA!' },
'bt.noCardsField': { pt: 'Nenhuma carta sua em campo!', en: 'No cards of yours on the field!', es: '¡Ninguna carta en tu campo!' },
'bt.sacrifice': { pt: 'SACRIFÍCIO! +1 CARTA', en: 'SACRIFICE! +1 CARD', es: '¡SACRIFICIO! +1 CARTA' },
'bt.insufficientResources': { pt: 'RECURSOS INSUFICIENTES!', en: 'INSUFFICIENT RESOURCES!', es: '¡RECURSOS INSUFICIENTES!' },
'bt.winTitle': { pt: 'VITÓRIA ALCANÇADA', en: 'VICTORY ACHIEVED', es: 'VICTORIA LOGRADA' },
'bt.winSub': { pt: 'Grande inimigo abatido.', en: 'Great enemy slain.', es: 'Gran enemigo abatido.' },
'bt.loseTitle': { pt: 'VOCÊ MORREU', en: 'YOU DIED', es: 'HAS MUERTO' },
'bt.loseSub': { pt: 'Sua jornada na neve encontrou um fim.', en: 'Your journey in the snow has met its end.', es: 'Tu viaje en la nieve ha llegado a su fin.' },
'bt.cowardTitle': { pt: 'VOCÊ FOI COVARDE', en: 'YOU WERE A COWARD', es: 'FUISTE UN COBARDE' },
'bt.cowardSub': { pt: 'Recuou da luta e perdeu sua honra.', en: 'You fled the fight and lost your honor.', es: 'Huiste de la lucha y perdiste tu honor.' },
'bt.hpLeft': { pt: 'PV Restante', en: 'Remaining HP', es: 'PV restantes' },
'bt.battleCoins': { pt: 'Moedas de Batalha', en: 'Battle coins', es: 'Monedas de batalla' },
'bt.cardsPlayed': { pt: 'Cartas Jogadas', en: 'Cards played', es: 'Cartas jugadas' },
'bt.diamonds': { pt: 'Diamantes Obtidos', en: 'Diamonds earned', es: 'Diamantes obtenidos' },
'bt.back': { pt: 'Retornar', en: 'Return', es: 'Volver' },
'bt.level': { pt: 'NÍVEL', en: 'LEVEL', es: 'NIVEL' },
// ─── LOJA (vitrine do game) ───
'store2.buy': { pt: 'COMPRAR', en: 'BUY', es: 'COMPRAR' },
'store2.owned': { pt: 'ADQUIRIDO ✓', en: 'OWNED ✓', es: 'ADQUIRIDO ✓' },
'store2.noFunds': { pt: 'SALDO INSUFICIENTE!', en: 'INSUFFICIENT FUNDS!', es: '¡SALDO INSUFICIENTE!' },
'store2.endsIn': { pt: 'TROCA EM', en: 'RESETS IN', es: 'CAMBIA EN' },
'store2.soon': { pt: 'EM BREVE', en: 'COMING SOON', es: 'PRÓXIMAMENTE' },
'store2.cards': { pt: 'CARTAS', en: 'CARDS', es: 'CARTAS' },
'store2.deck': { pt: 'DECK COMPLETO', en: 'FULL DECK', es: 'MAZO COMPLETO' },
'store2.packs': { pt: 'PACOTES', en: 'PACKS', es: 'PAQUETES' },
'store2.empty': { pt: 'VAZIO — CONFIGURE NA FORJA', en: 'EMPTY — SET IT IN THE FORGE', es: 'VACÍO — CONFIGÚRALO EN LA FORJA' },
// ─── LOJA: SEÇÕES E AÇÕES (st.*) ───
'st.packs': { pt: 'PACOTES & BOOSTERS (CARROSSEL)', en: 'PACKS & BOOSTERS', es: 'PACKS Y BOOSTERS' },
'st.packs_split': { pt: 'DESTAQUES ESPECIAIS (SPLIT)', en: 'FEATURED (SPLIT)', es: 'DESTACADOS (SPLIT)' },
'st.daily': { pt: 'OFERTAS DO DIA', en: "TODAY'S DEALS", es: 'OFERTAS DEL DÍA' },
'st.rare': { pt: 'CARTAS RARAS', en: 'RARE CARDS', es: 'CARTAS RARAS' },
'st.decks': { pt: 'DECKS COMPLETOS', en: 'FULL DECKS', es: 'MAZOS COMPLETOS' },
'st.coins': { pt: 'MOEDAS', en: 'COINS', es: 'MONEDAS' },
'st.gems': { pt: 'DIAMANTES', en: 'DIAMONDS', es: 'DIAMANTES' },
'st.artifacts': { pt: 'ARTEFATOS', en: 'ARTIFACTS', es: 'ARTEFACTOS' },
'st.open3d': { pt: 'ABRIR EM 3D', en: 'OPEN IN 3D', es: 'ABRIR EN 3D' },
'st.open': { pt: 'ABRIR', en: 'OPEN', es: 'ABRIR' },
'st.specialPool': { pt: 'POOL ESPECIAL', en: 'SPECIAL POOL', es: 'POOL ESPECIAL' },
'st.deckCards': { pt: 'CARTAS DO DECK (DESLIZE ‹ ›)', en: 'DECK CARDS (SWIPE ‹ ›)', es: 'CARTAS DEL MAZO (DESLIZA ‹ ›)' },
'st.viewAll': { pt: 'Ver Todas em Tela Cheia', en: 'View All Fullscreen', es: 'Ver Todas en Pantalla Completa' },
'st.cardsCount': { pt: 'CARTAS', en: 'CARDS', es: 'CARTAS' },
// ─── FIM DE BATALHA (bt.end.*) ───
'bt.end.rewards': { pt: 'RECOMPENSAS', en: 'REWARDS', es: 'RECOMPENSAS' },
'bt.end.coins': { pt: 'MOEDAS', en: 'COINS', es: 'MONEDAS' },
'bt.end.gems': { pt: 'DIAMANTES', en: 'DIAMONDS', es: 'DIAMANTES' },
'bt.end.metrics': { pt: 'MÉTRICAS DA BATALHA', en: 'BATTLE METRICS', es: 'MÉTRICAS DE BATALLA' },
'bt.end.enemies': { pt: 'INIMIGOS', en: 'ENEMIES', es: 'ENEMIGOS' },
'bt.end.cards': { pt: 'CARTAS', en: 'CARDS', es: 'CARTAS' },
'bt.end.continue': { pt: 'CONTINUAR', en: 'CONTINUE', es: 'CONTINUAR' },
'bt.end.attack': { pt: 'ATACAR', en: 'ATTACK', es: 'ATACAR' },
// ─── TABULEIRO (board.* faltantes) ───
'board.attack': { pt: 'ATACAR', en: 'ATTACK', es: 'ATACAR' },
'board.back': { pt: 'VOLTAR', en: 'GO BACK', es: 'VOLVER' }
};

const LANG_KEY = 'low_lang';

function storedLang(): Lang | null {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === 'en' || v === 'es' || v === 'pt') return v;
  } catch {}
  return null;
}

// Detecta pela região: Brasil/Portugal e demais países lusófonos -> pt;
// Espanha e América Latina hispânica -> es; resto do mundo -> en.
// Só vale quando o jogador ainda não escolheu manualmente (Ajustes).
function detectLang(): Lang {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const city = tz.split('/')[1] || '';
    if (/Sao_Paulo|Bahia|Belem|Boa_Vista|Campo_Grande|Cuiaba|Eirunepe|Fernando_de_Noronha|Fortaleza|Maceio|Manaus|Noronha|Porto_Velho|Recife|Rio_Branco|Santarem|Araguaina|Lisbon|Madeira|Azores|Luanda|Maputo|Bissau|Sao_Tome|Dili|Cape_Verde|Praia/i.test(city)) return 'pt';
    if (/Madrid|Canary|Mexico|Cancun|Merida|Monterrey|Chihuahua|Hermosillo|Tijuana|Matamoros|Ojinaga|Bogota|Lima|Santiago|Buenos_Aires|Argentina|Caracas|La_Paz|Montevideo|Asuncion|San_Juan|Santo_Domingo|Havana|Panama|Costa_Rica|El_Salvador|Guatemala|Managua|Tegucigalpa|Guayaquil/i.test(city)) return 'es';
  } catch {}
  try {
    const nav = (navigator.language || '').toLowerCase();
    if (nav.startsWith('pt')) return 'pt';
    if (nav.startsWith('es')) return 'es';
  } catch {}
  return 'en';
}

let detected: Lang | null = null;

function resolvedLang(): Lang {
  const s = storedLang();
  if (s) return s;
  if (!detected) {
    detected = detectLang();
    try { localStorage.setItem(LANG_KEY, detected); } catch {}
    try { document.documentElement.lang = detected; } catch {}
  }
  return detected;
}

export function getLang(): Lang {
  return resolvedLang();
}

export function setLang(l: Lang) {
  try { localStorage.setItem('low_lang', l); } catch {}
  try { document.documentElement.lang = l; } catch {}
}

export function getSkipIntro(): boolean {
  try { return localStorage.getItem('low_skip_intro') === '1'; } catch {}
  return false;
}

export function setSkipIntro(on: boolean) {
  try { localStorage.setItem('low_skip_intro', on ? '1' : '0'); } catch {}
}

export function t(key: string): string {
  const e = DICT[key];
  if (!e) return key;
  return e[getLang()] ?? e.pt;
}

export function tx(key: string, vars: Record<string, string | number>): string {
  let s = t(key);
  for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(String(vars[k]));
  return s;
}

export const LANGS: { id: Lang; labelKey: string }[] = [
  { id: 'pt', labelKey: 'lang.pt' },
  { id: 'en', labelKey: 'lang.en' },
  { id: 'es', labelKey: 'lang.es' }
];
