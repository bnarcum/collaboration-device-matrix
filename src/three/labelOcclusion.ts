import * as THREE from 'three'

/** Device hit boxes that can hide labels standing behind them. */
const occluders = new Set<THREE.Object3D>()

export function registerOccluder(obj: THREE.Object3D): () => void {
  occluders.add(obj)
  return () => {
    occluders.delete(obj)
  }
}

const raycaster = new THREE.Raycaster()
const origin = new THREE.Vector3()
const dir = new THREE.Vector3()
const candidates: THREE.Object3D[] = []

/** True when any other device's hit box sits between the camera and `point`. */
export function isPointOccluded(
  point: THREE.Vector3,
  camera: THREE.Camera,
  self: THREE.Object3D | null,
): boolean {
  origin.setFromMatrixPosition(camera.matrixWorld)
  dir.subVectors(point, origin)
  const dist = dir.length()
  if (dist < 1e-4) return false
  dir.divideScalar(dist)
  raycaster.set(origin, dir)
  raycaster.near = 0
  raycaster.far = dist - 0.02

  candidates.length = 0
  for (const o of occluders) if (o !== self) candidates.push(o)
  return raycaster.intersectObjects(candidates, false).length > 0
}
