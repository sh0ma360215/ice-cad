import * as THREE from 'three'
import opentype from 'opentype.js'

let cachedFont: opentype.Font | null = null
let fontLoadPromise: Promise<opentype.Font> | null = null

// Noto Sans JP Bold (ローカルファイル)
const FONT_URL = '/fonts/NotoSansJP-Bold.otf'

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
