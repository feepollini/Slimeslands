export interface PlayerData {
    level: number;
    xp: number;
    gold: number;
    diamonds: number;
    enjinCoin?: number;
}

export interface MatchStats {
    cardsUsed: number;
    perfectParrys: number;
    cardsDefeated: number;
}

export interface MatchRewards {
    xpGained: number;
    goldGained: number;
    diamondGained: number;
    enjinGained: number;
}

/**
 * ProgressionManager - Handles Leveling, XP rules and Match Rewards.
 */
export class ProgressionManager {
    private static STORAGE_KEY = 'legends_player_progression';

    /**
     * Define the XP scaling rule dynamically.
     * Level 0 -> 1 = 10xp
     * Level 1 -> 2 = 30xp
     * Level 2 -> 3 = 70xp
     * Level 3 -> 4 = 150xp
     * Formula: 10 * ((2 ^ (level + 1)) - 1)
     */
    public static getNextLevelXpRequirement(currentLevel: number): number {
        return 10 * (Math.pow(2, currentLevel + 1) - 1);
    }

    /**
     * Gets the current player data from Local Storage.
     */
    public static getPlayerData(): PlayerData {
        const rawData = localStorage.getItem(this.STORAGE_KEY);
        if (rawData) {
            try {
                const parsed = JSON.parse(rawData);
                parsed.enjinCoin = parsed.enjinCoin ?? 0;
                return parsed;
            } catch (e) {
                console.error("Error parsing player data", e);
            }
        }
        // Defaults if none exist
        return {
            level: 0,
            xp: 0,
            gold: 0,
            diamonds: 0,
            enjinCoin: 0
        };
    }

    /**
     * Saves the current player data state.
     */
    public static savePlayerData(data: PlayerData): void {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    }

    /**
     * Calculate rewards based on win/loss and match statistics.
     */
    public static calculateMatchRewards(isWin: boolean, stats: MatchStats): MatchRewards {
        const data = this.getPlayerData();
        const requiredXp = this.getNextLevelXpRequirement(data.level);

        // Win = 30% of current level's total requirement. Loss = 15%.
        const xpPercent = isWin ? 0.30 : 0.15;
        const xpGained = Math.round(requiredXp * xpPercent);

        let goldGained = 0;
        let diamondGained = 0;
        let enjinGained = 0;
        if (isWin) {
            goldGained = (stats.cardsUsed * 3) + (stats.perfectParrys * 3) + (stats.cardsDefeated * 3);
            diamondGained = 1;
            enjinGained = 1;
        }

        return { xpGained, goldGained, diamondGained, enjinGained };
    }

    /**
     * Apply XP and checks if a level-up threshold is reached.
     */
    public static addXpAndCheckLevelUp(amount: number): PlayerData {
        const data = this.getPlayerData();
        data.xp += amount;

        let requiredXp = this.getNextLevelXpRequirement(data.level);
        
        // Handle repeated level-ups if enough XP is gained at once
        while (data.xp >= requiredXp) {
            data.level++;
            data.xp -= requiredXp; // Consume the XP used to level up
            requiredXp = this.getNextLevelXpRequirement(data.level);
        }

        this.savePlayerData(data);
        return data;
    }

    /**
     * Grand unified function to process the end of a battle.
     */
    public static applyMatchRewards(isWin: boolean, stats: MatchStats): { data: PlayerData, rewards: MatchRewards } {
        const rewards = this.calculateMatchRewards(isWin, stats);
        
        // Apply XP
        let data = this.addXpAndCheckLevelUp(rewards.xpGained);
        
        // Apply Gold / Diamonds / Enjin Coin
        data.gold += rewards.goldGained;
        data.diamonds += rewards.diamondGained;
        data.enjinCoin = (data.enjinCoin ?? 0) + (rewards.enjinGained ?? 0);
        this.savePlayerData(data);

        return { data, rewards };
    }
}
