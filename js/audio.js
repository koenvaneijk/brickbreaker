/**
 * Audio system for Cosmic Brick Breaker
 * Uses Tone.js for procedural audio synthesis
 */

class AudioManager {
    constructor() {
        this.initialized = false;
        this.muted = false;
        this.musicIntensity = 0;
        this.synths = {};
        this.effects = {};
        this.players = {};
        this.musicLayers = [];
        this.currentPowerUpThemes = new Map();
    }
    
    
    createBasePattern() {
        const chords = [
            ["C2", "G2", "C3"],
            ["A1", "E2", "A2"],
            ["F1", "C2", "F2"],
            ["G1", "D2", "G2"]
        ];
        
        return new Tone.Sequence((time, chord) => {
            if (this.muted) return;
            this.musicLayers[0].synth.triggerAttackRelease(chord, "2n", time);
        }, chords, "1m");
    }
    
    createRhythmPattern() {
        const notes = ["C1", null, "G1", null, "C1", null, "G1", "C1"];
        
        return new Tone.Sequence((time, note) => {
            if (this.muted || !note) return;
            this.musicLayers[1].synth.triggerAttackRelease(note, "16n", time);
        }, notes, "8n");
    }
    
    createArpeggioPattern() {
        const notes = ["C4", "E4", "G4", "B4", "A4", "F4", "D4", "E4"];
        
        return new Tone.Sequence((time, note) => {
            if (this.muted) return;
            this.musicLayers[2].synth.triggerAttackRelease(note, "16n", time);
        }, notes, "16n");
    }
    
    createMelodyPattern() {
        const notes = ["C5", "G4", "A4", "E4", "G4", "C5", "B4", "G4"];
        
        return new Tone.Sequence((time, note) => {
            if (this.muted) return;
            this.musicLayers[3].synth.triggerAttackRelease(note, "8n", time);
        }, notes, "4n");
    }
    
    startMusic() {
        if (!this.initialized) return;
        
        // Start all patterns
        this.musicLayers.forEach(layer => {
            layer.pattern.start(0);
        });
        
        // Update music intensity periodically
        this.updateMusicLayers();
    }
    
    updateMusicLayers() {
        this.musicLayers.forEach(layer => {
            // Adjust volume based on intensity
            if (this.musicIntensity >= layer.minIntensity) {
                const intensity = Math.min(1, (this.musicIntensity - layer.minIntensity) * 2);
                const targetVolume = -30 + (intensity * 15);
                layer.synth.volume.rampTo(targetVolume, 1);
            } else {
                layer.synth.volume.rampTo(-60, 0.5);
            }
        });
    }
    
    setMusicIntensity(value) {
        this.musicIntensity = Utils.clamp(value, 0, 1);
        this.updateMusicLayers();
    }

    async init() {
        if (this.initialized) return;
        
        // Start audio context
        await Tone.start();
        Tone.Transport.start();
        
        // Set up master effects
        this.effects.masterReverb = new Tone.Reverb({
            decay: 1.5,
            wet: 0.2
        }).toDestination();
        
        this.effects.masterDelay = new Tone.FeedbackDelay({
            delayTime: "8n",
            feedback: 0.2,
            wet: 0.1
        }).connect(this.effects.masterReverb);
        
        // Create synths
        this.synths.paddle = new Tone.Synth({
            oscillator: { type: "sine" },
            envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 }
        }).connect(this.effects.masterDelay);
        
        this.synths.ball = new Tone.MetalSynth({
            frequency: 200,
            envelope: { attack: 0.001, decay: 0.1, release: 0.1 },
            harmonicity: 5.1,
            modulationIndex: 32,
            resonance: 4000,
            octaves: 1.5
        }).connect(this.effects.masterDelay);
        
        this.synths.brick = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "triangle" },
            envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
        }).connect(this.effects.masterDelay);
        
        this.synths.powerUp = new Tone.Synth({
            oscillator: { type: "sine" },
            envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.5 }
        }).connect(this.effects.masterDelay);
        
        // Set up music layers
        this.setupMusic();
        
        this.initialized = true;
    }
    
    setupMusic() {
        // Base layer - ambient pad
        const baseSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "sine" },
            envelope: { attack: 0.5, decay: 0.5, sustain: 1, release: 1 }
        }).connect(this.effects.masterReverb);
        baseSynth.volume.value = -15;
        
        // Rhythm layer
        const rhythmSynth = new Tone.MembraneSynth({
            pitchDecay: 0.05,
            octaves: 4,
            oscillator: { type: "sine" },
            envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
        }).connect(this.effects.masterDelay);
        rhythmSynth.volume.value = -20;
        
        // Arpeggio layer
        const arpeggioSynth = new Tone.Synth({
            oscillator: { type: "square" },
            envelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.1 }
        }).connect(this.effects.masterDelay);
        arpeggioSynth.volume.value = -25;
        
        // Melody layer
        const melodySynth = new Tone.FMSynth({
            harmonicity: 3,
            modulationIndex: 10,
            oscillator: { type: "sine" },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.2 }
        }).connect(this.effects.masterDelay);
        melodySynth.volume.value = -30;
        
        // Store music layers
        this.musicLayers = [
            {
                synth: baseSynth,
                pattern: this.createBasePattern(),
                minIntensity: 0
            },
            {
                synth: rhythmSynth,
                pattern: this.createRhythmPattern(),
                minIntensity: 0.2
            },
            {
                synth: arpeggioSynth,
                pattern: this.createArpeggioPattern(),
                minIntensity: 0.4
            },
            {
                synth: melodySynth,
                pattern: this.createMelodyPattern(),
                minIntensity: 0.7
            }
        ];
    }
    
    createBasePattern() {
        const chords = [
            ["C2", "G2", "C3"],
            ["A1", "E2", "A2"],
            ["F1", "C2", "F2"],
            ["G1", "D2", "G2"]
        ];
        
        return new Tone.Sequence((time, chord) => {
            if (this.muted) return;
            this.musicLayers[0].synth.triggerAttackRelease(chord, "2n", time);
        }, chords, "1m");
    }
    
    createRhythmPattern() {
        const notes = ["C1", null, "G1", null, "C1", null, "G1", "C1"];
        
        return new Tone.Sequence((time, note) => {
            if (this.muted || !note) return;
            this.musicLayers[1].synth.triggerAttackRelease(note, "16n", time);
        }, notes, "8n");
    }
    
    createArpeggioPattern() {
        const notes = ["C4", "E4", "G4", "B4", "A4", "F4", "D4", "E4"];
        
        return new Tone.Sequence((time, note) => {
            if (this.muted) return;
            this.musicLayers[2].synth.triggerAttackRelease(note, "16n", time);
        }, notes, "16n");
    }
    
    createMelodyPattern() {
        const notes = ["C5", "G4", "A4", "E4", "G4", "C5", "B4", "G4"];
        
        return new Tone.Sequence((time, note) => {
            if (this.muted) return;
            this.musicLayers[3].synth.triggerAttackRelease(note, "8n", time);
        }, notes, "4n");
    }
    
    startMusic() {
        if (!this.initialized) return;
        
        // Start all patterns
        this.musicLayers.forEach(layer => {
            layer.pattern.start(0);
        });
        
        // Update music intensity periodically
        this.updateMusicLayers();
    }
    
    updateMusicLayers() {
        this.musicLayers.forEach(layer => {
            // Adjust volume based on intensity
            if (this.musicIntensity >= layer.minIntensity) {
                const intensity = Math.min(1, (this.musicIntensity - layer.minIntensity) * 2);
                const targetVolume = -30 + (intensity * 15);
                layer.synth.volume.rampTo(targetVolume, 1);
            } else {
                layer.synth.volume.rampTo(-60, 0.5);
            }
        });
    }
    
    setMusicIntensity(value) {
        this.musicIntensity = Utils.clamp(value, 0, 1);
        this.updateMusicLayers();
    }
    
    playBallPaddleHit(velocity = 1) {
        if (this.muted || !this.initialized) return;
        
        const pitch = Utils.lerp(300, 600, velocity);
        this.synths.paddle.triggerAttackRelease(pitch, 0.05);
    }
    
    playBallWallHit(velocity = 1) {
        if (this.muted || !this.initialized) return;
        
        const pitch = Utils.lerp(200, 400, velocity);
        this.synths.ball.triggerAttackRelease(pitch, 0.05);
    }
    
    playBrickHit(brickType, velocity = 1) {
        if (this.muted || !this.initialized) return;
        
        let note;
        let octave;
        
        switch (brickType) {
            case 'standard':
                note = ['C', 'E', 'G', 'B'][Utils.randomInt(0, 3)];
                octave = 4;
                break;
            case 'reinforced':
                note = ['D', 'F', 'A'][Utils.randomInt(0, 2)];
                octave = 3;
                break;
            case 'explosive':
                note = ['C', 'E', 'G'][Utils.randomInt(0, 2)];
                octave = 5;
                break;
            case 'powerUp':
                note = ['F', 'A', 'C'][Utils.randomInt(0, 2)];
                octave = 4;
                break;
            default:
                note = 'C';
                octave = 4;
        }
        
        const pitch = note + octave;
        this.synths.brick.triggerAttackRelease(pitch, 0.1);
    }
    
    playBallWallHit(velocity = 1) {
        if (this.muted || !this.initialized) return;
        
        const pitch = Utils.lerp(200, 400, velocity);
        this.synths.ball.triggerAttackRelease(pitch, 0.05);
    }
    
    playBrickHit(brickType, velocity = 1) {
        if (this.muted || !this.initialized) return;
        
        let note;
        let octave;
        
        switch (brickType) {
            case 'standard':
                note = ['C', 'E', 'G', 'B'][Utils.randomInt(0, 3)];
                octave = 4;
                break;
            case 'reinforced':
                note = ['D', 'F', 'A'][Utils.randomInt(0, 2)];
                octave = 3;
                break;
            case 'explosive':
                note = ['C', 'E', 'G'][Utils.randomInt(0, 2)];
                octave = 5;
                break;
            case 'powerUp':
                note = ['F', 'A', 'C'][Utils.randomInt(0, 2)];
                octave = 4;
                break;
            default:
                note = 'C';
                octave = 4;
        }
        
        const pitch = note + octave;
        this.synths.brick.triggerAttackRelease(pitch, 0.1);
    }
    
    playPowerUpCollected(powerUpType) {
        if (this.muted || !this.initialized) return;
        
        // Define notes for each power-up type
        const powerUpNotes = {
            'multiBall': ['C5', 'E5', 'G5', 'C6'],
            'paddleExpansion': ['G4', 'B4', 'D5', 'G5'],
            'slowMotion': ['F4', 'A4', 'C5', 'F5'],
            'laserCannon': ['D5', 'F#5', 'A5', 'D6'],
            'fireball': ['C5', 'D5', 'E5', 'G5'],
            'magneticPaddle': ['E5', 'G5', 'B5', 'E6'],
            'shield': ['A4', 'C5', 'E5', 'A5'],
            'brickBuster': ['B4', 'D5', 'F#5', 'B5']
        };
        
        const notes = powerUpNotes[powerUpType] || ['C5', 'E5', 'G5', 'C6'];
        
        // Play ascending arpeggio
        const now = Tone.now();
        notes.forEach((note, i) => {
            this.synths.powerUp.triggerAttackRelease(note, 0.1, now + i * 0.1);
        });
    }
    
    playPowerUpTheme(powerUpType) {
        if (this.muted || !this.initialized) return;
        
        // If already playing this power-up theme, don't restart
        if (this.currentPowerUpThemes.has(powerUpType)) {
            return;
        }
        
        // Create a specific motif for this power-up
        const synth = new Tone.Synth({
            oscillator: { type: "triangle" },
            envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.1 }
        }).connect(this.effects.masterDelay);
        
        synth.volume.value = -20;
        
        // Define different patterns for each power-up
        const patterns = {
            'multiBall': ["C5", "E5", "G5"],
            'paddleExpansion': ["G4", "B4", "D5"],
            'slowMotion': ["F4", "A4", "C5"],
            'laserCannon': ["D5", "F#5", "A5"],
            'fireball': ["C5", "D5", "E5"],
            'magneticPaddle': ["E5", "G5", "B5"],
            'shield': ["A4", "C5", "E5"],
            'brickBuster': ["B4", "D5", "F#5"]
        };
        
        const notes = patterns[powerUpType] || ["C5", "E5", "G5"];
        
        // Create a sequence that plays the motif
        const pattern = new Tone.Sequence((time, note) => {
            if (this.muted) return;
            synth.triggerAttackRelease(note, "16n", time);
        }, notes, "8n");
        
        pattern.start(0);
        
        // Store the theme
        this.currentPowerUpThemes.set(powerUpType, {
            synth,
            pattern
        });
    }
    
    stopPowerUpTheme(powerUpType) {
        if (!this.currentPowerUpThemes.has(powerUpType)) return;
        
        const theme = this.currentPowerUpThemes.get(powerUpType);
        theme.pattern.stop();
        theme.synth.dispose();
        
        this.currentPowerUpThemes.delete(powerUpType);
    }
    
    playPowerUpTheme(powerUpType) {
        if (this.muted || !this.initialized) return;
        
        // If already playing this power-up theme, don't restart
        if (this.currentPowerUpThemes.has(powerUpType)) {
            return;
        }
        
        // Create a specific motif for this power-up
        const synth = new Tone.Synth({
            oscillator: { type: "triangle" },
            envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.1 }
        }).connect(this.effects.masterDelay);
        
        synth.volume.value = -20;
        
        // Define different patterns for each power-up
        const patterns = {
            'multiBall': ["C5", "E5", "G5"],
            'paddleExpansion': ["G4", "B4", "D5"],
            'slowMotion': ["F4", "A4", "C5"],
            'laserCannon': ["D5", "F#5", "A5"],
            'fireball': ["C5", "D5", "E5"],
            'magneticPaddle': ["E5", "G5", "B5"],
            'shield': ["A4", "C5", "E5"],
            'brickBuster': ["B4", "D5", "F#5"]
        };
        
        const notes = patterns[powerUpType] || ["C5", "E5", "G5"];
        
        // Create a sequence that plays the motif
        const pattern = new Tone.Sequence((time, note) => {
            if (this.muted) return;
            synth.triggerAttackRelease(note, "16n", time);
        }, notes, "8n");
        
        pattern.start(0);
        
        // Store the theme
        this.currentPowerUpThemes.set(powerUpType, {
            synth,
            pattern
        });
    }
    
    stopPowerUpTheme(powerUpType) {
        if (!this.currentPowerUpThemes.has(powerUpType)) return;
        
        const theme = this.currentPowerUpThemes.get(powerUpType);
        theme.pattern.stop();
        theme.synth.dispose();
        
        this.currentPowerUpThemes.delete(powerUpType);
    }
    
    playGameOver() {
        if (this.muted || !this.initialized) return;
        
        const now = Tone.now();
        const notes = ["C4", "G3", "E3", "C3"];
        
        notes.forEach((note, i) => {
            this.synths.brick.triggerAttackRelease(note, 0.3, now + i * 0.2);
        });
        
        // Stop all music
        this.musicLayers.forEach(layer => {
            layer.pattern.stop();
        });
    }
    
    playLevelUp() {
        if (this.muted || !this.initialized) return;
        
        const now = Tone.now();
        const notes = ["C4", "E4", "G4", "C5", "E5", "G5", "C6"];
        
        notes.forEach((note, i) => {
            this.synths.powerUp.triggerAttackRelease(note, 0.1, now + i * 0.1);
        });
    }
    
    playGameOver() {
        if (this.muted || !this.initialized) return;
        
        const now = Tone.now();
        const notes = ["C4", "G3", "E3", "C3"];
        
        notes.forEach((note, i) => {
            this.synths.brick.triggerAttackRelease(note, 0.3, now + i * 0.2);
        });
        
        // Stop all music
        this.musicLayers.forEach(layer => {
            layer.pattern.stop();
        });
    }
    
    playLevelUp() {
        if (this.muted || !this.initialized) return;
        
        const now = Tone.now();
        const notes = ["C4", "E4", "G4", "C5", "E5", "G5", "C6"];
        
        notes.forEach((note, i) => {
            this.synths.powerUp.triggerAttackRelease(note, 0.1, now + i * 0.1);
        });
    }
    
    toggleMute() {
        this.muted = !this.muted;
        
        if (this.muted) {
            Tone.Master.volume.value = -Infinity;
        } else {
            Tone.Master.volume.value = 0;
        }
        
        return this.muted;
    }
    
    dispose() {
        // Clean up all audio resources
        Object.values(this.synths).forEach(synth => synth.dispose());
        Object.values(this.effects).forEach(effect => effect.dispose());
        Object.values(this.players).forEach(player => player.dispose());
        
        this.musicLayers.forEach(layer => {
            layer.pattern.dispose();
            layer.synth.dispose();
        });
        
        this.currentPowerUpThemes.forEach(theme => {
            theme.pattern.dispose();
            theme.synth.dispose();
        });
        
        this.initialized = false;
    }
}
