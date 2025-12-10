import * as THREE from 'three'
import opentype from 'opentype.js'
import { Clipper, Path64, Paths64, FillRule, JoinType, EndType } from 'clipper2-js'

let cachedFont: opentype.Font | null = null
let fontLoadPromise: Promise<opentype.Font> | null = null

// Noto Sans JP Bold (ローカルファイル)
const FONT_URL = '/fonts/NotoSansJP-Bold.otf'

// Clipperは整数座標を使用するためスケール係数
const CLIPPER_SCALE = 1000

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
          5
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
          5
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

// 時計回りかどうかを判定
function isClockwise(points: THREE.Vector2[]): boolean {
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i]
    const p2 = points[(i + 1) % points.length]
    sum += (p2.x - p1.x) * (p2.y + p1.y)
  }
  return sum > 0
}

// 三次ベジェ曲線を直線で近似
function approximateCubicBezier(
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
function approximateQuadraticBezier(
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
function getCenter(points: THREE.Vector2[]): THREE.Vector2 {
  let x = 0, y = 0
  for (const p of points) {
    x += p.x
    y += p.y
  }
  return new THREE.Vector2(x / points.length, y / points.length)
}

// 点がポリゴン内にあるか判定
function isPointInPolygon(point: THREE.Vector2, polygon: THREE.Vector2[]): boolean {
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
    const points = shape.getPoints(20)
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
      const holePoints = hole.getPoints(20)
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

  console.log('Clipper paths analysis:', pathsWithArea.map(p => ({
    points: p.path.length,
    signedArea: p.signedArea / (CLIPPER_SCALE * CLIPPER_SCALE),
    isOuter: p.isOuter
  })))

  // 外側パスを面積で降順ソート
  const outerPaths = pathsWithArea.filter(p => p.isOuter).sort((a, b) => b.absArea - a.absArea)
  const innerPaths = pathsWithArea.filter(p => !p.isOuter)

  console.log(`Outer paths: ${outerPaths.length}, Inner paths: ${innerPaths.length}`)

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

// 文字を埋めた形状を生成（単一文字用）
export function createFilledTextShapes(
  font: opentype.Font,
  text: string,
  fontSize: number,
  offsetDistance: number = 3,  // 膨張距離（mm）
  minHoleArea: number = 100    // 小さな穴を除去する閾値
): THREE.Shape[] {
  // 1. 文字のパスを取得
  const textShapes = textToShapes(font, text, fontSize)
  if (textShapes.length === 0) return []

  // 2. ClipperのPaths64形式に変換
  const clipperPaths = shapesToClipperPaths(textShapes)
  if (clipperPaths.length === 0) return textShapes

  try {
    // 3. パスをオフセット（膨張）- スケーリング済みなのでoffsetDistanceもスケール
    const scaledOffset = Math.round(offsetDistance * CLIPPER_SCALE)
    const inflatedPaths = Clipper.InflatePaths(
      clipperPaths,
      scaledOffset,
      JoinType.Round,
      EndType.Polygon
    )

    // 4. 全パスを統合（Union）
    const unitedPaths = Clipper.Union(
      inflatedPaths,
      undefined,
      FillRule.NonZero
    )

    // 5. 小さな穴を除去（スケーリング済みの面積閾値）
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

      // 外側パス、または十分大きな穴のみ保持
      if (area >= scaledMinArea || area > scaledMinArea * 0.1) {
        filteredPaths.push(path)
      }
    }

    // 6. THREE.Shapeに戻す
    return clipperPathsToShapes(filteredPaths.length > 0 ? filteredPaths : unitedPaths)
  } catch (err) {
    console.error('Clipper processing failed:', err)
    return textShapes  // エラー時は元のシェイプを返す
  }
}

// 複数文字をまとめて埋めた形状を生成（文字間も統合）
export function createFilledMultiCharShapes(
  font: opentype.Font,
  chars: string[],
  fontSize: number,
  charPositions: { x: number; y: number }[],  // 各文字の位置
  offsetDistance: number = 3,
  minHoleArea: number = 100
): THREE.Shape[] {
  if (chars.length === 0) return []

  // 全文字のパスを収集（Paths64形式）
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
    // パスをオフセット（膨張）- スケーリング済み
    const scaledOffset = Math.round(offsetDistance * CLIPPER_SCALE)
    const inflatedPaths = Clipper.InflatePaths(
      allPaths,
      scaledOffset,
      JoinType.Round,
      EndType.Polygon
    )

    // 全パスを統合（Union）- 文字間も統合される
    const unitedPaths = Clipper.Union(
      inflatedPaths,
      undefined,
      FillRule.NonZero
    )

    // 小さな穴を除去（スケーリング済みの面積閾値）
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
    console.error('Clipper multi-char processing failed:', err)
    return []
  }
}
