import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { resolveTronShowroom } from '../theme/tronShowroom'

/** Neon bloom for emissive grid, rings, and selection glow. */
export function TronPostFX() {
  if (!resolveTronShowroom()) return null
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        luminanceThreshold={0.52}
        luminanceSmoothing={0.82}
        intensity={0.48}
        mipmapBlur
      />
    </EffectComposer>
  )
}
