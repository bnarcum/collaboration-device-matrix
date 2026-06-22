/** ~1.5s synth activation sting (Web Audio — no external assets). */
let sharedCtx: AudioContext | null = null

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!Ctx) return null
  if (!sharedCtx) sharedCtx = new Ctx()
  return sharedCtx
}

export function playTronGridSting(): void {
  if (typeof window === 'undefined') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const ctx = audioContext()
  if (!ctx) return

  const run = () => {
    const t0 = ctx.currentTime
    const master = ctx.createGain()
    master.gain.setValueAtTime(0.0001, t0)
    master.gain.exponentialRampToValueAtTime(0.2, t0 + 0.03)
    master.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.65)
    master.connect(ctx.destination)

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.Q.value = 8
    filter.frequency.setValueAtTime(600, t0)
    filter.frequency.exponentialRampToValueAtTime(5200, t0 + 0.55)
    filter.frequency.exponentialRampToValueAtTime(900, t0 + 1.4)
    filter.connect(master)

    const notes = [146.83, 185, 220, 277.18, 329.63, 440]
    notes.forEach((freq, i) => {
      const start = t0 + i * 0.11
      const osc = ctx.createOscillator()
      osc.type = i < notes.length - 1 ? 'square' : 'sawtooth'
      osc.frequency.setValueAtTime(freq, start)

      const env = ctx.createGain()
      env.gain.setValueAtTime(0.0001, start)
      env.gain.exponentialRampToValueAtTime(0.14, start + 0.015)
      env.gain.exponentialRampToValueAtTime(0.0001, start + 0.32)

      osc.connect(env)
      env.connect(filter)
      osc.start(start)
      osc.stop(start + 0.34)
    })

    const sub = ctx.createOscillator()
    sub.type = 'sine'
    sub.frequency.setValueAtTime(55, t0)
    sub.frequency.exponentialRampToValueAtTime(92, t0 + 0.2)
    const subEnv = ctx.createGain()
    subEnv.gain.setValueAtTime(0.25, t0)
    subEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45)
    sub.connect(subEnv)
    subEnv.connect(master)
    sub.start(t0)
    sub.stop(t0 + 0.46)
  }

  if (ctx.state === 'suspended') {
    void ctx.resume().then(run).catch(() => {})
  } else {
    run()
  }
}
