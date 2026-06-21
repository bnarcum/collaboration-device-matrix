import { useEffect, useRef } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { resolveTronShowroom } from '../theme/tronShowroom'

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  phase: number
}

const NODE_COUNT = 28
const LINK_DIST = 190

/**
 * Animated constellation mesh + CSS layers — matches Portfolio Navigator
 * `#bg-ambient` (grid, glow, beams, drifting nodes).
 */
export function CelestialBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const tron = resolveTronShowroom()

  useEffect(() => {
    if (tron) return
    const canvas = canvasRef.current
    const host = hostRef.current
    if (!canvas || !host) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = 0
    let h = 0
    let nodes: Node[] = []
    let rafId: number | null = null
    let lastTs = 0

    const resize = () => {
      w = host.clientWidth || window.innerWidth
      h = host.clientHeight || window.innerHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const initNodes = () => {
      nodes = Array.from({ length: NODE_COUNT }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * (reducedMotion ? 0 : 0.11),
        vy: (Math.random() - 0.5) * (reducedMotion ? 0 : 0.11),
        phase: Math.random() * Math.PI * 2,
      }))
    }

    const drawMesh = (now: number) => {
      const t = now * 0.001
      const dt = lastTs ? Math.min(0.032, (now - lastTs) / 1000) : 1 / 60
      lastTs = now
      ctx.clearRect(0, 0, w, h)

      if (!reducedMotion) {
        const edge = 24
        for (const n of nodes) {
          n.x += n.vx * dt * 60
          n.y += n.vy * dt * 60
          if (n.x < edge) {
            n.x = edge
            n.vx = Math.abs(n.vx) * 0.96
          } else if (n.x > w - edge) {
            n.x = w - edge
            n.vx = -Math.abs(n.vx) * 0.96
          }
          if (n.y < edge) {
            n.y = edge
            n.vy = Math.abs(n.vy) * 0.96
          } else if (n.y > h - edge) {
            n.y = h - edge
            n.vy = -Math.abs(n.vy) * 0.96
          }
        }
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]
          const b = nodes[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.hypot(dx, dy)
          if (dist < LINK_DIST) {
            const alpha = (1 - dist / LINK_DIST) * 0.22
            ctx.strokeStyle = `rgba(2,200,255,${alpha})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      for (const n of nodes) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.85 + n.phase)
        const alpha = 0.26 + pulse * 0.14
        const radius = 1.45 + pulse * 0.35
        ctx.fillStyle = `rgba(2,200,255,${alpha})`
        ctx.beginPath()
        ctx.arc(n.x, n.y, radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const tick = (now: number) => {
      drawMesh(now)
      if (!reducedMotion) rafId = requestAnimationFrame(tick)
    }

    const start = () => {
      lastTs = 0
      tick(performance.now())
      if (!reducedMotion && rafId == null) rafId = requestAnimationFrame(tick)
    }

    const stop = () => {
      if (rafId != null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
    }

    const onResize = () => {
      resize()
      initNodes()
      start()
    }

    resize()
    initNodes()
    start()

    const ro = new ResizeObserver(onResize)
    ro.observe(host)
    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop()
      else start()
    })

    return () => {
      stop()
      ro.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [reducedMotion, tron])

  return (
    <div
      ref={hostRef}
      className={tron ? 'celestial-bg celestial-bg--tron' : 'celestial-bg'}
      aria-hidden="true"
    >
      {!tron && (
        <>
          <div className="celestial-bg__vignette" />
          <div className="celestial-bg__beams" />
          <div className="celestial-bg__glow" />
          <canvas ref={canvasRef} className="celestial-bg__mesh" />
        </>
      )}
      <div className="celestial-bg__grid" />
      {tron && <div className="celestial-bg__scanlines" aria-hidden="true" />}
    </div>
  )
}
