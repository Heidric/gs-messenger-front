let ctx: AudioContext | null = null;

let master: GainNode | null = null;
let gA: GainNode | null = null;
let gB: GainNode | null = null;
let oscA: OscillatorNode | null = null;
let oscB: OscillatorNode | null = null;

let warbleTimer: number | null = null;
let cadenceTimer: number | null = null;

let playing = false;
let primed = false;

const FREQ_A = 1400;
const FREQ_B = 1600;
const WARBLE_HZ = 12;
const ON_MS = 1200;
const OFF_MS = 3000;

export async function primeRingtone() {
    try {
        if (!ctx) {
            ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (ctx.state === "suspended") {
            await ctx.resume();
        }
        primed = true;
    } catch {}
}

function ensureNodes() {
    if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    master ??= ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    gA ??= ctx.createGain();
    gB ??= ctx.createGain();
    gA.gain.value = 0;
    gB.gain.value = 1;

    if (!oscA) {
        oscA = ctx.createOscillator();
        oscA.type = "sine";
        oscA.frequency.value = FREQ_A;
        oscA.connect(gA!);
        gA!.connect(master!);
        oscA.start();
    }
    if (!oscB) {
        oscB = ctx.createOscillator();
        oscB.type = "sine";
        oscB.frequency.value = FREQ_B;
        oscB.connect(gB!);
        gB!.connect(master!);
        oscB.start();
    }
}

function startWarble() {
    stopWarble();
    let flip = false;
    const stepMs = 1000 / (WARBLE_HZ * 2);
    warbleTimer = window.setInterval(() => {
        if (!gA || !gB) return;
        flip = !flip;
        gA.gain.value = flip ? 1 : 0;
        gB.gain.value = flip ? 0 : 1;
    }, Math.max(20, Math.round(stepMs)));
}

function stopWarble() {
    if (warbleTimer != null) {
        clearInterval(warbleTimer);
        warbleTimer = null;
    }
}

function startCadence() {
    stopCadence();
    const loop = async () => {
        if (!ctx || !master) return;
        if (ctx.state === "suspended") {
            try { await ctx.resume(); } catch {}
        }
        const now = ctx.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.linearRampToValueAtTime(0.9, now + 0.02);

        cadenceTimer = window.setTimeout(() => {
            if (!ctx || !master) return;
            const t = ctx.currentTime;
            master.gain.cancelScheduledValues(t);
            master.gain.setValueAtTime(master.gain.value, t);
            master.gain.linearRampToValueAtTime(0.0, t + 0.04);

            cadenceTimer = window.setTimeout(loop, OFF_MS);
        }, ON_MS);
    };
    loop();
}

function stopCadence() {
    if (cadenceTimer != null) {
        clearTimeout(cadenceTimer);
        cadenceTimer = null;
    }
}

export async function startRingtone() {
    if (playing) return;
    try {
        if (!primed) await primeRingtone();
        ensureNodes();
        startWarble();
        startCadence();
        playing = true;
    } catch {}
}

export function stopRingtone() {
    playing = false;
    stopCadence();
    stopWarble();
    try { if (master) master.gain.setValueAtTime(0, ctx!.currentTime); } catch {}
}

export function teardownRingtone() {
    stopRingtone();
    try { oscA?.stop(); } catch {}
    try { oscB?.stop(); } catch {}
    oscA = null; oscB = null;
    gA = null; gB = null;
    try { master?.disconnect(); } catch {}
    master = null;
}
