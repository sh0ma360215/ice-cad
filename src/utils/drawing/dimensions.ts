/**
 * 図面描画用の寸法線関数
 */

import { LINE_STYLES, FONTS, DIMENSION, COLORS } from '../../constants/drawing'

/**
 * 水平寸法線を描画する
 */
export function drawDimensionH(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  label: string
) {
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = LINE_STYLES.dimension
  ctx.fillStyle = COLORS.text
  ctx.font = FONTS.dimension

  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + length, y)
  ctx.stroke()

  drawArrowH(ctx, x, y, 'left')
  drawArrowH(ctx, x + length, y, 'right')

  const textW = ctx.measureText(label).width
  ctx.fillText(label, x + length / 2 - textW / 2, y - 2)
}

/**
 * 垂直寸法線を描画する
 */
export function drawDimensionV(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  label: string
) {
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = LINE_STYLES.dimension
  ctx.fillStyle = COLORS.text
  ctx.font = FONTS.dimension

  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x, y + length)
  ctx.stroke()

  drawArrowV(ctx, x, y, 'up')
  drawArrowV(ctx, x, y + length, 'down')

  ctx.save()
  ctx.translate(x - 4, y + length / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText(label, -ctx.measureText(label).width / 2, 0)
  ctx.restore()
}

/**
 * 水平矢印を描画する
 */
export function drawArrowH(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: 'left' | 'right'
) {
  const size = DIMENSION.arrowSize
  ctx.beginPath()
  if (dir === 'left') {
    ctx.moveTo(x, y)
    ctx.lineTo(x + size, y - size / 2)
    ctx.lineTo(x + size, y + size / 2)
  } else {
    ctx.moveTo(x, y)
    ctx.lineTo(x - size, y - size / 2)
    ctx.lineTo(x - size, y + size / 2)
  }
  ctx.closePath()
  ctx.fill()
}

/**
 * 垂直矢印を描画する
 */
export function drawArrowV(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: 'up' | 'down'
) {
  const size = DIMENSION.arrowSize
  ctx.beginPath()
  if (dir === 'up') {
    ctx.moveTo(x, y)
    ctx.lineTo(x - size / 2, y + size)
    ctx.lineTo(x + size / 2, y + size)
  } else {
    ctx.moveTo(x, y)
    ctx.lineTo(x - size / 2, y - size)
    ctx.lineTo(x + size / 2, y - size)
  }
  ctx.closePath()
  ctx.fill()
}
