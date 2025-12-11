import * as THREE from 'three'
import opentype from 'opentype.js'
import { Clipper, Path64, Paths64, FillRule, JoinType, EndType } from 'clipper2-js'
import {
  FONT_URL,
  CLIPPER_SCALE,
  BEZIER_SEGMENTS,
  FILL_TEXT_DEFAULTS,
  SHAPE_POINTS_DIVISIONS,
} from '../constants/geometry'

let cachedFont: opentype.Font | null = null
let fontLoadPromise: Promise<opentype.Font> | null = null

export async function loadFont(): Promise<opentype.Font> {
  if (cachedFont) return cachedFont

  if (fontLoadPromise) return fontLoadPromise

  fontLoadPromise = new Promise((resolve, reject) => {
    opentype.load(FONT_URL, (err, font) => {
      if (err || !font) {
        console.error('Font load error:', err)
        reject(err)
      } else {
        cachedFont = font
        resolve(font)
      }
    })
  })

  return fontLoadPromise
}

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

// ===============================
// 文字埋め処理（Clipper2を使用）
// ===============================

// THREE.Shape配列をClipperのPaths64形式に変換
function shapesToClipperPaths(shapes: THREE.Shape[], offsetX: number = 0, offsetY: number = 0): Paths64 {
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
function clipperPathsToShapes(paths: Paths64): THREE.Shape[] {
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
function isPointInPath64(point: { x: number; y: number }, polygon: Path64): boolean {
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
    const scaledOutlineWidth = Math.round(outlineWidth * CLIPPER_SCALE)
    const outlinedPaths = Clipper.InflatePaths(
      unitedPaths,
      scaledOutlineWidth,
      JoinType.Round,
      EndType.Polygon
    )

    if (outlinedPaths.length === 0) return textShapes

    // 5. 小さな穴を除去（スケーリング済みの面積閾値）
    const scaledMinArea = minHoleArea * CLIPPER_SCALE * CLIPPER_SCALE
    const filteredPaths = new Paths64()

    for (const path of outlinedPaths) {
      let area = 0
      for (let i = 0; i < path.length; i++) {
        const p1 = path[i]
        const p2 = path[(i + 1) % path.length]
        area += p1.x * p2.y - p2.x * p1.y
      }
      area = Math.abs(area / 2)

      // 外側パス、または十分大きな穴のみ保持
      if (area >= scaledMinArea || area > scaledMinArea * 0.1) {
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
    const scaledOutlineWidth = Math.round(outlineWidth * CLIPPER_SCALE)
    const outlinedPaths = Clipper.InflatePaths(
      unitedPaths,
      scaledOutlineWidth,
      JoinType.Round,
      EndType.Polygon
    )

    if (outlinedPaths.length === 0) return []

    // 4. 小さな穴を除去（スケーリング済みの面積閾値）
    const scaledMinArea = minHoleArea * CLIPPER_SCALE * CLIPPER_SCALE
    const filteredPaths = new Paths64()

    for (const path of outlinedPaths) {
      let area = 0
      for (let i = 0; i < path.length; i++) {
        const p1 = path[i]
        const p2 = path[(i + 1) % path.length]
        area += p1.x * p2.y - p2.x * p1.y
      }
      area = Math.abs(area / 2)

      if (area >= scaledMinArea || area > scaledMinArea * 0.1) {
        filteredPaths.push(path)
      }
    }

    return clipperPathsToShapes(filteredPaths.length > 0 ? filteredPaths : outlinedPaths)
  } catch (err) {
    console.error('Clipper multi-char outline processing failed:', err)
    return []
  }
}

// ===============================
// 自動オフセット計算（文字間距離ベース）
// ===============================

// THREE.Shape配列を点の配列に変換（距離計算用）
function shapesToPoints(shapes: THREE.Shape[]): THREE.Vector2[][] {
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
function minDistanceBetweenPaths(
  pathsA: THREE.Vector2[][],
  pathsB: THREE.Vector2[][]
): number {
  let minDist = Infinity
  
  for (const pathA of pathsA) {
    for (const pointA of pathA) {
      for (const pathB of pathsB) {
        for (const pointB of pathB) {
          const dist = pointA.distanceTo(pointB)
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
  
  console.log(`文字間距離から計算したオフセット: ${optimalOffset.toFixed(2)}mm`)
  
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
      let area = 0
      for (let i = 0; i < path.length; i++) {
        const p1 = path[i]
        const p2 = path[(i + 1) % path.length]
        area += p1.x * p2.y - p2.x * p1.y
      }
      area = Math.abs(area / 2)
      
      if (area >= scaledMinArea || area > scaledMinArea * 0.1) {
        filteredPaths.push(path)
      }
    }
    
    return clipperPathsToShapes(filteredPaths.length > 0 ? filteredPaths : unitedPaths)
  } catch (err) {
    console.error('Clipper auto-offset processing failed:', err)
    return []
  }
}
