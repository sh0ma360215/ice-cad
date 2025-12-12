import * as THREE from 'three'

// 時計回りかどうかを判定（Shoelace formula）
export function isClockwise(points: THREE.Vector2[]): boolean {
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i]
    const p2 = points[(i + 1) % points.length]
    sum += (p2.x - p1.x) * (p2.y + p1.y)
  }
  return sum > 0
}

// 点群の中心を取得
export function getCenter(points: THREE.Vector2[]): THREE.Vector2 {
  let x = 0, y = 0
  for (const p of points) {
    x += p.x
    y += p.y
  }
  return new THREE.Vector2(x / points.length, y / points.length)
}

// 点がポリゴン内にあるか判定（Ray casting algorithm）
export function isPointInPolygon(point: THREE.Vector2, polygon: THREE.Vector2[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y
    const xj = polygon[j].x, yj = polygon[j].y

    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  return inside
}
