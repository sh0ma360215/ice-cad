import * as THREE from 'three'
import { Path64, Paths64 } from 'clipper2-js'
import { CLIPPER_SCALE, SHAPE_POINTS_DIVISIONS } from '../../constants/geometry'

// THREE.Shape配列をClipperのPaths64形式に変換
export function shapesToClipperPaths(shapes: THREE.Shape[], offsetX: number = 0, offsetY: number = 0): Paths64 {
  const paths = new Paths64()

  for (const shape of shapes) {
    // 外側輪郭
    const outerPath = new Path64()
    const points = shape.getPoints(SHAPE_POINTS_DIVISIONS)
    for (const p of points) {
      outerPath.push({
        x: Math.round((p.x + offsetX) * CLIPPER_SCALE),
        y: Math.round((p.y + offsetY) * CLIPPER_SCALE)
      })
    }
    if (outerPath.length > 2) {
      paths.push(outerPath)
    }

    // 穴
    for (const hole of shape.holes) {
      const holePath = new Path64()
      const holePoints = hole.getPoints(SHAPE_POINTS_DIVISIONS)
      for (const p of holePoints) {
        holePath.push({
          x: Math.round((p.x + offsetX) * CLIPPER_SCALE),
          y: Math.round((p.y + offsetY) * CLIPPER_SCALE)
        })
      }
      if (holePath.length > 2) {
        paths.push(holePath)
      }
    }
  }

  return paths
}

// ClipperのPaths64形式をTHREE.Shape配列に変換
export function clipperPathsToShapes(paths: Paths64): THREE.Shape[] {
  if (!paths || paths.length === 0) return []

  // パスを外側/内側に分類
  const pathsWithArea: { path: Path64; signedArea: number; absArea: number; isOuter: boolean }[] = []

  for (const path of paths) {
    if (path.length < 3) continue

    // 符号付き面積を計算（Shoelace formula）
    let signedArea = 0
    for (let i = 0; i < path.length; i++) {
      const p1 = path[i]
      const p2 = path[(i + 1) % path.length]
      signedArea += (p1.x * p2.y - p2.x * p1.y)
    }
    signedArea /= 2

    // Clipper2では正の面積が外側（反時計回り）
    pathsWithArea.push({
      path,
      signedArea,
      absArea: Math.abs(signedArea),
      isOuter: signedArea > 0  // 正の面積が外側輪郭
    })
  }

  // 外側パスを面積で降順ソート
  const outerPaths = pathsWithArea.filter(p => p.isOuter).sort((a, b) => b.absArea - a.absArea)
  const innerPaths = pathsWithArea.filter(p => !p.isOuter)

  const shapes: THREE.Shape[] = []

  for (const outer of outerPaths) {
    const shape = new THREE.Shape()

    // 外側輪郭（スケールを戻す）
    shape.moveTo(outer.path[0].x / CLIPPER_SCALE, outer.path[0].y / CLIPPER_SCALE)
    for (let i = 1; i < outer.path.length; i++) {
      shape.lineTo(outer.path[i].x / CLIPPER_SCALE, outer.path[i].y / CLIPPER_SCALE)
    }
    shape.closePath()

    // この外側に含まれる穴を探す
    for (const inner of innerPaths) {
      if (inner.path.length === 0) continue  // 空配列をスキップ
      if (isPointInPath64(inner.path[0], outer.path)) {
        const holePath = new THREE.Path()
        holePath.moveTo(inner.path[0].x / CLIPPER_SCALE, inner.path[0].y / CLIPPER_SCALE)
        for (let i = 1; i < inner.path.length; i++) {
          holePath.lineTo(inner.path[i].x / CLIPPER_SCALE, inner.path[i].y / CLIPPER_SCALE)
        }
        holePath.closePath()
        shape.holes.push(holePath)
      }
    }

    shapes.push(shape)
  }

  return shapes
}

// 点がパス内にあるか判定（整数座標用）
export function isPointInPath64(point: { x: number; y: number }, polygon: Path64): boolean {
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
