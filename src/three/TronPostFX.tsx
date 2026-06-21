import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { resolveTronShowroom } from '../theme/tronShowroom'

/** Neon bloom for emissive grid, rings, and selection glow. */
export function TronPostFX() {
  if (!resolveTronShowroom()) return null
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        luminanceThreshold={0.12}
        luminanceSmoothing={0.85}
        intensity={1.35}
        mipmapBlur
      />
    </EffectComposer>
  )
}
