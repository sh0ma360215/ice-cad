import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import {
  isClockwise,
  approximateCubicBezier,
  approximateQuadraticBezier,
  getCenter,
  isPointInPolygon,
} from './textToShape'

describe('isClockwise', () => {
  it('時計回りの正方形を正しく判定する', () => {
    // 時計回り: 右上 → 右下 → 左下 → 左上
    const clockwiseSquare = [
      new THREE.Vector2(1, 1),   // 右上
      new THREE.Vector2(1, -1),  // 右下
      new THREE.Vector2(-1, -1), // 左下
      new THREE.Vector2(-1, 1),  // 左上
    ]
    expect(isClockwise(clockwiseSquare)).toBe(true)
  })

  it('反時計回りの正方形を正しく判定する', () => {
    // 反時計回り: 右上 → 左上 → 左下 → 右下
    const counterClockwiseSquare = [
      new THREE.Vector2(1, 1),   // 右上
      new THREE.Vector2(-1, 1),  // 左上
      new THREE.Vector2(-1, -1), // 左下
      new THREE.Vector2(1, -1),  // 右下
    ]
    expect(isClockwise(counterClockwiseSquare)).toBe(false)
  })

  it('時計回りの三角形を正しく判定する', () => {
    const clockwiseTriangle = [
      new THREE.Vector2(0, 2),
      new THREE.Vector2(2, -1),
      new THREE.Vector2(-2, -1),
    ]
    expect(isClockwise(clockwiseTriangle)).toBe(true)
  })

  it('反時計回りの三角形を正しく判定する', () => {
    const counterClockwiseTriangle = [
      new THREE.Vector2(0, 2),
      new THREE.Vector2(-2, -1),
      new THREE.Vector2(2, -1),
    ]
    expect(isClockwise(counterClockwiseTriangle)).toBe(false)
  })
})

describe('approximateCubicBezier', () => {
  it('始点から終点までの点列を生成する', () => {
    const points = approximateCubicBezier(
      0, 0,   // 始点
      1, 2,   // 制御点1
      3, 2,   // 制御点2
      4, 0,   // 終点
      4       // 4セグメント
    )

    expect(points).toHaveLength(4)
    // 最後の点は終点に近い
    expect(points[3].x).toBeCloseTo(4, 5)
    expect(points[3].y).toBeCloseTo(0, 5)
  })

  it('直線のベジェ曲線は直線状の点を生成する', () => {
    // 制御点が直線上にある場合
    const points = approximateCubicBezier(
      0, 0,
      1, 1,
      2, 2,
      3, 3,
      3
    )

    expect(points).toHaveLength(3)
    // 全ての点がy=xの直線上にある
    points.forEach(p => {
      expect(p.x).toBeCloseTo(p.y, 5)
    })
  })

  it('セグメント数を変更できる', () => {
    const points5 = approximateCubicBezier(0, 0, 1, 1, 2, 2, 3, 3, 5)
    const points10 = approximateCubicBezier(0, 0, 1, 1, 2, 2, 3, 3, 10)

    expect(points5).toHaveLength(5)
    expect(points10).toHaveLength(10)
  })
})

describe('approximateQuadraticBezier', () => {
  it('始点から終点までの点列を生成する', () => {
    const points = approximateQuadraticBezier(
      0, 0,   // 始点
      2, 4,   // 制御点
      4, 0,   // 終点
      4       // 4セグメント
    )

    expect(points).toHaveLength(4)
    // 最後の点は終点に近い
    expect(points[3].x).toBeCloseTo(4, 5)
    expect(points[3].y).toBeCloseTo(0, 5)
  })

  it('中間点で最大高さになる放物線を生成する', () => {
    const points = approximateQuadraticBezier(
      0, 0,
      2, 4,  // 制御点が上にある
      4, 0,
      4
    )

    // 中間点（t=0.5）でy座標が最大になる
    // t=0.5のとき: y = 0.25*0 + 0.5*4 + 0.25*0 = 2
    expect(points[1].y).toBeGreaterThan(0)
    expect(points[1].y).toBeLessThan(4)
  })
})

describe('getCenter', () => {
  it('正方形の中心を正しく計算する', () => {
    const square = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(4, 0),
      new THREE.Vector2(4, 4),
      new THREE.Vector2(0, 4),
    ]

    const center = getCenter(square)
    expect(center.x).toBe(2)
    expect(center.y).toBe(2)
  })

  it('三角形の重心を正しく計算する', () => {
    const triangle = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(3, 0),
      new THREE.Vector2(0, 3),
    ]

    const center = getCenter(triangle)
    expect(center.x).toBe(1)
    expect(center.y).toBe(1)
  })

  it('負の座標を含むポリゴンでも正しく計算する', () => {
    const polygon = [
      new THREE.Vector2(-2, -2),
      new THREE.Vector2(2, -2),
      new THREE.Vector2(2, 2),
      new THREE.Vector2(-2, 2),
    ]

    const center = getCenter(polygon)
    expect(center.x).toBe(0)
    expect(center.y).toBe(0)
  })
})

describe('isPointInPolygon', () => {
  const square = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(4, 0),
    new THREE.Vector2(4, 4),
    new THREE.Vector2(0, 4),
  ]

  it('ポリゴン内部の点をtrueと判定する', () => {
    const insidePoint = new THREE.Vector2(2, 2)
    expect(isPointInPolygon(insidePoint, square)).toBe(true)
  })

  it('ポリゴン外部の点をfalseと判定する', () => {
    const outsidePoint = new THREE.Vector2(5, 5)
    expect(isPointInPolygon(outsidePoint, square)).toBe(false)
  })

  it('ポリゴンの左外側の点をfalseと判定する', () => {
    const leftPoint = new THREE.Vector2(-1, 2)
    expect(isPointInPolygon(leftPoint, square)).toBe(false)
  })

  it('複雑な形状でも正しく判定する', () => {
    // L字型のポリゴン
    const lShape = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(2, 0),
      new THREE.Vector2(2, 1),
      new THREE.Vector2(1, 1),
      new THREE.Vector2(1, 2),
      new THREE.Vector2(0, 2),
    ]

    // L字の内部
    expect(isPointInPolygon(new THREE.Vector2(0.5, 0.5), lShape)).toBe(true)
    expect(isPointInPolygon(new THREE.Vector2(0.5, 1.5), lShape)).toBe(true)

    // L字の切り欠き部分（外部）
    expect(isPointInPolygon(new THREE.Vector2(1.5, 1.5), lShape)).toBe(false)
  })
})
