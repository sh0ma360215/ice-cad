import * as THREE from 'three'
import opentype from 'opentype.js'
import { BEZIER_SEGMENTS } from '../../constants/geometry'
import { approximateCubicBezier, approximateQuadraticBezier } from './bezier'
import { isClockwise, getCenter, isPointInPolygon } from './polygon'

// テキストからThree.jsのShapeを生成（改良版）
export function textToShapes(
  font: opentype.Font,
  text: string,
  fontSize: number
): THREE.Shape[] {
  // opentype.jsでパスを取得
  const path = font.getPath(text, 0, 0, fontSize)

  // パスをサブパス（各輪郭）に分割
  const subPaths: { points: THREE.Vector2[]; clockwise: boolean }[] = []
  let currentPoints: THREE.Vector2[] = []

  for (const cmd of path.commands) {
    switch (cmd.type) {
      case 'M':
        // 新しいサブパスの開始
        if (currentPoints.length > 2) {
          const clockwise = isClockwise(currentPoints)
          subPaths.push({ points: [...currentPoints], clockwise })
        }
        currentPoints = [new THREE.Vector2(cmd.x, -cmd.y)]
        break

      case 'L':
        currentPoints.push(new THREE.Vector2(cmd.x, -cmd.y))
        break

      case 'C':
        // ベジェ曲線を直線で近似
        const lastPoint = currentPoints[currentPoints.length - 1]
        const bezierPoints = approximateCubicBezier(
          lastPoint.x, lastPoint.y,
          cmd.x1, -cmd.y1,
          cmd.x2, -cmd.y2,
          cmd.x, -cmd.y,
          BEZIER_SEGMENTS
        )
        currentPoints.push(...bezierPoints)
        break

      case 'Q':
        // 二次ベジェ曲線を直線で近似
        const last = currentPoints[currentPoints.length - 1]
        const qPoints = approximateQuadraticBezier(
          last.x, last.y,
          cmd.x1, -cmd.y1,
          cmd.x, -cmd.y,
          BEZIER_SEGMENTS
        )
        currentPoints.push(...qPoints)
        break

      case 'Z':
        if (currentPoints.length > 2) {
          const clockwise = isClockwise(currentPoints)
          subPaths.push({ points: [...currentPoints], clockwise })
        }
        currentPoints = []
        break
    }
  }

  // 最後のサブパスを追加
  if (currentPoints.length > 2) {
    const clockwise = isClockwise(currentPoints)
    subPaths.push({ points: [...currentPoints], clockwise })
  }

  // 外側の輪郭（反時計回り）と穴（時計回り）を分類
  const outerPaths = subPaths.filter(p => !p.clockwise)
  const holePaths = subPaths.filter(p => p.clockwise)

  // 各外側輪郭に対してShapeを作成
  const shapes: THREE.Shape[] = []

  for (const outer of outerPaths) {
    const shape = new THREE.Shape()

    // 外側輪郭を描画
    shape.moveTo(outer.points[0].x, outer.points[0].y)
    for (let i = 1; i < outer.points.length; i++) {
      shape.lineTo(outer.points[i].x, outer.points[i].y)
    }
    shape.closePath()

    // この外側輪郭に含まれる穴を追加
    for (const hole of holePaths) {
      const holeCenter = getCenter(hole.points)
      if (isPointInPolygon(holeCenter, outer.points)) {
        const holePath = new THREE.Path()
        holePath.moveTo(hole.points[0].x, hole.points[0].y)
        for (let i = 1; i < hole.points.length; i++) {
          holePath.lineTo(hole.points[i].x, hole.points[i].y)
        }
        holePath.closePath()
        shape.holes.push(holePath)
      }
    }

    shapes.push(shape)
  }

  return shapes
}

// テキストのバウンディングボックスを取得
export function getTextBounds(
  font: opentype.Font,
  text: string,
  fontSize: number
): { width: number; height: number; xMin: number; yMin: number; xMax: number; yMax: number } {
  const path = font.getPath(text, 0, 0, fontSize)
  const bbox = path.getBoundingBox()

  return {
    width: bbox.x2 - bbox.x1,
    height: bbox.y2 - bbox.y1,
    xMin: bbox.x1,
    yMin: -bbox.y2, // Y軸反転
    xMax: bbox.x2,
    yMax: -bbox.y1  // Y軸反転
  }
}

// THREE.Shape配列を点の配列に変換（距離計算用）
export function shapesToPoints(shapes: THREE.Shape[]): THREE.Vector2[][] {
  const paths: THREE.Vector2[][] = []

  for (const shape of shapes) {
    // 外側輪郭の点を取得
    const outerPoints = shape.getPoints(20) // サンプリング数20
    if (outerPoints.length > 0) {
      paths.push(outerPoints.map(p => new THREE.Vector2(p.x, p.y)))
    }

    // 穴の点も取得
    for (const hole of shape.holes) {
      const holePoints = hole.getPoints(20)
      if (holePoints.length > 0) {
        paths.push(holePoints.map(p => new THREE.Vector2(p.x, p.y)))
      }
    }
  }

  return paths
}

// 2つのパス配列間の最小距離を計算
export function minDistanceBetweenPaths(
  pathsA: THREE.Vector2[][],
  pathsB: THREE.Vector2[][]
): number {
  const EPSILON = 0.01  // 0.01mm以下なら即座に返す（早期脱出）
  let minDist = Infinity

  for (const pathA of pathsA) {
    for (const pointA of pathA) {
      for (const pathB of pathsB) {
        for (const pointB of pathB) {
          const dist = pointA.distanceTo(pointB)
          if (dist < EPSILON) return dist  // 早期脱出
          if (dist < minDist) {
            minDist = dist
          }
        }
      }
    }
  }

  return minDist
}

// 文字間の最小距離から最適なオフセット量を計算
export function calculateOptimalOffset(
  charShapes: THREE.Shape[][],  // [文字1のshapes, 文字2のshapes, ...]
  margin: number = 0.5,          // 接触後の追加マージン（mm）
  minOffset: number = 0,         // オフセットの下限
  maxOffset: number = 5         // オフセットの上限
): number {
  if (charShapes.length < 2) {
    return 0  // 1文字なら膨張不要
  }

  // 各文字ペア間の最小距離を取得
  let minGap = Infinity

  for (let i = 0; i < charShapes.length - 1; i++) {
    const pathsA = shapesToPoints(charShapes[i])
    const pathsB = shapesToPoints(charShapes[i + 1])

    if (pathsA.length === 0 || pathsB.length === 0) continue

    const gap = minDistanceBetweenPaths(pathsA, pathsB)
    if (gap < minGap) {
      minGap = gap
    }
  }

  // 距離が取得できなかった場合はデフォルト値を返す
  if (minGap === Infinity || minGap <= 0) {
    return Math.max(minOffset, Math.min(3, maxOffset)) // デフォルト3mm
  }

  // オフセット量 = 隙間の半分 + マージン
  // 両方の文字が膨張するので、半分ずつ
  const optimalOffset = (minGap / 2) + margin

  // 安全弁：計算結果をmin/maxでクリップ
  const safeOffset = Math.min(
    Math.max(optimalOffset, minOffset),
    maxOffset
  )

  return safeOffset
}
