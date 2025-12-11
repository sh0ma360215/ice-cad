/**
 * 図面描画用の断面図関数
 */

import { VariableParams, FIXED_PARAMS } from '../../constants'
import { LINE_STYLES, COLORS, FONTS, CENTER_LINE_DASH_SHORT } from '../../constants/drawing'
import { drawDimensionH, drawDimensionV } from './dimensions'
import { drawTextWithHatching } from './text'
import { roundedRect } from './primitives'
import opentype from 'opentype.js'

const F = FIXED_PARAMS

/**
 * 側面断面図を描画する
 */
export function drawSideSection(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  // 寸法（図面から）
  const width = F.totalHeight * scale // 24.60（横幅 = 深さ方向）
  const outerH = F.outerLength * scale // 113.91（外形高さ）
  const innerH = F.innerLength * scale // 107.00（内形高さ）

  // 高さ方向のオフセット（中心揃え）
  const innerOffset = (outerH - innerH) / 2

  ctx.save()

  // --- 外形（長方形）---
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + width, y)
  ctx.lineTo(x + width, y + outerH)
  ctx.lineTo(x, y + outerH)
  ctx.closePath()

  // ハッチング
  ctx.save()
  ctx.clip()
  ctx.beginPath()
  ctx.lineWidth = LINE_STYLES.hatching
  ctx.strokeStyle = COLORS.line
  const hatchSize = Math.max(width, outerH) * 2
  for (let i = -hatchSize; i < hatchSize; i += LINE_STYLES.hatchingSpacing) {
    ctx.moveTo(x - 50 + i, y - 20)
    ctx.lineTo(x + i + 80, y + outerH + 50)
  }
  ctx.stroke()
  ctx.restore()

  // --- 外形線（太線）---
  ctx.lineWidth = LINE_STYLES.outline
  ctx.strokeStyle = COLORS.line
  ctx.strokeRect(x, y, width, outerH)

  // 内側線（107.00の範囲 - 上下のフランジ境界）
  ctx.lineWidth = LINE_STYLES.inner
  ctx.beginPath()
  // 上部フランジ境界線
  ctx.moveTo(x, y + innerOffset)
  ctx.lineTo(x + width, y + innerOffset)
  // 下部フランジ境界線
  ctx.moveTo(x, y + innerOffset + innerH)
  ctx.lineTo(x + width, y + innerOffset + innerH)
  ctx.stroke()

  // 中心線（横方向 - 一点鎖線）
  ctx.setLineDash(CENTER_LINE_DASH_SHORT)
  ctx.lineWidth = LINE_STYLES.centerLine
  ctx.beginPath()
  ctx.moveTo(x - 15, y + outerH / 2)
  ctx.lineTo(x + width + 15, y + outerH / 2)
  ctx.stroke()
  ctx.setLineDash([])

  // 勾配指示
  ctx.font = FONTS.dimension
  ctx.fillStyle = COLORS.text
  ctx.fillText(`勾配${F.draftAngleSide}°`, x - 40, y + 30)
  ctx.fillText(`勾配${F.draftAngleStick}°`, x + width + 5, y + outerH / 2 + 20)

  // R表示
  ctx.font = FONTS.annotation
  ctx.fillText(`R${F.outerR}`, x + width + 5, y + 15)
  ctx.fillText(`R${F.innerR}`, x + width + 5, y + innerOffset + 10)

  ctx.restore()
}

/**
 * 正面断面図を描画する（台形断面 - ハッチング付き、上面図と同じ幅）
 */
export function drawFrontSection(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  // 寸法（図面から正確に - 横幅は上面図と同じ76.91）
  const topW = F.outerWidth * scale // 76.91（上面 = 広い方）
  const bottomW = F.innerWidth * scale // 70.00（底面 = 狭い方）
  const height = F.totalHeight * scale // 24.60（高さ = 深さ方向）

  // 台形の4点を計算（中央揃え）
  const bottomOffset = (topW - bottomW) / 2

  // 上面（広い方 - 76.91）
  const t1x = x // 左上X
  const t1y = y // 左上Y
  const t2x = x + topW // 右上X
  const t2y = y // 右上Y

  // 底面（狭い方 - 70.00）
  const b1x = x + bottomOffset // 左下X
  const b1y = y + height // 左下Y
  const b2x = x + bottomOffset + bottomW // 右下X
  const b2y = y + height // 右下Y

  // スティック切り欠き
  const slotW = F.stickSlotWidth * scale // 14.00
  const slotH = (8 * scale) / 2.5 // 切り欠きの深さ
  const slotCenterX = x + topW / 2

  ctx.save()

  // --- 外形パスを作成（ハッチング用） ---
  ctx.beginPath()
  ctx.moveTo(t1x, t1y)
  ctx.lineTo(t2x, t2y)
  ctx.lineTo(b2x, b2y)
  // 右側からスティック切り欠きへ
  ctx.lineTo(slotCenterX + slotW / 2, b2y)
  ctx.lineTo(slotCenterX + slotW / 2, b2y + slotH)
  ctx.lineTo(slotCenterX - slotW / 2, b1y + slotH)
  ctx.lineTo(slotCenterX - slotW / 2, b1y)
  ctx.lineTo(b1x, b1y)
  ctx.closePath()

  // --- ハッチング（斜線）---
  ctx.save()
  ctx.clip()

  ctx.beginPath()
  ctx.lineWidth = LINE_STYLES.hatching
  ctx.strokeStyle = COLORS.line
  const hatchSize = Math.max(topW, height) * 2
  for (let i = -hatchSize; i < hatchSize; i += LINE_STYLES.hatchingSpacing) {
    ctx.moveTo(x - 50 + i, y - 20)
    ctx.lineTo(x + i + 80, y + height + 50)
  }
  ctx.stroke()
  ctx.restore()

  // --- 外形線を描画（太線） ---
  ctx.lineWidth = LINE_STYLES.outline
  ctx.strokeStyle = COLORS.line

  // 上面線（76.91）
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
  ctx.lineTo(slotCenterX - slotW / 2, b1y)
  ctx.stroke()

  // 底面線 - 右側
  ctx.beginPath()
  ctx.moveTo(slotCenterX + slotW / 2, b2y)
  ctx.lineTo(b2x, b2y)
  ctx.stroke()

  // スティック切り欠き部分（コの字型）
  ctx.beginPath()
  ctx.moveTo(slotCenterX - slotW / 2, b1y)
  ctx.lineTo(slotCenterX - slotW / 2, b1y + slotH)
  ctx.lineTo(slotCenterX + slotW / 2, b2y + slotH)
  ctx.lineTo(slotCenterX + slotW / 2, b2y)
  ctx.stroke()

  // スティック内部の縦線（2本）
  ctx.lineWidth = LINE_STYLES.stickInner
  ctx.beginPath()
  ctx.moveTo(slotCenterX - slotW / 2 + 4, b1y + 2)
  ctx.lineTo(slotCenterX - slotW / 2 + 4, b1y + slotH - 2)
  ctx.moveTo(slotCenterX + slotW / 2 - 4, b2y + 2)
  ctx.lineTo(slotCenterX + slotW / 2 - 4, b2y + slotH - 2)
  ctx.stroke()

  // 中心線（縦方向 - 一点鎖線）
  ctx.setLineDash(CENTER_LINE_DASH_SHORT)
  ctx.lineWidth = LINE_STYLES.centerLine
  ctx.beginPath()
  ctx.moveTo(x + topW / 2, y - 15)
  ctx.lineTo(x + topW / 2, y + height + slotH + 15)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.restore()
}

/**
 * 深さ方向断面図を描画する（上面図と意匠図の間 - 縦長ハッチング付き）
 */
export function drawDepthSection(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  // 寸法（図面から）
  const width = F.totalHeight * scale // 24.60（横幅 = 深さ方向）
  const outerH = F.outerLength * scale // 113.91（外形高さ）
  const innerH = F.innerLength * scale // 107.00（内形高さ）

  // 高さ方向のオフセット（中心揃え）
  const innerOffset = (outerH - innerH) / 2

  // 半高
  const halfInner = innerH / 2

  ctx.save()

  // --- 外形（長方形）---
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + width, y)
  ctx.lineTo(x + width, y + outerH)
  ctx.lineTo(x, y + outerH)
  ctx.closePath()

  // ハッチング
  ctx.save()
  ctx.clip()
  ctx.beginPath()
  ctx.lineWidth = LINE_STYLES.hatching
  ctx.strokeStyle = COLORS.line
  const hatchSize = Math.max(width, outerH) * 2
  for (let i = -hatchSize; i < hatchSize; i += LINE_STYLES.hatchingSpacing) {
    ctx.moveTo(x - 50 + i, y - 20)
    ctx.lineTo(x + i + 80, y + outerH + 50)
  }
  ctx.stroke()
  ctx.restore()

  // --- 外形線（太線）---
  ctx.lineWidth = LINE_STYLES.outline
  ctx.strokeStyle = COLORS.line
  ctx.strokeRect(x, y, width, outerH)

  // 内側線（107.00の範囲 - 上下のフランジ境界）
  ctx.lineWidth = LINE_STYLES.inner
  ctx.beginPath()
  // 上部フランジ境界線
  ctx.moveTo(x, y + innerOffset)
  ctx.lineTo(x + width, y + innerOffset)
  // 下部フランジ境界線
  ctx.moveTo(x, y + innerOffset + innerH)
  ctx.lineTo(x + width, y + innerOffset + innerH)
  ctx.stroke()

  // 中心線（横方向 - 一点鎖線）
  ctx.setLineDash(CENTER_LINE_DASH_SHORT)
  ctx.lineWidth = LINE_STYLES.centerLine
  ctx.beginPath()
  ctx.moveTo(x - 15, y + outerH / 2)
  ctx.lineTo(x + width + 15, y + outerH / 2)
  ctx.stroke()
  ctx.setLineDash([])

  // --- 寸法線 ---
  // 上部: 深さ寸法
  drawDimensionH(ctx, x, y - 20, F.depthInner * scale, `${F.depthInner}(容器内深さ)`)
  drawDimensionH(ctx, x, y - 40, F.depthStep * scale, '21.50')
  drawDimensionH(ctx, x, y - 60, F.depthText * scale, `${F.depthText}(文字部分深さ)`)

  // 左側: 内形高さ（107.00）
  drawDimensionV(ctx, x - 25, y + innerOffset, innerH, '107.00')

  // 右側: 外形高さ（113.91）
  drawDimensionV(ctx, x + width + 20, y, outerH, '113.91')

  // 右側: 半高寸法（53.50 + 53.50）
  drawDimensionV(ctx, x + width + 55, y + innerOffset, halfInner, '53.50')
  drawDimensionV(ctx, x + width + 55, y + innerOffset + halfInner, halfInner, '53.50')

  // 下部: 詳細寸法
  ctx.font = FONTS.annotation
  ctx.fillStyle = COLORS.text
  ctx.fillText('1.72', x - 5, y + outerH + 15)
  ctx.fillText('3.40', x + width + 5, y + outerH + 15)
  ctx.fillText('12.00', x + 5, y + outerH + 30)
  ctx.fillText('24.60', x + width / 2 - 10, y + outerH + 30)

  ctx.restore()
}

/**
 * 上面図を描画する（精密版 - 図面に厳密に準拠）
 */
export function drawTopView(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  params: VariableParams,
  font: opentype.Font | null
) {
  // 寸法をスケール変換
  const outW = F.outerWidth * scale // 76.91
  const outH = F.outerLength * scale // 113.91
  const inW = F.innerWidth * scale // 70.00
  const inH = F.innerLength * scale // 107.00
  const cavW = F.cavityWidth * scale // 57.90
  const cavH = F.cavityLength * scale // 97.30

  const outR = F.outerR * scale // 9.46
  const inR = F.innerR * scale // 6.00
  const slotW = F.stickSlotWidth * scale // 14.00

  // 中心座標
  const cx = x + outW / 2
  const cy = y + outH / 2

  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = LINE_STYLES.outline

  // 1. 最外形（フランジ） - R9.46
  roundedRect(ctx, x, y, outW, outH, outR)
  ctx.stroke()

  // 2. 開口部（内側） - R6.00、位置は中心合わせ
  const inX = cx - inW / 2
  const inY = cy - inH / 2
  roundedRect(ctx, inX, inY, inW, inH, inR)
  ctx.stroke()

  // 3. キャビティ底面（文字エリア） - 57.90 x 97.30
  const cavX = cx - cavW / 2
  const cavY = cy - cavH / 2
  ctx.setLineDash([4, 2])
  ctx.lineWidth = LINE_STYLES.inner
  roundedRect(ctx, cavX, cavY, cavW, cavH, inR * 0.6)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.lineWidth = LINE_STYLES.outline

  // 4. スティック切り欠き（下部） - 幅14.00 (7.00 + 7.00)
  const slotDepth = (20 * scale) / 3 // 切り欠きの深さ

  // 切り欠き部分を白で塗りつぶして線を消す
  ctx.fillStyle = COLORS.background
  ctx.fillRect(cx - slotW / 2 - 1, y + outH - slotDepth, slotW + 2, slotDepth + 5)

  // 切り欠きの線を描画
  ctx.strokeStyle = COLORS.line
  ctx.beginPath()
  ctx.moveTo(cx - slotW / 2, y + outH)
  ctx.lineTo(cx - slotW / 2, y + outH - slotDepth)
  ctx.lineTo(cx + slotW / 2, y + outH - slotDepth)
  ctx.lineTo(cx + slotW / 2, y + outH)
  ctx.stroke()

  // 5. 文字描画（ハッチング付き、底面エリア内に配置、鏡文字）
  if (font && params.text) {
    drawTextWithHatching(ctx, font, params, cavX, cavY, cavW, cavH, scale, true)
  }

  // 6. 中心線（一点鎖線）
  ctx.setLineDash([15, 3, 3, 3])
  ctx.lineWidth = LINE_STYLES.centerLine
  ctx.beginPath()
  ctx.moveTo(cx, y - 25)
  ctx.lineTo(cx, y + outH + 25)
  ctx.moveTo(x - 25, cy)
  ctx.lineTo(x + outW + 25, cy)
  ctx.stroke()
  ctx.setLineDash([])

  // --- 左側の寸法・表示 ---
  // 勾配表示
  ctx.font = FONTS.annotation
  ctx.fillStyle = COLORS.text
  ctx.fillText(`勾配${F.draftAngleStick}°`, x - 45, y + 50)

  // 左側の縦寸法（97.30）
  drawDimensionV(ctx, x - 30, cavY, cavH, '97.30')

  // --- 上部寸法 ---
  ctx.lineWidth = 0.5
  drawDimensionH(ctx, x, y - 20, outW, '76.91')
  drawDimensionH(ctx, inX, y - 40, inW, '70.00')

  // 半幅寸法（35.00 + 35.00）
  const halfIn = inW / 2
  drawDimensionH(ctx, inX, y - 60, halfIn, '35.00')
  drawDimensionH(ctx, inX + halfIn, y - 60, halfIn, '35.00')

  // キャビティ幅
  drawDimensionH(ctx, cavX, y - 80, cavW, '57.90')

  // --- 右側の縦寸法 ---
  drawDimensionV(ctx, x + outW + 20, y, outH, '113.91')
  drawDimensionV(ctx, x + outW + 45, inY, inH, '107.00')

  // 半高寸法（53.50 + 53.50）
  const halfInH = inH / 2
  drawDimensionV(ctx, x + outW + 70, inY, halfInH, '53.50')
  drawDimensionV(ctx, x + outW + 70, inY + halfInH, halfInH, '53.50')

  // --- 下部寸法（スティック部） ---
  drawDimensionH(ctx, cx - slotW / 2, y + outH + 15, F.stickSlotHalf * scale, '7.00')
  drawDimensionH(ctx, cx, y + outH + 15, F.stickSlotHalf * scale, '7.00')
  drawDimensionH(ctx, cx - slotW / 2, y + outH + 35, slotW, '14.00')

  // R表示
  ctx.font = FONTS.annotation
  ctx.fillStyle = COLORS.text
  ctx.fillText(`R${F.outerR}`, x + 5, y + 15)
  ctx.fillText(`R${F.innerR}`, inX + 5, inY + 15)
}
