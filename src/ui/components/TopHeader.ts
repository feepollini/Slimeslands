import { t } from '../../core/i18n';

export interface TopHeaderData {
    userLevel: number;
    userXp: number;
    xpNextLevel: number;
    gold: number;
    diamonds: number;
    enjinCoin?: number;
}

export class TopHeader {
    private data: TopHeaderData;

    constructor(data: TopHeaderData) {
        this.data = data;
    }

    public render(): string {
        const xpPercent = Math.min(100, Math.max(6, (this.data.userXp / Math.max(1, this.data.xpNextLevel)) * 100));
        const enjinVal = this.data.enjinCoin ?? 0;

        return `
            <div class="menu-top-bar nova-top-header" id="top-header-component" style="position:absolute; top:8px; left:50%; transform:translateX(-50%); width:100%; max-width:100%; padding:4px 10px; box-sizing:border-box; z-index:200; pointer-events:none; display:flex; justify-content:space-between; align-items:center; gap:8px; min-height:54px;">
                
                <!-- SEÇÃO DO PERFIL (MEDALHÃO CIRCULAR + CÁPSULA ROYAL SAPPHIRE & PEARL GOLD) -->
                <div style="display:flex; align-items:center; pointer-events:auto; flex:1 1 auto; min-width:0; max-width:56%;">
                    <div class="profile-group nova-header-profile-pill" id="btn-profile" style="display:flex; align-items:center; cursor:pointer; width:100%; min-width:146px; max-width:240px; position:relative; transition:transform 0.18s ease, filter 0.18s ease;">
                        <!-- Avatar Medallion Pearl & Gold (Sobreposto à esquerda como no Header de Fase) -->
                        <div class="avatar-medallion" style="width:44px; height:44px; border:2.5px solid #fff3c2; outline:2px solid #9b701e; border-radius:50%; display:flex; align-items:center; justify-content:center; background:radial-gradient(circle at 35% 30%, #fcfaf5, #d8c8ab); flex-shrink:0; box-shadow:0 4px 10px rgba(0,0,0,0.75), 0 0 12px rgba(229,193,104,0.45); position:relative; z-index:3;">
                            <div style="width:37px; height:37px; border-radius:50%; background:url('/cards/1.jpg') center/cover; border:1px solid #8a6214;"></div>
                            <span style="position:absolute; bottom:-3px; right:-3px; font-family:'Cinzel', serif; font-size:0.5rem; color:#122030; font-weight:900; background:linear-gradient(180deg, #fff3c2 0%, #e5c168 55%, #b58932 100%); border:1.5px solid #523707; border-radius:999px; padding:0 4.5px; box-shadow:0 2px 4px rgba(0,0,0,0.8); line-height:1.25;">${this.data.userLevel}</span>
                        </div>
                        
                        <!-- Cápsula de Nome e Barra de XP saindo detrás do Medalhão -->
                        <div style="display:flex; flex-direction:column; justify-content:center; min-width:0; flex:1; margin-left:-12px; padding:5px 11px 6px 18px; border-radius:0 999px 999px 0; background:linear-gradient(180deg, rgba(11,47,98,0.95) 0%, rgba(4,20,46,0.98) 100%); border:2px solid #d4af53; border-left:none; box-shadow:0 6px 16px rgba(0,8,22,0.8), 0 0 0 1px #523707, inset 0 1px 2px rgba(255,243,194,0.4); position:relative; z-index:2; gap:3px;">
                            <div style="display:flex; align-items:center; justify-content:space-between; gap:4px; min-width:0;">
                                <div class="profile-name" style="font-family:'Cinzel', serif; font-size:0.68rem; font-weight:900; color:#fcfaf5; letter-spacing:0.7px; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-shadow:0 1px 3px rgba(0,0,0,0.95);">${t('header.name')}</div>
                                <span style="font-family:'Cinzel', serif; font-size:0.48rem; color:#f7e4b2; font-weight:900; white-space:nowrap; letter-spacing:0.4px; flex-shrink:0;">${t('header.lv')}.${this.data.userLevel}</span>
                            </div>
                            <!-- Barra de XP Ampla -->
                            <div style="width:100%; height:13px; background:linear-gradient(180deg, #020917 0%, #061836 100%); border:1.5px solid #c59638; overflow:hidden; border-radius:999px; position:relative; display:flex; align-items:center; box-shadow:inset 0 2px 4px rgba(0,0,0,0.9);">
                                <div class="coc-xp-fill" style="width:${xpPercent}%; height:100%; position:relative; background:linear-gradient(90deg, #9b701e 0%, #e5c168 55%, #fff3c2 100%); box-shadow:0 0 10px rgba(229,193,104,0.65); transition:width 0.5s ease-out;"><div class="coc-xp-stripes"></div></div>
                                <span style="position:absolute; width:100%; text-align:center; font-family:'EB Garamond', serif; font-size:0.56rem; color:#fff; font-weight:800; letter-spacing:0.3px; text-shadow:0 1px 2px #000, 0 0 4px #000; z-index:2; pointer-events:none; white-space:nowrap;">${this.data.userXp}/${this.data.xpNextLevel} EXP</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SEÇÃO FINANCEIRA E AÇÕES (PEARL & GOLD PILL COMPACTA E RESPIRÁVEL) -->
                <div style="display:flex; align-items:center; pointer-events:auto; flex-shrink:0;">
                    <div class="nova-header-currency-capsule" style="display:flex; align-items:center; background:linear-gradient(180deg, #fcfaf5 0%, #efe6d4 58%, #e2d4ba 100%); padding:0 7px; height:38px; border:2px solid #c59638; outline:1px solid #523707; border-radius:999px; gap:6px; box-shadow:0 6px 16px rgba(0,8,22,0.75), inset 0 1px 2px rgba(255,255,255,0.95);">
                        <!-- Ouro -->
                        <div style="display:flex; align-items:center; gap:2.5px;" title="Moedas de Ouro">
                            <span style="font-size:0.74rem; filter:drop-shadow(0 1px 1px rgba(0,0,0,0.35));">🪙</span>
                            <span style="font-family:'EB Garamond', 'Cinzel', serif; font-size:0.8rem; color:#122030; font-weight:800;">${this.data.gold}</span>
                        </div>
                        <div style="width:1px; height:13px; background:rgba(181,137,50,0.35);"></div>
                        <!-- Diamantes -->
                        <div style="display:flex; align-items:center; gap:2.5px;" title="Diamantes">
                            <span style="font-size:0.74rem; filter:drop-shadow(0 1px 1px rgba(0,0,0,0.35));">💎</span>
                            <span style="font-family:'EB Garamond', 'Cinzel', serif; font-size:0.8rem; color:#0b3778; font-weight:800;">${this.data.diamonds}</span>
                        </div>
                        <div style="width:1px; height:13px; background:rgba(181,137,50,0.35);"></div>
                        <!-- Enjin Coin -->
                        <div style="display:flex; align-items:center; gap:2.5px;" title="Enjin Coin (ENJ)">
                            <span style="display:inline-flex; align-items:center; justify-content:center; width:14px; height:14px; border-radius:50%; background:linear-gradient(135deg, #0b3778, #041f4a); border:1px solid #e5c168; font-family:'Cinzel',serif; font-weight:900; font-size:0.46rem; color:#fff3c2; line-height:1;">E</span>
                            <span style="font-family:'EB Garamond', 'Cinzel', serif; font-size:0.8rem; color:#2e1065; font-weight:800;">${enjinVal}</span>
                        </div>
                        <div style="width:1px; height:16px; background:rgba(181,137,50,0.45);"></div>
                        <!-- TELA CHEIA -->
                        <button id="btn-fullscreen" title="Tela cheia" style="display:flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:50%; background:linear-gradient(180deg, #0b3778 0%, #041f4a 100%); border:1.5px solid #d4af53; color:#fff3c2; font-size:0.72rem; cursor:pointer; padding:0; flex-shrink:0; box-shadow:0 2px 5px rgba(0,8,22,0.45); transition:transform 0.15s ease;">⛶</button>
                        <!-- CONFIGURAÇÕES / VOLTAR -->
                        <button id="btn-game-settings" title="Configurações" style="display:flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:50%; background:linear-gradient(180deg, #0b3778 0%, #041f4a 100%); border:1.5px solid #d4af53; color:#fff3c2; font-size:0.72rem; cursor:pointer; padding:0; flex-shrink:0; box-shadow:0 2px 5px rgba(0,8,22,0.45); transition:transform 0.15s ease;">⚙️</button>
                    </div>
                </div>
            </div>
            <style>
                .nova-header-profile-pill:hover {
                    transform: translateY(-1px);
                    filter: brightness(1.05);
                }
                #btn-fullscreen:hover, #btn-game-settings:hover {
                    transform: scale(1.08);
                    filter: brightness(1.12);
                }
                .coc-xp-fill { position: relative; }
                .coc-xp-fill::before {
                    content: '';
                    position: absolute;
                    top: 1px;
                    left: 3px;
                    right: 3px;
                    height: 38%;
                    border-radius: 6px;
                    background: linear-gradient(180deg, rgba(255,255,255,0.65), rgba(255,255,255,0));
                    pointer-events: none;
                }
                .coc-xp-stripes {
                    position: absolute;
                    inset: 0;
                    background: repeating-linear-gradient(-55deg, rgba(255,255,255,0.22) 0 8px, transparent 8px 16px);
                    animation: coc-xp-slide 1.2s linear infinite;
                    pointer-events: none;
                }
                @keyframes coc-xp-slide {
                    from { background-position: 0 0; }
                    to { background-position: 22px 0; }
                }
            </style>
        `;
    }

    public update(newData: Partial<TopHeaderData>) {
        this.data = { ...this.data, ...newData };
    }
}
