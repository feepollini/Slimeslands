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
        const xpPercent = (this.data.userXp / this.data.xpNextLevel) * 100;
        const enjinVal = this.data.enjinCoin ?? 0;

        return `
            <div class="menu-top-bar" id="top-header-component" style="position:absolute; top:0; left:50%; transform:translateX(-50%); width:100%; max-width:480px; padding:12px 18px 24px 18px; box-sizing:border-box; z-index:200; pointer-events:none; display:flex; justify-content:space-between; align-items:center; min-height:85px; background:linear-gradient(180deg, rgba(8,10,16,0.98) 0%, rgba(8,10,16,0.85) 55%, rgba(8,10,16,0.3) 80%, rgba(8,10,16,0) 100%); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);">
                
                <!-- SEÇÃO DO PERFIL -->
                <div style="display:flex; align-items:center; pointer-events:auto; flex-shrink:1; min-width:0;">
                    <div class="profile-group" id="btn-profile" style="display:flex; align-items:center; cursor:pointer; min-width:0;">
                        <!-- Avatar Reduzido -->
                        <div class="avatar-medallion" style="width:48px; height:48px; border:3px solid #3a2a12; outline:2px solid #d4af37; border-radius:50%; display:flex; align-items:center; justify-content:center; background:radial-gradient(circle at 35% 30%, #4a351e, #140d05); flex-shrink:0; box-shadow:0 3px 0 rgba(0,0,0,0.6), inset 0 2px 3px rgba(255,236,190,0.35), 0 0 12px rgba(212,175,55,0.35);">
                            <div style="width:42px; height:42px; border-radius:50%; background:url('/cards/1.jpg') center/cover;"></div>
                        </div>
                        
                        <!-- Texto e XP Ajustados para Mobile -->
                        <div style="display:flex; flex-direction:column; margin-left:12px; justify-content:center; min-width:0; overflow:hidden;">
                            <div class="profile-name" style="font-family:'Cinzel', serif; font-size:0.8rem; font-weight:700; color:#ffd76a; letter-spacing:1px; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding-bottom: 2px; text-shadow:-1px -1px 0 #2a1a00, 1px -1px 0 #2a1a00, -1px 1px 0 #2a1a00, 1px 1px 0 #2a1a00, 0 2px 0 rgba(0,0,0,0.7);">${t('header.name')}</div>
                            <div style="display:flex; align-items:center; gap:8px;">
                                <span style="font-family:'Orbitron', sans-serif; font-size:0.65rem; color:#ffe9a8; font-weight:900; white-space:nowrap; background:linear-gradient(180deg, #5a4128, #2a1c0d); border:2px solid #0e0903; border-radius:8px; padding:2px 7px; box-shadow:inset 0 1px 0 rgba(255,236,190,0.4), 0 2px 0 rgba(0,0,0,0.5); text-shadow:0 1px 0 #000;">${t('header.lv')} ${this.data.userLevel}</span>
                                <div style="width:120px; height:18px; background:rgba(0,0,0,0.6); border:2px solid #0e0903; overflow:hidden; border-radius:10px; position:relative; display:flex; align-items:center; box-shadow:0 2px 0 rgba(0,0,0,0.5), inset 0 2px 5px rgba(0,0,0,0.8);">
                                    <div class="coc-xp-fill" style="width:${xpPercent}%; height:100%; position:relative; background:linear-gradient(180deg, #ffe27a 0%, #ffd700 35%, #c78d12 80%, #8a5f06 100%); box-shadow:0 0 10px rgba(212,175,55,0.6), inset 0 -3px 0 rgba(0,0,0,0.3); transition:width 0.5s ease-out;"><div class="coc-xp-stripes"></div></div>
                                    <span style="position:absolute; width:100%; text-align:center; font-family:'Orbitron', sans-serif; font-size:0.55rem; color:#fff; font-weight:900; letter-spacing:1px; text-shadow:1px 1px 2px #000, 0 0 4px #000; z-index:2; pointer-events:none;">${this.data.userXp}/${this.data.xpNextLevel} ${t('header.xps')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SEÇÃO FINANCEIRA AMPLIADA (3 SLOTS: OURO, DIAMANTE E ENJIN COIN) -->
                <div style="display:flex; align-items:center; pointer-events:auto; flex-shrink:0;">
                    <div style="display:flex; align-items:center; background:linear-gradient(180deg, #4a351e, #241809); padding:0 10px; height:36px; border:2px solid #0e0903; border-radius:12px; gap:7px; box-shadow:0 3px 0 rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,236,190,0.35);">
                        <!-- Ouro -->
                        <div style="display:flex; align-items:center; gap:3px;" title="Moedas de Ouro">
                            <span style="font-size:0.8rem; filter:drop-shadow(0 2px 0 rgba(0,0,0,0.6));">🪙</span>
                            <span style="font-family:'Cinzel', serif; font-size:0.8rem; color:#ffe9a8; font-weight:700; text-shadow:-1px -1px 0 #2a1a00, 1px -1px 0 #2a1a00, -1px 1px 0 #2a1a00, 1px 1px 0 #2a1a00, 0 2px 0 rgba(0,0,0,0.6);">${this.data.gold}</span>
                        </div>
                        <div style="width:1px; height:14px; background:rgba(212,175,55,0.25);"></div>
                        <!-- Diamantes -->
                        <div style="display:flex; align-items:center; gap:3px;" title="Diamantes">
                            <span style="font-size:0.8rem; filter:drop-shadow(0 2px 0 rgba(0,0,0,0.6));">💎</span>
                            <span style="font-family:'Cinzel', serif; font-size:0.8rem; color:#cbf2ff; font-weight:700; text-shadow:-1px -1px 0 #002233, 1px -1px 0 #002233, -1px 1px 0 #002233, 1px 1px 0 #002233, 0 2px 0 rgba(0,0,0,0.6);">${this.data.diamonds}</span>
                        </div>
                        <div style="width:1px; height:14px; background:rgba(212,175,55,0.25);"></div>
                        <!-- Enjin Coin -->
                        <div style="display:flex; align-items:center; gap:4px;" title="Enjin Coin (ENJ)">
                            <span style="display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; border-radius:50%; background:linear-gradient(135deg, #a855f7, #6b21a8); border:1px solid #d8b4fe; box-shadow:0 0 6px rgba(168,85,247,0.7); font-family:'Outfit',sans-serif; font-weight:900; font-size:0.55rem; color:#fff; line-height:1;">E</span>
                            <span style="font-family:'Cinzel', serif; font-size:0.8rem; color:#f3e8ff; font-weight:700; text-shadow:-1px -1px 0 #2a0845, 1px -1px 0 #2a0845, -1px 1px 0 #2a0845, 1px 1px 0 #2a0845, 0 2px 0 rgba(0,0,0,0.6);">${enjinVal}</span>
                        </div>
                        <div style="width:1px; height:14px; background:rgba(212,175,55,0.25);"></div>
                        <!-- TELA CHEIA -->
                        <button id="btn-fullscreen" title="Tela cheia" style="display:flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:8px; background:rgba(0,0,0,0.45); border:1px solid rgba(212,175,55,0.4); color:#ffe9a8; font-size:0.85rem; cursor:pointer; padding:0; flex-shrink:0;">⛶</button>
                    </div>
                </div>
            </div>
            <style>
                .coc-xp-fill { position: relative; }
                .coc-xp-fill::before {
                    content: '';
                    position: absolute;
                    top: 1px;
                    left: 3px;
                    right: 3px;
                    height: 38%;
                    border-radius: 6px;
                    background: linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0));
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
