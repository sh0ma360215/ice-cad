/**
 * 図面描画用のビュー（意匠図・底面図）関数
 */

import { VariableParams, FIXED_PARAMS } from '../../constants'
import { LINE_STYLES, COLORS, CENTER_LINE_DASH_SHORT } from '../../constants/drawing'
import { drawDimensionH, drawDimensionV } from './dimensions'
import { drawTextOutlineInView } from './text'
import { roundedRect } from './primitives'
import opentype from 'opentype.js'

const F = FIXED_PARAMS

/**
 * 意匠面図を描画する（精密版）
 */
export function drawDesignView(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  params: VariableParams,
  font: opentype.Font | null
) {
  const w = F.outerWidth * scale // 76.91
  const h = F.outerLength * scale // 113.91
  const r = F.innerR * scale // 6.00

  // キャビティエリア（上面図と同じサイズで文字を描画）
  const cavW = F.cavityWidth * scale // 57.90
  const cavH = F.cavityLength * scale // 97.30
  const cavX = x + (w - cavW) / 2
  const cavY = y + (h - cavH) / 2

  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = LINE_STYLES.outline

  // 外形
  roundedRect(ctx, x, y, w, h, r)
  ctx.stroke()

  // 中心線（一点鎖線）
  ctx.setLineDash(CENTER_LINE_DASH_SHORT)
  ctx.lineWidth = LINE_STYLES.centerLine
  ctx.beginPath()
  ctx.moveTo(x + w / 2, y - 20)
  ctx.lineTo(x + w / 2, y + h + 20)
  ctx.moveTo(x - 20, y + h / 2)
  ctx.lineTo(x + w + 20, y + h / 2)
  ctx.stroke()
  ctx.setLineDash([])

  // 意匠（文字）- キャビティエリア基準で描画（上面図と同じサイズ）
  if (font && params.text) {
    drawTextOutlineInView(ctx, font, params, cavX, cavY, cavW, cavH, scale, false)
  }

  // 寸法
  drawDimensionH(ctx, x, y - 25, w, '76.91')
  drawDimensionV(ctx, x + w + 25, y, h, '113.91')
}

/**
 * 底面図を描画する（台形断面図 - ハッチング付き、図面通り）
 */
export function drawBottomView(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  // 寸法（図面から正確に）
  const topW = F.innerWidth * scale // 70.00（上面 = 狭い方）
  const bottomW = F.outerWidth * scale // 76.91（底面 = 広い方）
  const heightLeft = F.stickSlotHeight * scale // 12.00（左側高さ）
  const heightRight = F.totalHeight * scale // 24.60（右側高さ）

  // 台形の4点を計算（中央揃え）
  const topOffset = (bottomW - topW) / 2

  // 上面（狭い方 - 70.00）
  const t1x = x + topOffset // 左上X
  const t1y = y // 左上Y
  const t2x = x + topOffset + topW // 右上X
  const t2y = y // 右上Y

  // 底面（広い方 - 76.91）- 左右で高さが異なる
  const b1x = x // 左下X
  const b1y = y + heightLeft // 左下Y（12.00）
  const b2x = x + bottomW // 右下X
  const b2y = y + heightRight // 右下Y（24.60）

  // スティック切り欠き
  const slotW = F.stickSlotWidth * scale // 14.00
  const slotH = (8 * scale) / 2.5 // 切り欠きの深さ
  const slotCenterX = x + bottomW / 2
  // 左右の底面高さの中間点を計算
  const slotLeftY = b1y + ((b2y - b1y) * (slotCenterX - slotW / 2 - x)) / bottomW
  const slotRightY = b1y + ((b2y - b1y) * (slotCenterX + slotW / 2 - x)) / bottomW

  ctx.save()

  // --- 外形パスを作成（ハッチング用） ---
  ctx.beginPath()
  ctx.moveTo(t1x, t1y)
  ctx.lineTo(t2x, t2y)
  ctx.lineTo(b2x, b2y)
  // 右側からスティック切り欠きへ
  ctx.lineTo(slotCenterX + slotW / 2, slotRightY)
  ctx.lineTo(slotCenterX + slotW / 2, slotRightY + slotH)
  ctx.lineTo(slotCenterX - slotW / 2, slotLeftY + slotH)
  ctx.lineTo(slotCenterX - slotW / 2, slotLeftY)
  ctx.lineTo(b1x, b1y)
  ctx.closePath()

  // --- ハッチング（斜線）---
  ctx.save()
  ctx.clip()

  ctx.beginPath()
  ctx.lineWidth = LINE_STYLES.hatching
  ctx.strokeStyle = COLORS.line
  const hatchSize = Math.max(bottomW, heightRight) * 2
  for (let i = -hatchSize; i < hatchSize; i += LINE_STYLES.hatchingSpacing) {
    ctx.moveTo(x - 50 + i, y - 20)
    ctx.lineTo(x + i + 80, y + heightRight + 50)
  }
  ctx.stroke()
  ctx.restore()

  // --- 外形線を描画（太線） ---
  ctx.lineWidth = LINE_STYLES.outline
  ctx.strokeStyle = COLORS.line

  // 上面線（70.00）
  ctx.beginPath()
  ctx.moveTo(t1x, t1y)
  ctx.lineTo(t2x, t2y)
  ctx.stroke()

  // 左斜線
  ctx.beginPath()
  ctx.moveTo(t1x, t1y)
  ctx.lineTo(b1x, b1y)
  ctx.stroke()

  // 右斜線
  ctx.beginPath()
  ctx.moveTo(t2x, t2y)
  ctx.lineTo(b2x, b2y)
  ctx.stroke()

  // 底面線（スティック切り欠き含む）- 左側
  ctx.beginPath()
  ctx.moveTo(b1x, b1y)
  ctx.lineTo(slotCenterX - slotW / 2, slotLeftY)
  ctx.stroke()

  // 底面線 - 右側
  ctx.beginPath()
  ctx.moveTo(slotCenterX + slotW / 2, slotRightY)
  ctx.lineTo(b2x, b2y)
  ctx.stroke()

  // スティック切り欠き部分（コの字型）
  ctx.beginPath()
  ctx.moveTo(slotCenterX - slotW / 2, slotLeftY)
  ctx.lineTo(slotCenterX - slotW / 2, slotLeftY + slotH)
  ctx.lineTo(slotCenterX + slotW / 2, slotRightY + slotH)
  ctx.lineTo(slotCenterX + slotW / 2, slotRightY)
  ctx.stroke()

  // スティック内部の縦線（2本）
  ctx.lineWidth = LINE_STYLES.stickInner
  ctx.beginPath()
  ctx.moveTo(slotCenterX - slotW / 2 + 4, slotLeftY + 2)
  ctx.lineTo(slotCenterX - slotW / 2 + 4, slotLeftY + slotH - 2)
  ctx.moveTo(slotCenterX + slotW / 2 - 4, slotRightY + 2)
  ctx.lineTo(slotCenterX + slotW / 2 - 4, slotRightY + slotH - 2)
  ctx.stroke()

  // --- 寸法線 ---
  // 上部: 70.00
  drawDimensionH(ctx, t1x, t1y - 25, topW, '70.00')

  // 下部: 76.91
  drawDimensionH(ctx, x, Math.max(b1y, b2y) + slotH + 25, bottomW, '76.91')

  // 左側: 12.00
  drawDimensionV(ctx, x - 30, t1y, heightLeft, '12.00')

  // 右側: 24.60
  drawDimensionV(ctx, b2x + 25, t2y, heightRight, '24.60')

  ctx.restore()
}
