/**
 * Page backdrop. Default theme is Magnetic blue-dark (flat page + soft blue and
 * magenta glows); the Tron easter egg keeps its grid + scanlines.
 */
export function CelestialBackground({ tron = false }: { tron?: boolean }) {
  return (
    <div
      className={tron ? 'celestial-bg celestial-bg--tron' : 'celestial-bg'}
      aria-hidden="true"
    >
      {tron ? (
        <>
          <div className="celestial-bg__grid" />
          <div className="celestial-bg__scanlines" aria-hidden="true" />
        </>
      ) : (
        <>
          <div className="celestial-bg__vignette" />
          <div className="celestial-bg__glow" />
        </>
      )}
    </div>
  )
}
