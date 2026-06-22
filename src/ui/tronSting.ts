/** ~1.5s synth activation sting (Web Audio — no external assets). */

let sharedCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!Ctx) return null
  if (!sharedCtx) sharedCtx = new Ctx()
  return sharedCtx
}

/** Call during any user gesture so the context is unlocked before the sting. */
export function primeTronAudio(): void {
  const ctx = getCtx()
  if (ctx?.state === 'suspended') void ctx.resume()
}

export function playTronGridSting(): void {
  if (typeof window === 'undefined') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const ctx = getCtx()
  if (!ctx) return

  // Must resume synchronously in the click handler — do not await before scheduling.
  if (ctx.state === 'suspended') void ctx.resume()

  const t0 = ctx.currentTime + 0.02
  const master = ctx.createGain()
  master.gain.setValueAtTime(0, t0)
  master.gain.linearRampToValueAtTime(0.42, t0 + 0.04)
  master.gain.linearRampToValueAtTime(0, t0 + 1.7)
  master.connect(ctx.destination)

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.Q.value = 6
  filter.frequency.setValueAtTime(500, t0)
  filter.frequency.linearRampToValueAtTime(4800, t0 + 0.5)
  filter.frequency.linearRampToValueAtTime(1200, t0 + 1.5)
  filter.connect(master)

  const notes = [146.83, 185, 220, 277.18, 329.63, 440]
  notes.forEach((freq, i) => {
    const start = t0 + i * 0.1
    const osc = ctx.createOscillator()
    osc.type = i < notes.length - 1 ? 'square' : 'sawtooth'
    osc.frequency.setValueAtTime(freq, start)

    const env = ctx.createGain()
    env.gain.setValueAtTime(0, start)
    env.gain.linearRampToValueAtTime(0.22, start + 0.012)
    env.gain.linearRampToValueAtTime(0, start + 0.34)

    osc.connect(env)
    env.connect(filter)
    osc.start(start)
    osc.stop(start + 0.36)
  })

  const sub = ctx.createOscillator()
  sub.type = 'sine'
  sub.frequency.setValueAtTime(55, t0)
  sub.frequency.linearRampToValueAtTime(98, t0 + 0.18)
  const subEnv = ctx.createGain()
  subEnv.gain.setValueAtTime(0.38, t0)
  subEnv.gain.linearRampToValueAtTime(0, t0 + 0.48)
  sub.connect(subEnv)
  subEnv.connect(master)
  sub.start(t0)
  sub.stop(t0 + 0.5)
}
