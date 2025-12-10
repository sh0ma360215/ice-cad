import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { VariableParams, FIXED_PARAMS } from '../constants'
import { loadFont } from '../utils/textToShape'
import opentype from 'opentype.js'

interface Drawing2DProps {
  params: VariableParams
}

export interface Drawing2DHandle {
  exportPNG: () => void
}

const F = FIXED_PARAMS

const Drawing2D = forwardRef<Drawing2DHandle, Drawing2DProps>(({ params }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [font, setFont] = useState<opentype.Font | null>(null)

  // 外部からPNG出力を呼び出せるようにする
  useImperativeHandle(ref, () => ({
    exportPNG: () => {
      const canvas = canvasRef.current
      if (!canvas) return

      const link = document.createElement('a')
      link.download = `${params.text}_図面.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
  }))

  useEffect(() => {
    loadFont().then(setFont).catch(console.error)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // A3横サイズ風のキャンバス（参考図面に合わせて）
    canvas.width = 1400
    canvas.height = 900

    // 背景（白）
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 図面枠
    drawBorder(ctx, canvas.width, canvas.height)

    // スケール設定
    const mainScale = 3.5  // メインビュー用
    const smallScale = 2.5 // 小さいビュー用

    // === 参考図面に合わせたレイアウト ===

    // 1. 側面断面図（左上、小さめ）
    drawSideSection(ctx, 55, 70, smallScale)

    // 2. 上面図（中央左、文字入り）- メイン
    const topViewX = 180
    const topViewY = 100
    drawTopView(ctx, topViewX, topViewY, mainScale, params, font)

    // 3. 正面断面図（上面図の右上）
    const frontViewX = topViewX + (F.topWidth + F.flangeWidth * 2) * mainScale + 40
    const frontViewY = 55
    drawFrontSection(ctx, frontViewX, frontViewY, mainScale)

    // 4. 意匠面図（右側、文字入り）
    const designViewX = frontViewX + F.totalDepth * mainScale + 50
    const designViewY = 100
    drawDesignView(ctx, designViewX, designViewY, mainScale, params, font)

    // 5. 底面図（左下）
    const bottomViewX = 80
    const bottomViewY = topViewY + (F.topDepth + F.flangeWidth * 2) * mainScale + 60
    drawBottomView(ctx, bottomViewX, bottomViewY, mainScale)

    // 6. タイトルブロック（右下）
    drawTitleBlock(ctx, canvas.width - 350, canvas.height - 150, params.text)

    // 材料厚表示（中央下）
    ctx.font = '14px Arial'
    ctx.fillStyle = '#000000'
    ctx.fillText('材料厚：0.1mm', 520, canvas.height - 100)

  }, [params, font])

  return (
    <div className="w-full h-full overflow-auto bg-gray-200 flex items-center justify-center p-4">
      <canvas
        ref={canvasRef}
        className="border border-gray-400 shadow-lg"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    </div>
  )
})

export default Drawing2D

// 図面枠
function drawBorder(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 2
  ctx.strokeRect(10, 10, w - 20, h - 20)

  // グリッド参照（A-F, 1-8）
  ctx.lineWidth = 0.5
  ctx.font = '11px Arial'
  ctx.fillStyle = '#000000'

  const cols = 8
  const rows = 6
  const colWidth = (w - 40) / cols
  const rowHeight = (h - 40) / rows

  for (let i = 0; i < cols; i++) {
    const x = 20 + colWidth * i + colWidth / 2
    ctx.fillText(String(cols - i), x - 4, 24)
    ctx.fillText(String(cols - i), x - 4, h - 14)
    if (i > 0) {
      ctx.beginPath()
      ctx.moveTo(20 + colWidth * i, 10)
      ctx.lineTo(20 + colWidth * i, 28)
      ctx.moveTo(20 + colWidth * i, h - 28)
      ctx.lineTo(20 + colWidth * i, h - 10)
      ctx.stroke()
    }
  }

  const rowLabels = ['F', 'E', 'D', 'C', 'B', 'A']
  for (let i = 0; i < rows; i++) {
    const y = 20 + rowHeight * i + rowHeight / 2
    ctx.fillText(rowLabels[i], 14, y + 4)
    ctx.fillText(rowLabels[i], w - 20, y + 4)
    if (i > 0) {
      ctx.beginPath()
      ctx.moveTo(10, 20 + rowHeight * i)
      ctx.lineTo(28, 20 + rowHeight * i)
      ctx.moveTo(w - 28, 20 + rowHeight * i)
      ctx.lineTo(w - 10, 20 + rowHeight * i)
      ctx.stroke()
    }
  }
}

// 側面断面図（参考図面の左上）
function drawSideSection(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  scale: number
) {
  const depth = F.totalDepth * scale
  const height = F.topDepth * scale
  const taper = F.outerTaper * Math.PI / 180
  const innerTaper = F.innerTaper * Math.PI / 180
  const taperOffset = depth * Math.tan(taper)
  const innerTaperOffset = depth * Math.tan(innerTaper)

  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 1.2

  // 外形（台形 - 横向き断面）
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + depth, y)
  ctx.lineTo(x + depth - taperOffset, y + height)
  ctx.lineTo(x + taperOffset, y + height)
  ctx.closePath()
  ctx.stroke()

  // 内側線（内勾配）
  ctx.lineWidth = 0.5
  const t = 3
  ctx.beginPath()
  ctx.moveTo(x + t, y + t)
  ctx.lineTo(x + depth - t, y + t)
  ctx.lineTo(x + depth - taperOffset - t, y + height - t)
  ctx.lineTo(x + taperOffset + t, y + height - t)
  ctx.closePath()
  ctx.stroke()

  // 中心線
  ctx.setLineDash([6, 3])
  ctx.beginPath()
  ctx.moveTo(x + depth / 2, y - 15)
  ctx.lineTo(x + depth / 2, y + height + 15)
  ctx.stroke()
  ctx.setLineDash([])

  // 勾配表示
  ctx.font = '9px Arial'
  ctx.fillStyle = '#000000'
  ctx.fillText(`勾配${F.outerTaper}°`, x - 35, y + 30)
  ctx.fillText(`勾配${F.innerTaper}°`, x + depth + 5, y + height - 30)

  // 寸法
  drawDimensionV(ctx, x - 25, y, height, `${F.topDepth}`)

  // ビュー名
  ctx.font = '10px Arial'
  ctx.fillText('側面断面図', x + depth / 2 - 25, y - 25)
}

// 上面図（参考図面の中央左）
function drawTopView(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  scale: number,
  params: VariableParams,
  font: opentype.Font | null
) {
  const w = F.topWidth * scale
  const h = F.topDepth * scale
  const flange = F.flangeWidth * scale
  const r = F.cornerR * scale

  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 1.2

  // 外形（フランジ含む）
  roundedRect(ctx, x - flange, y - flange, w + flange * 2, h + flange * 2, r + flange * 0.3)
  ctx.stroke()

  // 内形（容器開口部）
  roundedRect(ctx, x, y, w, h, r)
  ctx.stroke()

  // 中心線
  ctx.setLineDash([8, 4])
  ctx.lineWidth = 0.4
  ctx.beginPath()
  ctx.moveTo(x + w / 2, y - flange - 25)
  ctx.lineTo(x + w / 2, y + h + flange + 25)
  ctx.moveTo(x - flange - 25, y + h / 2)
  ctx.lineTo(x + w + flange + 25, y + h / 2)
  ctx.stroke()
  ctx.setLineDash([])

  // 意匠（文字輪郭）- 上面図は左右反転（鏡面）
  if (font && params.text) {
    drawTextOutlineInView(ctx, font, params, x, y, w, h, scale, true)
  }

  // 寸法線
  ctx.lineWidth = 0.5

  // 上部寸法
  const totalW = w + flange * 2
  drawDimensionH(ctx, x - flange, y - flange - 45, totalW, `${(F.topWidth + F.flangeWidth * 2).toFixed(2)}`)
  drawDimensionH(ctx, x, y - flange - 25, w, `${F.topWidth}`)

  // 半幅寸法
  drawDimensionH(ctx, x, y - flange - 65, w / 2, `${(F.topWidth / 2).toFixed(2)}`)
  drawDimensionH(ctx, x + w / 2, y - flange - 65, w / 2, `${(F.topWidth / 2).toFixed(2)}`)

  // 右側寸法
  drawDimensionV(ctx, x + w + flange + 30, y, h, `${F.topDepth}`)

  // 下部フランジ寸法
  drawDimensionH(ctx, x - flange, y + h + flange + 15, flange, `${F.flangeWidth}`)
  drawDimensionH(ctx, x + w, y + h + flange + 15, flange, `${F.flangeWidth}`)

  // 内寸法（文字エリア）
  const innerW = w * 0.75
  const innerOffset = (w - innerW) / 2
  ctx.setLineDash([3, 2])
  ctx.lineWidth = 0.3
  roundedRect(ctx, x + innerOffset, y + innerOffset, innerW, h - innerOffset * 2, r * 0.5)
  ctx.stroke()
  ctx.setLineDash([])
  drawDimensionH(ctx, x + innerOffset, y + h + flange + 35, innerW, `${(F.topWidth * 0.75).toFixed(2)}`)

  // ビュー名
  ctx.font = '11px Arial'
  ctx.fillStyle = '#000000'
  ctx.fillText('上面図', x + w / 2 - 18, y - flange - 80)
}

// 正面断面図（参考図面の上面図右上）
function drawFrontSection(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  scale: number
) {
  const depth = F.totalDepth * scale
  const width = F.topDepth * scale
  const textD = F.textDepth * scale

  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 1.2

  // 断面形状
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + depth, y)
  ctx.lineTo(x + depth, y + width)
  ctx.lineTo(x, y + width)
  ctx.closePath()
  ctx.stroke()

  // 文字彫り深さライン
  ctx.setLineDash([4, 2])
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.moveTo(x + textD, y)
  ctx.lineTo(x + textD, y + width)
  ctx.stroke()

  // 21.50ライン
  const line21 = 21.50 * scale
  ctx.beginPath()
  ctx.moveTo(x + line21, y)
  ctx.lineTo(x + line21, y + width)
  ctx.stroke()
  ctx.setLineDash([])

  // 中心線
  ctx.setLineDash([6, 3])
  ctx.lineWidth = 0.4
  ctx.beginPath()
  ctx.moveTo(x - 15, y + width / 2)
  ctx.lineTo(x + depth + 15, y + width / 2)
  ctx.stroke()
  ctx.setLineDash([])

  // 寸法線
  drawDimensionH(ctx, x, y - 20, depth, `${F.totalDepth}(容器内深さ)`)
  drawDimensionH(ctx, x, y - 40, line21, '21.50')
  drawDimensionH(ctx, x, y + width + 15, textD, `${F.textDepth}(文字部分深さ)`)

  // 右側寸法
  drawDimensionV(ctx, x + depth + 20, y, width, `${F.topDepth}`)

  // 差分寸法
  ctx.font = '9px Arial'
  ctx.fillText('1.72', x + depth + 5, y + width + 30)
  ctx.fillText('3.40', x + depth + 5, y + width + 45)
  ctx.fillText('12.00', x + textD - 20, y + width + 30)
  ctx.fillText('24.60', x + line21 - 20, y + width + 45)

  // ビュー名
  ctx.font = '11px Arial'
  ctx.fillText('正面断面図', x + depth / 2 - 28, y - 55)
}

// 意匠面図（参考図面の右側）
function drawDesignView(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  scale: number,
  params: VariableParams,
  font: opentype.Font | null
) {
  const w = F.topWidth * scale
  const h = F.topDepth * scale
  const r = F.cornerR * scale

  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 1.2

  // 外形
  roundedRect(ctx, x, y, w, h, r)
  ctx.stroke()

  // 中心線
  ctx.setLineDash([8, 4])
  ctx.lineWidth = 0.4
  ctx.beginPath()
  ctx.moveTo(x + w / 2, y - 15)
  ctx.lineTo(x + w / 2, y + h + 15)
  ctx.moveTo(x - 15, y + h / 2)
  ctx.lineTo(x + w + 15, y + h / 2)
  ctx.stroke()
  ctx.setLineDash([])

  // 意匠（文字）
  if (font && params.text) {
    drawTextOutlineInView(ctx, font, params, x, y, w, h, scale)
  }

  // 寸法
  drawDimensionH(ctx, x, y - 25, w, `${F.topWidth}`)
  drawDimensionV(ctx, x + w + 25, y, h, `${F.topDepth}`)

  // ビュー名
  ctx.font = '11px Arial'
  ctx.fillStyle = '#000000'
  ctx.fillText('意匠面図', x + w / 2 - 22, y - 45)
}

// 底面図（参考図面の左下）
function drawBottomView(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  scale: number
) {
  const topW = F.topWidth * scale
  const topH = F.topDepth * scale
  const bottomW = F.bottomWidth * scale
  const bottomH = F.bottomDepth * scale
  const r = F.cornerR * scale * 0.8

  // 上面（フランジ位置）の破線
  ctx.strokeStyle = '#000000'
  ctx.setLineDash([4, 2])
  ctx.lineWidth = 0.5
  const offsetX = (topW - bottomW) / 2
  const offsetY = (topH - bottomH) / 2
  roundedRect(ctx, x - offsetX, y - offsetY, topW, topH, r * 1.2)
  ctx.stroke()
  ctx.setLineDash([])

  // 底面外形
  ctx.lineWidth = 1.2
  roundedRect(ctx, x, y, bottomW, bottomH, r)
  ctx.stroke()

  // 中心線
  ctx.setLineDash([8, 4])
  ctx.lineWidth = 0.4
  ctx.beginPath()
  ctx.moveTo(x + bottomW / 2, y - offsetY - 15)
  ctx.lineTo(x + bottomW / 2, y + bottomH + 15)
  ctx.moveTo(x - offsetX - 15, y + bottomH / 2)
  ctx.lineTo(x + bottomW + 15, y + bottomH / 2)
  ctx.stroke()
  ctx.setLineDash([])

  // 寸法
  drawDimensionH(ctx, x, y + bottomH + 20, bottomW, `${F.bottomWidth}`)
  drawDimensionH(ctx, x - offsetX, y - offsetY - 20, topW, `${F.topWidth}`)
  drawDimensionV(ctx, x - offsetX - 30, y - offsetY, topH, `${F.topDepth}`)
  drawDimensionV(ctx, x + bottomW + 20, y, bottomH, `${F.bottomDepth}`)

  // 深さ寸法（斜め線で表現）
  ctx.font = '9px Arial'
  ctx.fillText(`${F.totalDepth}`, x + bottomW + 35, y + bottomH / 2)

  // ビュー名
  ctx.font = '11px Arial'
  ctx.fillStyle = '#000000'
  ctx.fillText('底面図', x + bottomW / 2 - 18, y - offsetY - 35)
}

// タイトルブロック
function drawTitleBlock(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  text: string
) {
  const w = 320
  const h = 130

  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 1

  // 外枠
  ctx.strokeRect(x, y, w, h)

  // 内部グリッド線
  ctx.lineWidth = 0.5
  ctx.beginPath()
  // 横線
  ctx.moveTo(x, y + 25); ctx.lineTo(x + w, y + 25)
  ctx.moveTo(x, y + 50); ctx.lineTo(x + w, y + 50)
  ctx.moveTo(x, y + 75); ctx.lineTo(x + w, y + 75)
  ctx.moveTo(x, y + 100); ctx.lineTo(x + w, y + 100)
  // 縦線
  ctx.moveTo(x + 60, y); ctx.lineTo(x + 60, y + 75)
  ctx.moveTo(x + 120, y); ctx.lineTo(x + 120, y + 75)
  ctx.moveTo(x + 180, y); ctx.lineTo(x + 180, y + 75)
  ctx.moveTo(x + 240, y); ctx.lineTo(x + 240, y + 75)
  ctx.stroke()

  // ラベル
  ctx.font = '9px Arial'
  ctx.fillStyle = '#000000'
  ctx.fillText('設計者欄出力', x + 5, y + 15)
  ctx.fillText('作成者', x + 65, y + 15)
  ctx.fillText('内容/備考/修正案', x + 125, y + 15)
  ctx.fillText('改訂履歴不正', x + 245, y + 15)
  ctx.fillText('会社', x + 5, y + 40)
  ctx.fillText('部署', x + 5, y + 65)

  ctx.fillText('名　称', x + 5, y + 90)
  ctx.fillText('製　図', x + 185, y + 90)

  // メインタイトル
  ctx.font = 'bold 18px Arial'
  ctx.fillText(`${text}投影図`, x + 70, y + 120)

  // 図面サイズ
  ctx.font = '14px Arial'
  ctx.fillText('A3', x + w - 30, y + 120)
}

// 文字輪郭をビューに描画
function drawTextOutlineInView(
  ctx: CanvasRenderingContext2D,
  font: opentype.Font,
  params: VariableParams,
  boxX: number, boxY: number,
  boxW: number, boxH: number,
  _scale: number,
  mirror: boolean = false  // 左右反転（鏡面）
) {
  const { text, offsetX, offsetY, scale: textScale, rotation } = params

  const chars = text.split('')
  const charCount = chars.length
  // 文字サイズを大きく（端ギリギリまで）
  const baseFontSize = Math.min(boxW * 0.85, boxH * 0.85 / charCount)
  const fontSize = baseFontSize * (textScale / 100)
  const spacing = fontSize * 1.02
  const totalHeight = (charCount - 1) * spacing

  const centerX = boxX + boxW / 2 + offsetX * 3
  const centerY = boxY + boxH / 2 + offsetY * 3

  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.rotate(rotation * Math.PI / 180)

  // 鏡面の場合は左右反転
  if (mirror) {
    ctx.scale(-1, 1)
  }

  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 1.2

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
        case 'M': ctx.moveTo(cmd.x, cmd.y); break
        case 'L': ctx.lineTo(cmd.x, cmd.y); break
        case 'C': ctx.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y); break
        case 'Q': ctx.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y); break
        case 'Z': ctx.closePath(); break
      }
    }
    ctx.stroke()

    ctx.restore()
  })

  ctx.restore()
}

// 角丸四角形
function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// 水平寸法線
function drawDimensionH(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  length: number,
  label: string
) {
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 0.4
  ctx.fillStyle = '#000000'
  ctx.font = '9px Arial'

  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + length, y)
  ctx.stroke()

  drawArrowH(ctx, x, y, 'left')
  drawArrowH(ctx, x + length, y, 'right')

  const textW = ctx.measureText(label).width
  ctx.fillText(label, x + length / 2 - textW / 2, y - 2)
}

// 垂直寸法線
function drawDimensionV(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  length: number,
  label: string
) {
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 0.4
  ctx.fillStyle = '#000000'
  ctx.font = '9px Arial'

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

// 水平矢印
function drawArrowH(ctx: CanvasRenderingContext2D, x: number, y: number, dir: 'left' | 'right') {
  const size = 3
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

// 垂直矢印
function drawArrowV(ctx: CanvasRenderingContext2D, x: number, y: number, dir: 'up' | 'down') {
  const size = 3
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
