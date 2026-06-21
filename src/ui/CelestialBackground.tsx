import { useEffect, useRef } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'

interface Node {
  x: number
  y: number
  vx: number
  vy: number
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

  useEffect(() => {
    const canvas = canvasRef.current
    const host = hostRef.current
    if (!canvas || !host) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = 0
    let h = 0
    let nodes: Node[] = []
    let rafId: number | null = null

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
        vx: (Math.random() - 0.5) * (reducedMotion ? 0 : 0.18),
        vy: (Math.random() - 0.5) * (reducedMotion ? 0 : 0.18),
      }))
    }

    const drawMesh = () => {
      ctx.clearRect(0, 0, w, h)

      if (!reducedMotion) {
        for (const n of nodes) {
          n.x += n.vx
          n.y += n.vy
          if (n.x < 0 || n.x > w) n.vx *= -1
          if (n.y < 0 || n.y > h) n.vy *= -1
          n.x = Math.max(0, Math.min(w, n.x))
          n.y = Math.max(0, Math.min(h, n.y))
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
        ctx.fillStyle = 'rgba(2,200,255,0.38)'
        ctx.beginPath()
        ctx.arc(n.x, n.y, 1.8, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const tick = () => {
      drawMesh()
      if (!reducedMotion) rafId = requestAnimationFrame(tick)
    }

    const start = () => {
      drawMesh()
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
  }, [reducedMotion])

  return (
    <div ref={hostRef} className="celestial-bg" aria-hidden="true">
      <div className="celestial-bg__vignette" />
      <div className="celestial-bg__beams" />
      <div className="celestial-bg__glow" />
      <canvas ref={canvasRef} className="celestial-bg__mesh" />
      <div className="celestial-bg__grid" />
    </div>
  )
}
