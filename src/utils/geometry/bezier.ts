import * as THREE from 'three'

// 三次ベジェ曲線を直線で近似
export function approximateCubicBezier(
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
  segments: number
): THREE.Vector2[] {
  const points: THREE.Vector2[] = []
  for (let i = 1; i <= segments; i++) {
    const t = i / segments
    const mt = 1 - t
    const x = mt * mt * mt * x0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3
    const y = mt * mt * mt * y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3
    points.push(new THREE.Vector2(x, y))
  }
  return points
}

// 二次ベジェ曲線を直線で近似
export function approximateQuadraticBezier(
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  segments: number
): THREE.Vector2[] {
  const points: THREE.Vector2[] = []
  for (let i = 1; i <= segments; i++) {
    const t = i / segments
    const mt = 1 - t
    const x = mt * mt * x0 + 2 * mt * t * x1 + t * t * x2
    const y = mt * mt * y0 + 2 * mt * t * y1 + t * t * y2
    points.push(new THREE.Vector2(x, y))
  }
  return points
}
