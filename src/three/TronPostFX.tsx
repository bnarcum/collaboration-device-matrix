import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { resolveTronShowroom } from '../theme/tronShowroom'

/** Neon bloom for emissive grid, rings, and selection glow. */
export function TronPostFX() {
  if (!resolveTronShowroom()) return null
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        luminanceThreshold={0.38}
        luminanceSmoothing={0.78}
        intensity={0.58}
        mipmapBlur
      />
    </EffectComposer>
  )
}
