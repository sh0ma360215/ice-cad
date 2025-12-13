import * as THREE from 'three'
import opentype from 'opentype.js'
import { Clipper, Path64, Paths64, FillRule, JoinType, EndType } from 'clipper2-js'
import { CLIPPER_SCALE, FILL_TEXT_DEFAULTS } from '../../constants/geometry'
import { textToShapes, calculateOptimalOffset } from '../geometry'
import { shapesToClipperPaths, clipperPathsToShapes } from './converter'

// 穴の面積許容比率（最小面積の10%までは保持）
const HOLE_AREA_TOLERANCE_RATIO = 0.1

// Path64の面積を計算（Shoelace formula）
function calculatePathArea(path: Path64): number {
  let area = 0
  for (let i = 0; i < path.length; i++) {
    const p1 = path[i]
    const p2 = path[(i + 1) % path.length]
    area += p1.x * p2.y - p2.x * p1.y
  }
  return Math.abs(area / 2)
}

// 文字を縁取りした形状を生成（単一文字用）
// 縁取り = 文字の輪郭を外側に一定距離だけ拡張した形状
export function createFilledTextShapes(
  font: opentype.Font,
  text: string,
  fontSize: number,
  offsetDistance: number = FILL_TEXT_DEFAULTS.offsetDistance,
  minHoleArea: number = FILL_TEXT_DEFAULTS.minHoleArea
): THREE.Shape[] {
  // 1. 文字のパスを取得
  const textShapes = textToShapes(font, text, fontSize)
  if (textShapes.length === 0) return []

  // 2. ClipperのPaths64形式に変換
  const clipperPaths = shapesToClipperPaths(textShapes)
  if (clipperPaths.length === 0) return textShapes

  try {
    // 3. まず全パスを統合（Union）
    const unitedPaths = Clipper.Union(
      clipperPaths,
      undefined,
      FillRule.NonZero
    )

    if (unitedPaths.length === 0) return textShapes

    // 4. 統合したパスを外側に縁取り（オフセット/膨張）
    const scaledOffsetDistance = Math.round(offsetDistance * CLIPPER_SCALE)
    const outlinedPaths = Clipper.InflatePaths(
      unitedPaths,
      scaledOffsetDistance,
      JoinType.Round,
      EndType.Polygon
    )

    if (outlinedPaths.length === 0) return textShapes

    // 5. 小さな穴を除去（スケーリング済みの面積閾値）
    const scaledMinArea = minHoleArea * CLIPPER_SCALE * CLIPPER_SCALE
    const filteredPaths = new Paths64()

    for (const path of outlinedPaths) {
      const area = calculatePathArea(path)

      // 外側パス、または十分大きな穴のみ保持
      if (area >= scaledMinArea || area > scaledMinArea * HOLE_AREA_TOLERANCE_RATIO) {
        filteredPaths.push(path)
      }
    }

    // 6. THREE.Shapeに戻す
    return clipperPathsToShapes(filteredPaths.length > 0 ? filteredPaths : outlinedPaths)
  } catch (err) {
    console.error('Clipper outline processing failed:', err)
    return textShapes  // エラー時は元のシェイプを返す
  }
}

// 複数文字をまとめて縁取りした形状を生成（文字間も統合）
// 縁取り = 文字の輪郭を外側に一定距離だけ拡張した形状
export function createFilledMultiCharShapes(
  font: opentype.Font,
  chars: string[],
  fontSize: number,
  charPositions: { x: number; y: number }[],
  offsetDistance: number = FILL_TEXT_DEFAULTS.offsetDistance,
  minHoleArea: number = FILL_TEXT_DEFAULTS.minHoleArea
): THREE.Shape[] {
  if (chars.length === 0) return []

  // 1. 全文字のパスを収集（Paths64形式、位置情報込み）
  const allPaths = new Paths64()

  chars.forEach((char, index) => {
    const shapes = textToShapes(font, char, fontSize)
    const pos = charPositions[index]

    // 位置オフセット込みでPaths64に変換
    const charPaths = shapesToClipperPaths(shapes, pos.x, pos.y)
    for (const path of charPaths) {
      allPaths.push(path)
    }
  })

  if (allPaths.length === 0) return []

  try {
    // 2. まず全パスを統合（Union）- 文字間も統合される
    const unitedPaths = Clipper.Union(
      allPaths,
      undefined,
      FillRule.NonZero
    )

    if (unitedPaths.length === 0) return []

    // 3. 統合したパスを外側に縁取り（オフセット/膨張）
    // 縁取りの幅をスケーリング
    const scaledOffsetDistance = Math.round(offsetDistance * CLIPPER_SCALE)
    const outlinedPaths = Clipper.InflatePaths(
      unitedPaths,
      scaledOffsetDistance,
      JoinType.Round,
      EndType.Polygon
    )

    if (outlinedPaths.length === 0) return []

    // 4. 小さな穴を除去（スケーリング済みの面積閾値）
    const scaledMinArea = minHoleArea * CLIPPER_SCALE * CLIPPER_SCALE
    const filteredPaths = new Paths64()

    for (const path of outlinedPaths) {
      const area = calculatePathArea(path)

      if (area >= scaledMinArea || area > scaledMinArea * HOLE_AREA_TOLERANCE_RATIO) {
        filteredPaths.push(path)
      }
    }

    return clipperPathsToShapes(filteredPaths.length > 0 ? filteredPaths : outlinedPaths)
  } catch (err) {
    console.error('Clipper multi-char outline processing failed:', err)
    return []
  }
}

// 自動オフセット計算版の複数文字埋め処理
export function createFilledMultiCharShapesAuto(
  font: opentype.Font,
  chars: string[],
  fontSize: number,
  charPositions: { x: number; y: number }[],  // 各文字の位置
  margin: number = 0.5,                      // 接触後の追加マージン（mm）
  minOffset: number = 0,                     // オフセットの下限
  maxOffset: number = 5,                     // オフセットの上限
  minHoleArea: number = 100                  // 小さな穴を除去する閾値
): THREE.Shape[] {
  if (chars.length === 0) return []

  // 1. 各文字を個別にShape化（位置情報なし）
  const charShapes: THREE.Shape[][] = chars.map(char =>
    textToShapes(font, char, fontSize)
  )

  // 2. 位置情報を適用したShape配列を作成（距離計算用）
  const positionedShapes: THREE.Shape[][] = []
  charShapes.forEach((shapes, index) => {
    const pos = charPositions[index]
    const positioned: THREE.Shape[] = []

    shapes.forEach(shape => {
      const movedShape = new THREE.Shape()
      const points = shape.getPoints(20)
      if (points.length > 0) {
        movedShape.moveTo(points[0].x + pos.x, points[0].y + pos.y)
        for (let i = 1; i < points.length; i++) {
          movedShape.lineTo(points[i].x + pos.x, points[i].y + pos.y)
        }
        movedShape.closePath()

        // 穴も移動
        for (const hole of shape.holes) {
          const movedHole = new THREE.Path()
          const holePoints = hole.getPoints(20)
          if (holePoints.length > 0) {
            movedHole.moveTo(holePoints[0].x + pos.x, holePoints[0].y + pos.y)
            for (let i = 1; i < holePoints.length; i++) {
              movedHole.lineTo(holePoints[i].x + pos.x, holePoints[i].y + pos.y)
            }
            movedHole.closePath()
            movedShape.holes.push(movedHole)
          }
        }
      }
      positioned.push(movedShape)
    })

    positionedShapes.push(positioned)
  })

  // 3. 最適なオフセット量を計算
  const optimalOffset = calculateOptimalOffset(positionedShapes, margin, minOffset, maxOffset)

  // 4. 全文字のパスを収集（Paths64形式、位置情報込み）
  const allPaths = new Paths64()

  chars.forEach((char, index) => {
    const shapes = textToShapes(font, char, fontSize)
    const pos = charPositions[index]

    // 位置オフセット込みでPaths64に変換
    const charPaths = shapesToClipperPaths(shapes, pos.x, pos.y)
    for (const path of charPaths) {
      allPaths.push(path)
    }
  })

  if (allPaths.length === 0) return []

  try {
    // 5. 計算したオフセットで膨張
    const scaledOffset = Math.round(optimalOffset * CLIPPER_SCALE)
    const inflatedPaths = Clipper.InflatePaths(
      allPaths,
      scaledOffset,
      JoinType.Round,
      EndType.Polygon
    )

    // 6. 全パスを統合（Union）- 文字間も統合される
    const unitedPaths = Clipper.Union(
      inflatedPaths,
      undefined,
      FillRule.NonZero
    )

    // 7. 小さな穴を除去（スケーリング済みの面積閾値）
    const scaledMinArea = minHoleArea * CLIPPER_SCALE * CLIPPER_SCALE
    const filteredPaths = new Paths64()

    for (const path of unitedPaths) {
      const area = calculatePathArea(path)

      if (area >= scaledMinArea || area > scaledMinArea * HOLE_AREA_TOLERANCE_RATIO) {
        filteredPaths.push(path)
      }
    }

    return clipperPathsToShapes(filteredPaths.length > 0 ? filteredPaths : unitedPaths)
  } catch (err) {
    console.error('Clipper auto-offset processing failed:', err)
    return []
  }
}
