import {
  CustomDeckData,
  getCustomDecks,
  saveCustomDecks,
  setActiveCustomDeck,
  getActiveCustomDeck,
  getMergedGameTemplatesSync,
  renderMatrixCardSVG,
  toggleDeckAvailability,
} from '../utils/HestridiaMatrixRenderer';

export class TabDecks {
  private callbacks: any;
  private decks: CustomDeckData[] = [];
  private activeDeck: CustomDeckData | null = null;
  private isCreateModalOpen: boolean = false;
  private managingDeckId: string | null = null;
  private renamingDeckId: string | null = null;
  private deletingDeckId: string | null = null;
  private confirmClearDeck: boolean = false;
  private manageFilterType: 'ALL' | 'Criatura' | 'Magia' = 'ALL';
  private manageSearchQuery: string = '';
  private matrixCards: any[] = [];
  private mountedContainer: HTMLElement | null = null;

  constructor(_state: any, callbacks: any) {
    this.callbacks = callbacks;
    this.refreshData();
  }

  public updateContext(_state: any, callbacks: any) {
    this.callbacks = callbacks;
    this.refreshData();
  }

  private refreshData() {
    this.decks = getCustomDecks();
    this.activeDeck = getActiveCustomDeck();
    this.matrixCards = getMergedGameTemplatesSync();
  }

  private reRenderSelf() {
    if (this.mountedContainer && document.body.contains(this.mountedContainer)) {
      this.mountedContainer.innerHTML = this.render();
      this.bind(this.mountedContainer);
    } else {
      this.callbacks.reRender();
    }
  }

  public render(): string {
    this.refreshData();
    const totalDecks = this.decks.length;
    const availableDecks = this.decks.filter((d) => d.isAvailable !== false).length;
    const draftDecks = totalDecks - availableDecks;
    const totalCardsCreated = this.matrixCards.length;
    const magicCardsCount = this.matrixCards.filter((c) => c.entityType === 'Magia' || c.type === 'Magia' || c.isSpell).length;
    const creatureCardsCount = totalCardsCreated - magicCardsCount;

    return `
      <div class="tab-decks-container" style="width: 100%; height: 100%; overflow-y: auto; padding: 20px 24px 60px 24px; box-sizing: border-box; background: radial-gradient(circle at 50% 10%, #15102a 0%, #08060f 100%); color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        
        <!-- TOPO: HEADER & FLUXO GUIADO -->
        <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 18px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 1.6rem;">🎴</span>
              <h1 style="margin: 0; font-size: 1.35rem; font-weight: 900; letter-spacing: 0.5px; background: linear-gradient(135deg, #ffd700, #ff9f43); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                GALERIA DE DECKS & ARQUITETURA
              </h1>
              <span style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); color: #34d399; font-size: 0.65rem; font-weight: 800; padding: 3px 8px; border-radius: 9999px;">
                MEMÓRIA MATRIZ ATIVA
              </span>
            </div>
            <p style="margin: 6px 0 0 0; font-size: 0.76rem; color: #94a3b8; max-width: 680px; line-height: 1.4;">
              Crie seus Decks Temáticos, vincule <strong>Criaturas (Slimes)</strong> e <strong>Cartas de Magia</strong> forjadas na Matriz e ligue a chave <strong>ON / OFF</strong> para disponibilizá-los em <strong>Mobby Duelos, Boosters e Loja</strong>.
            </p>
          </div>

          <!-- BOTÕES DE AÇÃO PRINCIPAIS -->
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <button id="btn-open-new-deck-modal" type="button" style="display: flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #10b981, #059669); color: #fff; border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; padding: 10px 18px; font-size: 0.8rem; font-weight: 900; cursor: pointer; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.35);">
              <span>➕</span>
              <span>CRIAR NOVO DECK</span>
            </button>

            <button id="btn-go-to-matrix" type="button" style="display: flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #7928ca, #ff0080); color: #fff; border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; padding: 10px 18px; font-size: 0.8rem; font-weight: 900; cursor: pointer; box-shadow: 0 4px 15px rgba(255, 0, 128, 0.35);">
              <span>✨</span>
              <span>ABRIR FORJA MATRIZ</span>
            </button>
          </div>
        </div>

        <!-- GUIA RÁPIDO DO FLUXO DE PRODUÇÃO -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; margin-bottom: 20px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 10px 14px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="width: 24px; height: 24px; border-radius: 50%; background: rgba(16,185,129,0.2); border: 1px solid #10b981; color: #34d399; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 900; flex-shrink: 0;">1</span>
            <div style="font-size: 0.7rem; color: #cbd5e1;"><strong>Crie o Deck:</strong> Defina nome, arquétipo e cor temática.</div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="width: 24px; height: 24px; border-radius: 50%; background: rgba(168,85,247,0.2); border: 1px solid #a855f7; color: #d8b4fe; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 900; flex-shrink: 0;">2</span>
            <div style="font-size: 0.7rem; color: #cbd5e1;"><strong>Forje na Matriz:</strong> Separe Slimes e Magias por raridade.</div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="width: 24px; height: 24px; border-radius: 50%; background: rgba(56,189,248,0.2); border: 1px solid #38bdf8; color: #7dd3fc; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 900; flex-shrink: 0;">3</span>
            <div style="font-size: 0.7rem; color: #cbd5e1;"><strong>Monte & Publique:</strong> Vincule até 12 cartas e ligue a chave ON.</div>
          </div>
        </div>

        <!-- BARRA DE STATUS / RESUMO -->
        <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 22px;">
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 10px 16px; display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.2rem;">📦</span>
            <div>
              <div style="font-size: 0.62rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Total de Decks</div>
              <div style="font-size: 1rem; font-weight: 900; color: #fff;">${totalDecks} Decks</div>
            </div>
          </div>

          <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 10px 16px; display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.2rem;">🟢</span>
            <div>
              <div style="font-size: 0.62rem; color: #34d399; font-weight: 700; text-transform: uppercase;">Disponíveis (ON)</div>
              <div style="font-size: 1rem; font-weight: 900; color: #34d399;">${availableDecks} Ativos</div>
            </div>
          </div>

          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 10px 16px; display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.2rem;">⚪</span>
            <div>
              <div style="font-size: 0.62rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Rascunhos (OFF)</div>
              <div style="font-size: 1rem; font-weight: 900; color: #cbd5e1;">${draftDecks} Ocultos</div>
            </div>
          </div>

          <div style="background: rgba(56, 189, 248, 0.06); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 12px; padding: 10px 16px; display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.2rem;">🎴</span>
            <div>
              <div style="font-size: 0.62rem; color: #38bdf8; font-weight: 700; text-transform: uppercase;">Acervo da Matriz</div>
              <div style="font-size: 0.95rem; font-weight: 900; color: #fff;">
                ${totalCardsCreated} Cartas <span style="font-size:0.7rem; color:#94a3b8; font-weight:700;">(${creatureCardsCount} 🐉 / ${magicCardsCount} 🔮)</span>
              </div>
            </div>
          </div>
        </div>

        <!-- GRID DE DECKS -->
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 18px;">
          ${this.decks.map((deck) => this.renderDeckCard(deck)).join('')}
        </div>

        <!-- MODAL DE CRIAÇÃO DE DECK -->
        ${this.isCreateModalOpen ? this.renderCreateModal() : ''}

        <!-- MODAL DE GERENCIAMENTO DE CARTAS DO DECK -->
        ${this.managingDeckId ? this.renderManageCardsModal() : ''}

      </div>
    `;
  }

  private renderDeckCard(deck: CustomDeckData): string {
    const isAvailable = deck.isAvailable !== false;
    const cardCount = Array.isArray(deck.cards) ? deck.cards.length : 0;
    const accent = deck.accentColor || '#10b981';
    const isRenaming = this.renamingDeckId === deck.id;
    const isDeleting = this.deletingDeckId === deck.id;

    const deckCardsResolved = (deck.cards || [])
      .map((cRef) => this.matrixCards.find((tc) => tc.id === cRef || tc.name === cRef))
      .filter(Boolean);

    return `
      <div class="deck-card-item" data-deck-id="${deck.id}" style="background: rgba(22, 18, 36, 0.9); border: 2px solid ${isAvailable ? 'rgba(16, 185, 129, 0.45)' : 'rgba(255,255,255,0.08)'}; border-radius: 16px; padding: 18px; display: flex; flex-direction: column; gap: 14px; box-shadow: ${isAvailable ? '0 0 20px rgba(16, 185, 129, 0.15)' : '0 6px 20px rgba(0,0,0,0.4)'}; position: relative; overflow: hidden;">
        
        <!-- CABEÇALHO DO CARD: NOME & CHAVE ON/OFF -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${accent}; box-shadow: 0 0 8px ${accent};"></span>
              <span style="font-size: 0.65rem; color: #94a3b8; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                ${deck.archetype || 'Geral'}
              </span>
            </div>

            ${
              isRenaming
                ? `<div style="display:flex; gap:6px; align-items:center; margin-top:6px;">
                    <input type="text" class="inp-inline-rename" data-deck-id="${deck.id}" value="${deck.name.replace(/"/g, '&quot;')}" style="flex:1; background:rgba(0,0,0,0.6); border:1px solid #38bdf8; border-radius:6px; padding:5px 8px; color:#fff; font-size:0.85rem; font-weight:800;" />
                    <button type="button" class="btn-save-inline-rename" data-deck-id="${deck.id}" style="background:#10b981; color:#fff; border:none; border-radius:6px; padding:5px 10px; font-size:0.72rem; font-weight:900; cursor:pointer;">Salvar</button>
                    <button type="button" class="btn-cancel-inline-rename" style="background:rgba(255,255,255,0.1); color:#cbd5e1; border:none; border-radius:6px; padding:5px 8px; font-size:0.72rem; cursor:pointer;">✕</button>
                  </div>`
                : `<h3 style="margin: 4px 0 0 0; font-size: 1.15rem; font-weight: 900; color: #fff; display: flex; align-items: center; gap: 6px;">
                    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${deck.name}</span>
                    <button type="button" class="btn-rename-deck" data-deck-id="${deck.id}" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #94a3b8; cursor: pointer; font-size: 0.72rem; padding: 2px 6px;" title="Renomear Deck">✏️</button>
                  </h3>`
            }
          </div>

          <!-- BOTÃO TOGGLE ON / OFF DISPONÍVEL NO JOGO -->
          <button type="button" class="btn-toggle-availability" data-deck-id="${deck.id}" style="display: flex; align-items: center; gap: 7px; background: ${isAvailable ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.08)'}; border: 1.5px solid ${isAvailable ? '#34d399' : 'rgba(255,255,255,0.2)'}; border-radius: 9999px; padding: 4px 10px 4px 8px; cursor: pointer; color: #fff; font-size: 0.7rem; font-weight: 900; box-shadow: ${isAvailable ? '0 0 14px rgba(16,185,129,0.5)' : 'none'}; flex-shrink: 0;" title="Clique para Alternar Disponibilidade no Jogo (ON/OFF)">
            <span style="display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; background: #fff; color: ${isAvailable ? '#059669' : '#475569'}; font-size: 0.68rem; font-weight: 900;">
              ${isAvailable ? '●' : '○'}
            </span>
            <span style="letter-spacing: 0.5px;">
              ${isAvailable ? 'DISPONÍVEL ON' : 'DESLIGADO OFF'}
            </span>
          </button>
        </div>

        <!-- STATUS DE DISPONIBILIDADE NOS MENUS -->
        <div style="background: ${isAvailable ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.03)'}; border: 1px solid ${isAvailable ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255,255,255,0.06)'}; border-radius: 10px; padding: 8px 12px; display: flex; flex-direction: column; gap: 4px;">
          <div style="font-size: 0.62rem; color: ${isAvailable ? '#34d399' : '#94a3b8'}; font-weight: 800; text-transform: uppercase;">
            ${isAvailable ? '🟢 VISÍVEL NOS MENUS DO JOGO' : '⚪ OCULTO (RASCUNHO DA FORJA)'}
          </div>
          ${
            isAvailable
              ? `<div style="display: flex; gap: 6px; flex-wrap: wrap;">
                  <span style="font-size: 0.62rem; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); color: #a7f3d0; padding: 2px 6px; border-radius: 4px; font-weight: 700;">✓ Mobby Duelos</span>
                  <span style="font-size: 0.62rem; background: rgba(56,189,248,0.15); border: 1px solid rgba(56,189,248,0.3); color: #bae6fd; padding: 2px 6px; border-radius: 4px; font-weight: 700;">✓ Loja & Boosters</span>
                  <span style="font-size: 0.62rem; background: rgba(250,204,21,0.15); border: 1px solid rgba(250,204,21,0.3); color: #fef08a; padding: 2px 6px; border-radius: 4px; font-weight: 700;">✓ Galeria / Duelo</span>
                </div>`
              : `<div style="font-size: 0.65rem; color: #64748b; font-style: italic;">
                  Este deck não aparece em duelos ou na loja. Ative a chave acima para publicar.
                </div>`
          }
        </div>

        <!-- STATUS DE CARTAS -->
        <div style="background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 10px 12px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 0.62rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Capacidade do Deck</div>
            <div style="font-size: 0.95rem; font-weight: 900; color: ${cardCount >= 12 ? '#10b981' : '#f59e0b'};">
              ${cardCount} / 12 Cartas
            </div>
          </div>
          <div style="font-size: 0.72rem; color: #cbd5e1;">
            ${cardCount === 0 ? '⚠️ Vazio' : cardCount < 12 ? '🛠️ Em montagem' : '✅ Pronto para duelo'}
          </div>
        </div>

        <!-- MINIATURAS DAS CARTAS NO DECK -->
        <div style="min-height: 70px; background: rgba(0,0,0,0.25); border-radius: 10px; border: 1px dashed rgba(255,255,255,0.1); padding: 8px; display: flex; gap: 6px; overflow-x: auto; align-items: center; scrollbar-width: thin;">
          ${
            deckCardsResolved.length === 0
              ? `<div style="width: 100%; text-align: center; font-size: 0.72rem; color: #64748b; padding: 14px 0;">
                  Nenhuma carta atribuída a este deck.<br>
                  <span style="color: #38bdf8; font-weight: 700;">Clique em "Gerenciar Cartas" abaixo para adicionar!</span>
                </div>`
              : deckCardsResolved
                  .slice(0, 12)
                  .map(
                    (c) => `
                    <div style="width: 44px; height: 60px; flex-shrink: 0; border-radius: 6px; overflow: hidden; border: 1px solid rgba(255,255,255,0.2); background: #0c0a14; position: relative;" title="${c.name || c.title}">
                      ${renderMatrixCardSVG(c, { mode: 'thumb', animateChroma: false })}
                    </div>
                  `
                  )
                  .join('')
          }
        </div>

        <!-- CONFIRMAÇÃO INLINE DE EXCLUSÃO -->
        ${
          isDeleting
            ? `<div style="background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.5); border-radius: 10px; padding: 10px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                <span style="font-size: 0.72rem; color: #fca5a5; font-weight: 800;">Excluir "${deck.name}"?</span>
                <div style="display: flex; gap: 6px;">
                  <button type="button" class="btn-confirm-delete-deck" data-deck-id="${deck.id}" style="background: #ef4444; color: #fff; border: none; border-radius: 6px; padding: 5px 10px; font-size: 0.7rem; font-weight: 900; cursor: pointer;">Sim, Excluir</button>
                  <button type="button" class="btn-cancel-delete-deck" style="background: rgba(255,255,255,0.1); color: #e2e8f0; border: none; border-radius: 6px; padding: 5px 10px; font-size: 0.7rem; cursor: pointer;">Não</button>
                </div>
              </div>`
            : ''
        }

        <!-- BOTÕES DE AÇÃO DO DECK -->
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: auto; padding-top: 6px;">
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <button type="button" class="btn-open-matrix-for-deck" data-deck-id="${deck.id}" style="background: linear-gradient(135deg, #7928ca, #ff0080); border: none; color: #fff; border-radius: 8px; padding: 8px 10px; font-size: 0.72rem; font-weight: 800; cursor: pointer;" title="Abrir Forja Matriz para criar cartas vinculadas a este deck">
              ✨ Forjar na Matriz
            </button>

            <button type="button" class="btn-manage-deck-cards" data-deck-id="${deck.id}" style="background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; border-radius: 8px; padding: 8px 10px; font-size: 0.72rem; font-weight: 800; cursor: pointer;">
              📋 Gerenciar Cartas (${cardCount})
            </button>
          </div>

          <div style="display: flex; gap: 6px;">
            <button type="button" class="btn-duplicate-deck" data-deck-id="${deck.id}" style="flex: 1; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #e2e8f0; border-radius: 8px; padding: 6px 10px; font-size: 0.72rem; cursor: pointer;" title="Duplicar Deck">
              📄 Duplicar
            </button>

            ${
              this.decks.length > 1
                ? `<button type="button" class="btn-delete-deck" data-deck-id="${deck.id}" style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35); color: #f87171; border-radius: 8px; padding: 6px 10px; font-size: 0.72rem; cursor: pointer;" title="Excluir Deck">
                    🗑️
                  </button>`
                : ''
            }
          </div>

        </div>

      </div>
    `;
  }

  private renderCreateModal(): string {
    return `
      <div id="create-deck-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.82); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 99999; padding: 20px;">
        <div style="background: #161224; border: 1.5px solid rgba(255, 215, 0, 0.45); border-radius: 18px; width: 100%; max-width: 450px; padding: 24px; box-shadow: 0 20px 60px rgba(0,0,0,0.95); display: flex; flex-direction: column; gap: 16px;">
          
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 1.15rem; font-weight: 900; color: #ffd700;">➕ Criar Novo Deck</div>
            <button type="button" id="btn-close-create-modal" style="background: none; border: none; color: #94a3b8; font-size: 1.2rem; cursor: pointer;">✕</button>
          </div>

          <div>
            <label style="display: block; font-size: 0.7rem; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 6px;">Nome do Deck</label>
            <input type="text" id="inp-new-deck-name" placeholder="Ex: Slimes de Magma e Fogo" value="Novo Deck ${this.decks.length + 1}" style="width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 9px 12px; color: #fff; font-size: 0.85rem; font-weight: 700;" />
          </div>

          <div>
            <label style="display: block; font-size: 0.7rem; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 6px;">Arquétipo / Estilo</label>
            <select id="sel-new-deck-archetype" style="width: 100%; box-sizing: border-box; background: #0c0a14; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 9px 12px; color: #fff; font-size: 0.82rem; font-weight: 700;">
              <option value="Guerreiro">⚔️ Guerreiro (Alto Impacto Físico)</option>
              <option value="Mago">✨ Mago (Feitiços & Magias Arcanas)</option>
              <option value="Elementar">🔥 Elementar (Fogo, Magma & Combustão)</option>
              <option value="Gelo">❄️ Glacial (Controle & Paralisia)</option>
              <option value="Veneno">🧪 Venenoso (Dano Contínuo / Tóxico)</option>
              <option value="Tank">🛡️ Tank (Proteção & Barreira Viscosa)</option>
              <option value="Suporte">💚 Suporte (Cura & Regeneração)</option>
              <option value="Personalizado" selected>🌟 Personalizado (Livre Criação)</option>
            </select>
          </div>

          <div>
            <label style="display: block; font-size: 0.7rem; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 6px;">Cor de Destaque</label>
            <div style="display: flex; gap: 10px; align-items: center;">
              <input type="color" id="inp-new-deck-color" value="#10b981" style="width: 44px; height: 38px; border: none; border-radius: 8px; cursor: pointer; background: transparent;" />
              <span style="font-size: 0.75rem; color: #cbd5e1;">Identidade visual do deck nos menus</span>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 10px;">
            <input type="checkbox" id="chk-available-now" checked style="accent-color: #10b981; width: 18px; height: 18px; cursor: pointer;" />
            <label for="chk-available-now" style="font-size: 0.76rem; color: #f1f5f9; cursor: pointer; line-height: 1.3;">
              <strong>Disponível no Jogo (ON):</strong> publicar imediatamente em Mobby Duelos, Boosters e Loja.
            </label>
          </div>

          <div style="display: flex; gap: 10px; margin-top: 10px;">
            <button type="button" id="btn-confirm-create-deck" style="flex: 1; background: linear-gradient(135deg, #10b981, #059669); color: #fff; border: none; border-radius: 10px; padding: 10px; font-size: 0.82rem; font-weight: 900; cursor: pointer;">
              ✨ CRIAR DECK AGORA
            </button>
            <button type="button" id="btn-cancel-create-deck" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #94a3b8; border-radius: 10px; padding: 10px 18px; font-size: 0.82rem; cursor: pointer;">
              Cancelar
            </button>
          </div>

        </div>
      </div>
    `;
  }

  private renderManageCardsModal(): string {
    const deck = this.decks.find((d) => d.id === this.managingDeckId);
    if (!deck) return '';

    const currentCardRefs = new Set(deck.cards || []);
    const q = this.manageSearchQuery.trim().toLowerCase();

    const availableCards = this.matrixCards.filter((card) => {
      const isMagic = card.entityType === 'Magia' || card.type === 'Magia' || card.isSpell;
      if (this.manageFilterType === 'Magia' && !isMagic) return false;
      if (this.manageFilterType === 'Criatura' && isMagic) return false;
      if (q) {
        const name = (card.name || card.title || '').toLowerCase();
        const rarity = (card.rarity || card.cardClass || '').toLowerCase();
        return name.includes(q) || rarity.includes(q);
      }
      return true;
    });

    return `
      <div id="manage-cards-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; z-index: 99999; padding: 20px;">
        <div style="background: #141022; border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 20px; width: 100%; max-width: 860px; max-height: 86vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 70px rgba(0,0,0,0.95);">
          
          <!-- MODAL HEADER -->
          <div style="padding: 16px 24px; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); flex-wrap: wrap; gap: 12px;">
            <div>
              <div style="font-size: 0.68rem; color: #38bdf8; font-weight: 800; text-transform: uppercase;">Gerenciador de Cartas do Deck</div>
              <h2 style="margin: 2px 0 0 0; font-size: 1.2rem; font-weight: 900; color: #fff;">
                ${deck.name}
                <span style="font-size: 0.8rem; color: ${currentCardRefs.size >= 12 ? '#10b981' : '#f59e0b'}; font-weight: 800; margin-left: 8px;">
                  (${currentCardRefs.size} / 12 Cartas selecionadas)
                </span>
              </h2>
            </div>

            <!-- FILTROS RÁPIDOS NO MODAL -->
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <button type="button" class="btn-manage-filter" data-filter="ALL" style="background:${this.manageFilterType === 'ALL' ? '#38bdf8' : 'rgba(255,255,255,0.06)'}; color:${this.manageFilterType === 'ALL' ? '#000' : '#cbd5e1'}; border:none; border-radius:999px; padding:5px 12px; font-size:0.7rem; font-weight:900; cursor:pointer;">Todas</button>
              <button type="button" class="btn-manage-filter" data-filter="Criatura" style="background:${this.manageFilterType === 'Criatura' ? '#10b981' : 'rgba(255,255,255,0.06)'}; color:${this.manageFilterType === 'Criatura' ? '#000' : '#cbd5e1'}; border:none; border-radius:999px; padding:5px 12px; font-size:0.7rem; font-weight:900; cursor:pointer;">🐉 Slimes/Criaturas</button>
              <button type="button" class="btn-manage-filter" data-filter="Magia" style="background:${this.manageFilterType === 'Magia' ? '#a855f7' : 'rgba(255,255,255,0.06)'}; color:${this.manageFilterType === 'Magia' ? '#fff' : '#cbd5e1'}; border:none; border-radius:999px; padding:5px 12px; font-size:0.7rem; font-weight:900; cursor:pointer;">🔮 Magias</button>
              <input type="text" id="inp-manage-search" placeholder="Buscar carta ou raridade..." value="${this.manageSearchQuery.replace(/"/g, '&quot;')}" style="background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.15); border-radius:8px; padding:5px 10px; color:#fff; font-size:0.72rem; width:170px;" />
              <button type="button" id="btn-close-manage-modal" style="background: none; border: none; color: #94a3b8; font-size: 1.3rem; cursor: pointer; margin-left: 6px;">✕</button>
            </div>
          </div>

          <!-- MODAL BODY: LISTAGEM DE CARTAS -->
          <div style="flex: 1; overflow-y: auto; padding: 18px 24px; display: flex; flex-direction: column; gap: 14px;">
            
            ${
              availableCards.length === 0
                ? `<div style="text-align: center; padding: 40px 20px; color: #94a3b8;">
                    <div style="font-size: 2.5rem; margin-bottom: 12px;">🎴</div>
                    <div style="font-size: 1.05rem; font-weight: 800; color: #fff; margin-bottom: 8px;">Nenhuma Carta Encontrada</div>
                    <p style="font-size: 0.8rem; max-width: 440px; margin: 0 auto 16px auto; line-height: 1.4;">
                      Crie ou classifique suas cartas personalizadas de Criaturas e Magias no estúdio da <strong>Forja Matriz</strong>.
                    </p>
                    <button type="button" id="btn-modal-open-matrix" style="background: linear-gradient(135deg, #7928ca, #ff0080); color: #fff; border: none; border-radius: 9999px; padding: 10px 24px; font-size: 0.82rem; font-weight: 800; cursor: pointer;">
                      ✨ Ir para a Forja Matriz
                    </button>
                  </div>`
                : `
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 12px;">
                  ${availableCards
                    .map((card) => {
                      const isSelected = currentCardRefs.has(card.id) || currentCardRefs.has(card.name);
                      const isMagic = card.entityType === 'Magia' || card.type === 'Magia' || card.isSpell;
                      const rarityLabel = card.cardClass || card.rarity || 'Comum';
                      return `
                        <div class="selectable-deck-card ${isSelected ? 'selected' : ''}" data-card-id="${card.id || card.name}" style="background: #0d0a17; border: 2px solid ${isSelected ? '#10b981' : 'rgba(255,255,255,0.1)'}; border-radius: 10px; padding: 8px; display: flex; flex-direction: column; gap: 6px; cursor: pointer; position: relative; box-shadow: ${isSelected ? '0 0 12px rgba(16,185,129,0.3)' : 'none'};">
                          
                          <!-- SELETOR INDICADOR -->
                          <div style="position: absolute; top: 6px; right: 6px; z-index: 10; width: 20px; height: 20px; border-radius: 50%; background: ${isSelected ? '#10b981' : 'rgba(0,0,0,0.7)'}; border: 1.5px solid ${isSelected ? '#10b981' : 'rgba(255,255,255,0.3)'}; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; color: #fff; font-weight: 900;">
                            ${isSelected ? '✓' : ''}
                          </div>

                          <div style="position: absolute; top: 6px; left: 6px; z-index: 10; background: ${isMagic ? 'rgba(168,85,247,0.85)' : 'rgba(16,185,129,0.85)'}; color: #fff; font-size: 0.55rem; font-weight: 900; padding: 2px 6px; border-radius: 999px;">
                            ${isMagic ? '🔮 MAGIA' : '🐉 SLIME'}
                          </div>

                          <div style="width: 100%; aspect-ratio: 5 / 7; border-radius: 6px; overflow: hidden; background: #000;">
                            ${renderMatrixCardSVG(card, { mode: 'thumb', animateChroma: false })}
                          </div>

                          <div style="font-size: 0.72rem; font-weight: 800; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center;">
                            ${card.name || card.title}
                          </div>
                          <div style="font-size: 0.6rem; font-weight: 700; color: #94a3b8; text-align: center; text-transform: uppercase;">
                            ${rarityLabel}
                          </div>
                        </div>
                      `;
                    })
                    .join('')}
                </div>
              `
            }

          </div>

          <!-- MODAL FOOTER -->
          <div style="padding: 14px 24px; border-top: 1px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.35); display: flex; justify-content: space-between; align-items: center; gap: 10px;">
            ${
              this.confirmClearDeck
                ? `<div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:0.75rem; color:#fca5a5; font-weight:800;">Limpar todas as cartas deste deck?</span>
                    <button type="button" id="btn-confirm-clear-deck" style="background:#ef4444; color:#fff; border:none; border-radius:6px; padding:6px 12px; font-size:0.72rem; font-weight:900; cursor:pointer;">Sim, Limpar</button>
                    <button type="button" id="btn-cancel-clear-deck" style="background:rgba(255,255,255,0.1); color:#cbd5e1; border:none; border-radius:6px; padding:6px 10px; font-size:0.72rem; cursor:pointer;">Cancelar</button>
                  </div>`
                : `<button type="button" id="btn-clear-deck-cards" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171; border-radius: 8px; padding: 8px 14px; font-size: 0.75rem; font-weight: 700; cursor: pointer;">
                    🗑️ Limpar Deck
                  </button>`
            }
            <button type="button" id="btn-done-manage-modal" style="background: linear-gradient(135deg, #10b981, #059669); color: #fff; border: none; border-radius: 8px; padding: 9px 22px; font-size: 0.8rem; font-weight: 800; cursor: pointer;">
              CONCLUÍDO
            </button>
          </div>

        </div>
      </div>
    `;
  }

  public bind(parent: HTMLElement): void {
    this.mountedContainer = parent;

    // ABRIR MODAL DE CRIAÇÃO
    parent.querySelector('#btn-open-new-deck-modal')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.isCreateModalOpen = true;
      this.reRenderSelf();
      const inp = this.mountedContainer?.querySelector('#inp-new-deck-name') as HTMLInputElement;
      if (inp) {
        inp.focus();
        inp.select();
      }
    });

    // FECHAR MODAL DE CRIAÇÃO
    parent.querySelector('#btn-close-create-modal')?.addEventListener('click', () => {
      this.isCreateModalOpen = false;
      this.reRenderSelf();
    });

    parent.querySelector('#btn-cancel-create-deck')?.addEventListener('click', () => {
      this.isCreateModalOpen = false;
      this.reRenderSelf();
    });

    // CONFIRMAR CRIAÇÃO DE DECK
    const confirmCreate = () => {
      const nameInp = parent.querySelector('#inp-new-deck-name') as HTMLInputElement;
      const archSel = parent.querySelector('#sel-new-deck-archetype') as HTMLSelectElement;
      const colInp = parent.querySelector('#inp-new-deck-color') as HTMLInputElement;
      const availChk = parent.querySelector('#chk-available-now') as HTMLInputElement;

      const name = nameInp?.value.trim() || `Deck ${this.decks.length + 1}`;
      const archetype = archSel?.value || 'Personalizado';
      const color = colInp?.value || '#10b981';
      const isAvailable = Boolean(availChk?.checked);

      const newDeck: CustomDeckData = {
        id: 'deck_' + Date.now(),
        name,
        archetype,
        accentColor: color,
        cards: [],
        artifacts: ['art_escudo', 'art_golpe', 'art_queimadura'],
        board: 'floresta',
        isActive: isAvailable && this.decks.length === 0,
        isAvailable,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const nextDecks = [...this.decks, newDeck];
      saveCustomDecks(nextDecks);

      if (isAvailable && (!this.activeDeck || !this.activeDeck.isAvailable)) {
        setActiveCustomDeck(newDeck.id);
      }

      this.isCreateModalOpen = false;
      this.callbacks.showToast(`Deck "${name}" criado na Memória Matriz! (${isAvailable ? 'ON' : 'OFF'})`, '#10b981');
      this.reRenderSelf();
    };

    parent.querySelector('#btn-confirm-create-deck')?.addEventListener('click', confirmCreate);
    parent.querySelector('#inp-new-deck-name')?.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') {
        e.preventDefault();
        confirmCreate();
      }
    });

    // TOGGLE DISPONIBILIDADE NO JOGO (ON / OFF)
    parent.querySelectorAll('.btn-toggle-availability').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const deckId = (e.currentTarget as HTMLElement).dataset.deckId;
        if (!deckId) return;
        const nextState = toggleDeckAvailability(deckId);
        const deck = this.decks.find((d) => d.id === deckId);
        const name = deck?.name || 'Deck';
        if (nextState) {
          this.callbacks.showToast(`🟢 "${name}" ATIVO em Mobby Duelos, Boosters e Loja!`, '#10b981');
        } else {
          this.callbacks.showToast(`⚪ "${name}" oculto dos menus (Rascunho interno).`, '#94a3b8');
        }
        this.reRenderSelf();
      });
    });

    // ABRIR FORJA MATRIZ A PARTIR DO DECK
    parent.querySelectorAll('.btn-open-matrix-for-deck').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const deckId = (e.currentTarget as HTMLElement).dataset.deckId;
        if (deckId) {
          setActiveCustomDeck(deckId);
          localStorage.setItem('forge_active_deck_id', deckId);
        }
        this.callbacks.setMode('matrix');
      });
    });

    // BOTÃO TOPO IR PARA MATRIZ
    parent.querySelector('#btn-go-to-matrix')?.addEventListener('click', () => {
      this.callbacks.setMode('matrix');
    });

    // BOTÃO MODAL VAZIO IR PARA MATRIZ
    parent.querySelector('#btn-modal-open-matrix')?.addEventListener('click', () => {
      this.managingDeckId = null;
      this.callbacks.setMode('matrix');
    });

    // RENOMEAR DECK INLINE (SEM WINDOW.PROMPT)
    parent.querySelectorAll('.btn-rename-deck').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const deckId = (e.currentTarget as HTMLElement).dataset.deckId;
        if (!deckId) return;
        this.renamingDeckId = deckId;
        this.reRenderSelf();
        const inp = this.mountedContainer?.querySelector(`.inp-inline-rename[data-deck-id="${deckId}"]`) as HTMLInputElement;
        if (inp) {
          inp.focus();
          inp.select();
        }
      });
    });

    parent.querySelectorAll('.btn-save-inline-rename').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const deckId = (e.currentTarget as HTMLElement).dataset.deckId;
        const inp = parent.querySelector(`.inp-inline-rename[data-deck-id="${deckId}"]`) as HTMLInputElement;
        const newName = inp?.value.trim();
        if (deckId && newName) {
          const updated = this.decks.map((d) =>
            d.id === deckId ? { ...d, name: newName, updatedAt: new Date().toISOString() } : d
          );
          saveCustomDecks(updated);
          this.callbacks.showToast('Nome atualizado!', '#10b981');
        }
        this.renamingDeckId = null;
        this.reRenderSelf();
      });
    });

    parent.querySelectorAll('.btn-cancel-inline-rename').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.renamingDeckId = null;
        this.reRenderSelf();
      });
    });

    // DUPLICAR DECK
    parent.querySelectorAll('.btn-duplicate-deck').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const deckId = (e.currentTarget as HTMLElement).dataset.deckId;
        const deck = this.decks.find((d) => d.id === deckId);
        if (!deck) return;
        const cloned: CustomDeckData = {
          ...deck,
          id: 'deck_' + Date.now(),
          name: `${deck.name} (Cópia)`,
          isActive: false,
          isAvailable: deck.isAvailable !== false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        saveCustomDecks([...this.decks, cloned]);
        this.callbacks.showToast(`Deck duplicado: "${cloned.name}"`, '#10b981');
        this.reRenderSelf();
      });
    });

    // EXCLUIR DECK INLINE (SEM WINDOW.CONFIRM)
    parent.querySelectorAll('.btn-delete-deck').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const deckId = (e.currentTarget as HTMLElement).dataset.deckId;
        if (!deckId) return;
        this.deletingDeckId = deckId;
        this.reRenderSelf();
      });
    });

    parent.querySelectorAll('.btn-confirm-delete-deck').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const deckId = (e.currentTarget as HTMLElement).dataset.deckId;
        const deck = this.decks.find((d) => d.id === deckId);
        if (!deck) return;
        let updated = this.decks.filter((d) => d.id !== deckId);
        if (updated.length === 0) {
          updated = getCustomDecks();
        } else if (deck.isActive && updated[0]) {
          updated[0].isActive = true;
          setActiveCustomDeck(updated[0].id);
        }
        saveCustomDecks(updated);
        this.deletingDeckId = null;
        this.callbacks.showToast('Deck excluído!', '#ef4444');
        this.reRenderSelf();
      });
    });

    parent.querySelectorAll('.btn-cancel-delete-deck').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deletingDeckId = null;
        this.reRenderSelf();
      });
    });

    // ABRIR MODAL DE GERENCIAR CARTAS
    parent.querySelectorAll('.btn-manage-deck-cards').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const deckId = (e.currentTarget as HTMLElement).dataset.deckId;
        if (!deckId) return;
        this.managingDeckId = deckId;
        this.confirmClearDeck = false;
        this.reRenderSelf();
      });
    });

    // FILTROS NO MODAL DE GERENCIAR CARTAS
    parent.querySelectorAll('.btn-manage-filter').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const filter = (e.currentTarget as HTMLElement).dataset.filter as 'ALL' | 'Criatura' | 'Magia';
        if (filter) {
          this.manageFilterType = filter;
          this.reRenderSelf();
        }
      });
    });

    parent.querySelector('#inp-manage-search')?.addEventListener('input', (e) => {
      this.manageSearchQuery = (e.target as HTMLInputElement).value;
      this.reRenderSelf();
      const inp = this.mountedContainer?.querySelector('#inp-manage-search') as HTMLInputElement;
      if (inp) {
        inp.focus();
        inp.setSelectionRange(inp.value.length, inp.value.length);
      }
    });

    // FECHAR MODAL DE GERENCIAR CARTAS
    parent.querySelector('#btn-close-manage-modal')?.addEventListener('click', () => {
      this.managingDeckId = null;
      this.confirmClearDeck = false;
      this.reRenderSelf();
    });

    parent.querySelector('#btn-done-manage-modal')?.addEventListener('click', () => {
      this.managingDeckId = null;
      this.confirmClearDeck = false;
      this.reRenderSelf();
    });

    // SELECIONAR / DESELECIONAR CARTA NO MODAL
    parent.querySelectorAll('.selectable-deck-card').forEach((cardEl) => {
      cardEl.addEventListener('click', () => {
        if (!this.managingDeckId) return;
        const cardId = (cardEl as HTMLElement).dataset.cardId;
        if (!cardId) return;

        const deck = this.decks.find((d) => d.id === this.managingDeckId);
        if (!deck) return;

        const curCards = [...(deck.cards || [])];
        const idx = curCards.indexOf(cardId);

        if (idx >= 0) {
          curCards.splice(idx, 1);
        } else {
          if (curCards.length >= 12) {
            this.callbacks.showToast('O deck já atingiu o limite de 12 cartas!', '#f59e0b');
            return;
          }
          curCards.push(cardId);
        }

        const updated = this.decks.map((d) =>
          d.id === this.managingDeckId ? { ...d, cards: curCards, updatedAt: new Date().toISOString() } : d
        );
        saveCustomDecks(updated);
        if (deck.isActive) {
          setActiveCustomDeck(deck.id);
        }
        this.reRenderSelf();
      });
    });

    // LIMPAR CARTAS DO DECK (SEM WINDOW.CONFIRM)
    parent.querySelector('#btn-clear-deck-cards')?.addEventListener('click', () => {
      this.confirmClearDeck = true;
      this.reRenderSelf();
    });

    parent.querySelector('#btn-cancel-clear-deck')?.addEventListener('click', () => {
      this.confirmClearDeck = false;
      this.reRenderSelf();
    });

    parent.querySelector('#btn-confirm-clear-deck')?.addEventListener('click', () => {
      if (!this.managingDeckId) return;
      const updated = this.decks.map((d) =>
        d.id === this.managingDeckId ? { ...d, cards: [], updatedAt: new Date().toISOString() } : d
      );
      saveCustomDecks(updated);
      const deck = this.decks.find((d) => d.id === this.managingDeckId);
      if (deck?.isActive) {
        setActiveCustomDeck(deck.id);
      }
      this.confirmClearDeck = false;
      this.callbacks.showToast('Cartas removidas do deck!', '#f59e0b');
      this.reRenderSelf();
    });
  }
}
