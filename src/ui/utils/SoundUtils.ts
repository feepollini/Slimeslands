/**
 * SoundUtils.ts
 * Centralized sound management for Legends of Winter.
 */

export class SoundUtils {
    // Verified direct MP3 links for maximum browser compatibility
    public static readonly SFX = {
        CLICK: 'https://www.soundjay.com/buttons/button-16.mp3',
        SWOOSH: 'https://www.soundjay.com/buttons/button-09.mp3',
        IMPACT_BLUNT: 'https://www.soundjay.com/mechanical/punch-1.mp3', 
        IMPACT_BLADE: 'https://www.soundjay.com/mechanical/iron-bar-drop-1.mp3',
        IMPACT_MAGIC: 'https://www.soundjay.com/buttons/button-10.mp3',
        DEATH: 'https://www.soundjay.com/mechanical/shutter-1.mp3',
        VICTORY: 'https://www.soundjay.com/buttons/button-3.mp3',
        DEFEAT: 'https://www.soundjay.com/mechanical/fuzz-1.mp3',
        DRAW: 'https://www.soundjay.com/natural/paper-flip-1.mp3',
        PLACE: 'https://www.soundjay.com/buttons/button-20.mp3',
        HEAL: 'https://www.soundjay.com/buttons/button-11.mp3'
    };

    private static audioCache: Map<string, HTMLAudioElement> = new Map();

    public static play(url: string, volume: number = 0.5): void {
        try {
            let audio = this.audioCache.get(url);
            if (!audio) {
                audio = new Audio(url);
                audio.preload = 'auto';
                this.audioCache.set(url, audio);
            }

            // Clone for overlapping sounds
            const player = audio.cloneNode() as HTMLAudioElement;
            player.volume = volume;
            
            const promise = player.play();
            if (promise !== undefined) {
                promise.catch(err => {
                    if (err.name === 'NotAllowedError') {
                        console.warn("[SoundUtils] Playback blocked by browser policy. Interaction required.");
                    } else if (err.name === 'NotSupportedError') {
                        console.error("[SoundUtils] Format not supported or 404 URL:", url);
                    } else {
                        console.error(`[SoundUtils] Error playing sound (${url}):`, err);
                    }
                });
            }
        } catch (e) {
            console.error("[SoundUtils] Fatal error in play():", e);
        }
    }

    public static playSfx(sfxKey: keyof typeof SoundUtils.SFX, volume: number = 0.5): void {
        const url = this.SFX[sfxKey];
        if (url) this.play(url, volume);
    }
}
