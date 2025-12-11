/**
 * 図面描画用の文字描画関数
 */

import opentype from 'opentype.js'
import { VariableParams } from '../../constants'
import { LINE_STYLES, COLORS } from '../../constants/drawing'
import { TEXT_SIZE } from '../../constants/geometry'

/**
 * ハッチング（斜線）付きで文字を描画する
 */
export function drawTextWithHatching(
  ctx: CanvasRenderingContext2D,
  font: opentype.Font,
  params: VariableParams,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  viewScale: number,
  mirror: boolean = false
) {
  const { text, offsetX, offsetY, scale: textScale, rotation } = params

  const chars = text.split('')
  const charCount = chars.length
  const baseFontSize = Math.min(boxW * TEXT_SIZE.maxRatio, boxH * TEXT_SIZE.maxRatio / charCount)
  const fontSize = baseFontSize * (textScale / 100)
  const spacing = fontSize * TEXT_SIZE.spacingFactor
  const totalHeight = (charCount - 1) * spacing

  const centerX = boxX + boxW / 2 + offsetX * viewScale
  const centerY = boxY + boxH / 2 + offsetY * viewScale

  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.rotate((rotation * Math.PI) / 180)

  if (mirror) {
    ctx.scale(-1, 1)
  }

  chars.forEach((char, index) => {
    const path = font.getPath(char, 0, 0, fontSize)
    const bbox = path.getBoundingBox()
    const charW = bbox.x2 - bbox.x1
    const charH = bbox.y2 - bbox.y1

    const charX = -charW / 2 - bbox.x1
    const charY = -totalHeight / 2 + index * spacing + charH / 2

    ctx.save()
    ctx.translate(charX, charY)

    // パスを作成
    ctx.beginPath()
    for (const cmd of path.commands) {
      switch (cmd.type) {
        case 'M':
          ctx.moveTo(cmd.x, cmd.y)
          break
        case 'L':
          ctx.lineTo(cmd.x, cmd.y)
          break
        case 'C':
          ctx.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y)
          break
        case 'Q':
          ctx.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y)
          break
        case 'Z':
          ctx.closePath()
          break
      }
    }

    // ハッチング（斜線で塗りつぶし）
    ctx.save()
    ctx.clip()
    ctx.beginPath()
    ctx.lineWidth = LINE_STYLES.hatching
    ctx.strokeStyle = COLORS.line
    const hatchSize = Math.max(charW, charH) * 2
    for (let i = -hatchSize; i < hatchSize; i += LINE_STYLES.textHatchingSpacing) {
      ctx.moveTo(bbox.x1 - 20 + i, bbox.y1 - 20)
      ctx.lineTo(bbox.x1 + i + hatchSize, bbox.y1 + hatchSize)
    }
    ctx.stroke()
    ctx.restore()

    // 輪郭線
    ctx.beginPath()
    for (const cmd of path.commands) {
      switch (cmd.type) {
        case 'M':
          ctx.moveTo(cmd.x, cmd.y)
          break
        case 'L':
          ctx.lineTo(cmd.x, cmd.y)
          break
        case 'C':
          ctx.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y)
          break
        case 'Q':
          ctx.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y)
          break
        case 'Z':
          ctx.closePath()
          break
      }
    }
    ctx.strokeStyle = COLORS.line
    ctx.lineWidth = LINE_STYLES.textOutline
    ctx.stroke()

    ctx.restore()
  })

  ctx.restore()
}

/**
 * 文字輪郭をビューに描画する
 */
export function drawTextOutlineInView(
  ctx: CanvasRenderingContext2D,
  font: opentype.Font,
  params: VariableParams,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  _scale: number,
  mirror: boolean = false // 左右反転（鏡面）
) {
  const { text, offsetX, offsetY, scale: textScale, rotation } = params

  const chars = text.split('')
  const charCount = chars.length
  // 文字サイズ（キャビティエリアに収まるように）
  const baseFontSize = Math.min(boxW * TEXT_SIZE.maxRatio, boxH * TEXT_SIZE.maxRatio / charCount)
  const fontSize = baseFontSize * (textScale / 100)
  const spacing = fontSize * TEXT_SIZE.spacingFactor
  const totalHeight = (charCount - 1) * spacing

  const centerX = boxX + boxW / 2 + offsetX * 3
  const centerY = boxY + boxH / 2 + offsetY * 3

  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.rotate((rotation * Math.PI) / 180)

  // 鏡面の場合は左右反転
  if (mirror) {
    ctx.scale(-1, 1)
  }

  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = LINE_STYLES.textOutline

  chars.forEach((char, index) => {
    const path = font.getPath(char, 0, 0, fontSize)
    const bbox = path.getBoundingBox()
    const charW = bbox.x2 - bbox.x1
    const charH = bbox.y2 - bbox.y1

    const charX = -charW / 2 - bbox.x1
    const charY = -totalHeight / 2 + index * spacing + charH / 2

    ctx.save()
    ctx.translate(charX, charY)

    ctx.beginPath()
    for (const cmd of path.commands) {
      switch (cmd.type) {
        case 'M':
          ctx.moveTo(cmd.x, cmd.y)
          break
        case 'L':
          ctx.lineTo(cmd.x, cmd.y)
          break
        case 'C':
          ctx.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y)
          break
        case 'Q':
          ctx.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y)
          break
        case 'Z':
          ctx.closePath()
          break
      }
    }
    ctx.stroke()

    ctx.restore()
  })

  ctx.restore()
}
