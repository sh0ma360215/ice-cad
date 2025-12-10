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

    // スケール設定（図面サイズに合わせて調整）
    const mainScale = 3.2  // 全ビュー共通スケール

    // === 参考図面に合わせたレイアウト ===

    // 基準となる位置（図全体のオフセット）
    const baseX = 200  // 右にシフト
    const baseY = 250

    // 1. 側面断面図（左端、上面図と同じ高さ、同じスケール）
    drawSideSection(ctx, baseX + 5, baseY, mainScale)

    // 2. 上面図（中央、文字入り）- メイン
    const topViewX = baseX + 180
    const topViewY = baseY
    const topViewWidth = F.outerWidth * mainScale
    const topViewHeight = F.outerLength * mainScale
    drawTopView(ctx, topViewX, topViewY, mainScale, params, font)

    // 3. 正面断面図（上面図の上、縦に並ぶ、幅を揃える）
    const frontViewX = topViewX  // 上面図と左端を揃える
    const frontViewY = topViewY - 180 // 上面図の上（間隔を広げる）
    drawFrontSection(ctx, frontViewX, frontViewY, mainScale)

    // 4. 深さ方向断面図（上面図と意匠図の間）
    const depthSectionX = topViewX + topViewWidth + 170
    const depthSectionY = baseY
    drawDepthSection(ctx, depthSectionX, depthSectionY, mainScale)

    // 5. 意匠面図（右端、上面図と同じ高さ）
    const depthSectionWidth = F.totalHeight * mainScale
    const designViewX = depthSectionX + depthSectionWidth + 170
    const designViewY = baseY  // 上面図と同じ高さ
    drawDesignView(ctx, designViewX, designViewY, mainScale, params, font)

    // 6. 底面図（上面図の下、縦に並ぶ）
    const bottomViewX = topViewX + (topViewWidth - F.outerWidth * mainScale) / 2  // 中心を揃える
    const bottomViewY = topViewY + topViewHeight + 100  // 間隔を調整（上に移動）
    drawBottomView(ctx, bottomViewX, bottomViewY, mainScale)

    // 7. タイトルブロック（右下）
    drawTitleBlock(ctx, canvas.width - 350, canvas.height - 150, params.text)

    // 材料厚表示（中央下）
    ctx.font = '14px Arial'
    ctx.fillStyle = '#000000'
    ctx.fillText(`材料厚：${F.materialThickness}mm`, baseX + 520, canvas.height - 100)

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

// 側面断面図（長方形ハッチング付き - 右側の深さ方向断面図と同じ形式）
function drawSideSection(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  scale: number
) {
  // 寸法（図面から）
  const width = F.totalHeight * scale      // 24.60（横幅 = 深さ方向）
  const outerH = F.outerLength * scale     // 113.91（外形高さ）
  const innerH = F.innerLength * scale     // 107.00（内形高さ）
  
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
  ctx.lineWidth = 0.3
  ctx.strokeStyle = '#000000'
  const hatchSize = Math.max(width, outerH) * 2
  for (let i = -hatchSize; i < hatchSize; i += 4) {
    ctx.moveTo(x - 50 + i, y - 20)
    ctx.lineTo(x + i + 80, y + outerH + 50)
  }
  ctx.stroke()
  ctx.restore()

  // --- 外形線（太線）---
  ctx.lineWidth = 1.2
  ctx.strokeStyle = '#000000'
  ctx.strokeRect(x, y, width, outerH)

  // 内側線（107.00の範囲 - 上下のフランジ境界）
  ctx.lineWidth = 0.8
  ctx.beginPath()
  // 上部フランジ境界線
  ctx.moveTo(x, y + innerOffset)
  ctx.lineTo(x + width, y + innerOffset)
  // 下部フランジ境界線
  ctx.moveTo(x, y + innerOffset + innerH)
  ctx.lineTo(x + width, y + innerOffset + innerH)
  ctx.stroke()

  // 中心線（横方向 - 一点鎖線）
  ctx.setLineDash([10, 3, 3, 3])
  ctx.lineWidth = 0.4
  ctx.beginPath()
  ctx.moveTo(x - 15, y + outerH / 2)
  ctx.lineTo(x + width + 15, y + outerH / 2)
  ctx.stroke()
  ctx.setLineDash([])

  // 勾配指示
  ctx.font = '9px Arial'
  ctx.fillStyle = '#000000'
  ctx.fillText(`勾配${F.draftAngleSide}°`, x - 40, y + 30)
  ctx.fillText(`勾配${F.draftAngleStick}°`, x + width + 5, y + outerH / 2 + 20)
  
  // R表示
  ctx.font = '8px Arial'
  ctx.fillText(`R${F.outerR}`, x + width + 5, y + 15)
  ctx.fillText(`R${F.innerR}`, x + width + 5, y + innerOffset + 10)

  ctx.restore()
}

// 上面図（精密版 - 図面に厳密に準拠）
function drawTopView(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  scale: number,
  params: VariableParams,
  font: opentype.Font | null
) {
  // 寸法をスケール変換
  const outW = F.outerWidth * scale      // 76.91
  const outH = F.outerLength * scale     // 113.91
  const inW = F.innerWidth * scale       // 70.00
  const inH = F.innerLength * scale      // 107.00
  const cavW = F.cavityWidth * scale     // 57.90
  const cavH = F.cavityLength * scale    // 97.30
  
  const outR = F.outerR * scale          // 9.46
  const inR = F.innerR * scale           // 6.00
  const slotW = F.stickSlotWidth * scale // 14.00

  // 中心座標
  const cx = x + outW / 2
  const cy = y + outH / 2

  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 1.2

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
  ctx.lineWidth = 0.8
  roundedRect(ctx, cavX, cavY, cavW, cavH, inR * 0.6)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.lineWidth = 1.2

  // 4. スティック切り欠き（下部） - 幅14.00 (7.00 + 7.00)
  const slotDepth = 20 * scale / 3  // 切り欠きの深さ
  
  // 切り欠き部分を白で塗りつぶして線を消す
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(cx - slotW / 2 - 1, y + outH - slotDepth, slotW + 2, slotDepth + 5)
  
  // 切り欠きの線を描画
  ctx.strokeStyle = '#000000'
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
  ctx.lineWidth = 0.4
  ctx.beginPath()
  ctx.moveTo(cx, y - 25)
  ctx.lineTo(cx, y + outH + 25)
  ctx.moveTo(x - 25, cy)
  ctx.lineTo(x + outW + 25, cy)
  ctx.stroke()
  ctx.setLineDash([])

  // --- 左側の寸法・表示 ---
  // 勾配表示
  ctx.font = '8px Arial'
  ctx.fillStyle = '#000000'
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
  ctx.font = '8px Arial'
  ctx.fillStyle = '#000000'
  ctx.fillText(`R${F.outerR}`, x + 5, y + 15)
  ctx.fillText(`R${F.innerR}`, inX + 5, inY + 15)

}

// 正面断面図（台形断面 - ハッチング付き、上面図と同じ幅）
function drawFrontSection(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  scale: number
) {
  // 寸法（図面から正確に - 横幅は上面図と同じ76.91）
  const topW = F.outerWidth * scale      // 76.91（上面 = 広い方）
  const bottomW = F.innerWidth * scale   // 70.00（底面 = 狭い方）
  const height = F.totalHeight * scale   // 24.60（高さ = 深さ方向）

  // 台形の4点を計算（中央揃え）
  const bottomOffset = (topW - bottomW) / 2
  
  // 上面（広い方 - 76.91）
  const t1x = x                    // 左上X
  const t1y = y                    // 左上Y
  const t2x = x + topW             // 右上X
  const t2y = y                    // 右上Y
  
  // 底面（狭い方 - 70.00）
  const b1x = x + bottomOffset     // 左下X
  const b1y = y + height           // 左下Y
  const b2x = x + bottomOffset + bottomW  // 右下X
  const b2y = y + height           // 右下Y

  // スティック切り欠き
  const slotW = F.stickSlotWidth * scale  // 14.00
  const slotH = 8 * scale / 2.5           // 切り欠きの深さ
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
  ctx.lineWidth = 0.3
  ctx.strokeStyle = '#000000'
  const hatchSize = Math.max(topW, height) * 2
  for (let i = -hatchSize; i < hatchSize; i += 4) {
    ctx.moveTo(x - 50 + i, y - 20)
    ctx.lineTo(x + i + 80, y + height + 50)
  }
  ctx.stroke()
  ctx.restore()

  // --- 外形線を描画（太線） ---
  ctx.lineWidth = 1.2
  ctx.strokeStyle = '#000000'

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
  ctx.lineWidth = 0.6
  ctx.beginPath()
  ctx.moveTo(slotCenterX - slotW / 2 + 4, b1y + 2)
  ctx.lineTo(slotCenterX - slotW / 2 + 4, b1y + slotH - 2)
  ctx.moveTo(slotCenterX + slotW / 2 - 4, b2y + 2)
  ctx.lineTo(slotCenterX + slotW / 2 - 4, b2y + slotH - 2)
  ctx.stroke()

  // 中心線（縦方向 - 一点鎖線）
  ctx.setLineDash([10, 3, 3, 3])
  ctx.lineWidth = 0.4
  ctx.beginPath()
  ctx.moveTo(x + topW / 2, y - 15)
  ctx.lineTo(x + topW / 2, y + height + slotH + 15)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.restore()
}

// 深さ方向断面図（上面図と意匠図の間 - 縦長ハッチング付き）
function drawDepthSection(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  scale: number
) {
  // 寸法（図面から）
  const width = F.totalHeight * scale      // 24.60（横幅 = 深さ方向）
  const outerH = F.outerLength * scale     // 113.91（外形高さ）
  const innerH = F.innerLength * scale     // 107.00（内形高さ）
  
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
  ctx.lineWidth = 0.3
  ctx.strokeStyle = '#000000'
  const hatchSize = Math.max(width, outerH) * 2
  for (let i = -hatchSize; i < hatchSize; i += 4) {
    ctx.moveTo(x - 50 + i, y - 20)
    ctx.lineTo(x + i + 80, y + outerH + 50)
  }
  ctx.stroke()
  ctx.restore()

  // --- 外形線（太線）---
  ctx.lineWidth = 1.2
  ctx.strokeStyle = '#000000'
  ctx.strokeRect(x, y, width, outerH)

  // 内側線（107.00の範囲 - 上下のフランジ境界）
  ctx.lineWidth = 0.8
  ctx.beginPath()
  // 上部フランジ境界線
  ctx.moveTo(x, y + innerOffset)
  ctx.lineTo(x + width, y + innerOffset)
  // 下部フランジ境界線
  ctx.moveTo(x, y + innerOffset + innerH)
  ctx.lineTo(x + width, y + innerOffset + innerH)
  ctx.stroke()

  // 中心線（横方向 - 一点鎖線）
  ctx.setLineDash([10, 3, 3, 3])
  ctx.lineWidth = 0.4
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
  ctx.font = '8px Arial'
  ctx.fillStyle = '#000000'
  ctx.fillText('1.72', x - 5, y + outerH + 15)
  ctx.fillText('3.40', x + width + 5, y + outerH + 15)
  ctx.fillText('12.00', x + 5, y + outerH + 30)
  ctx.fillText('24.60', x + width / 2 - 10, y + outerH + 30)

  ctx.restore()
}

// 意匠面図（精密版）
function drawDesignView(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  scale: number,
  params: VariableParams,
  font: opentype.Font | null
) {
  const w = F.outerWidth * scale   // 76.91
  const h = F.outerLength * scale  // 113.91
  const r = F.innerR * scale       // 6.00
  
  // キャビティエリア（上面図と同じサイズで文字を描画）
  const cavW = F.cavityWidth * scale   // 57.90
  const cavH = F.cavityLength * scale  // 97.30
  const cavX = x + (w - cavW) / 2
  const cavY = y + (h - cavH) / 2

  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 1.2

  // 外形
  roundedRect(ctx, x, y, w, h, r)
  ctx.stroke()

  // 中心線（一点鎖線）
  ctx.setLineDash([10, 3, 3, 3])
  ctx.lineWidth = 0.4
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

// 底面図（台形断面図 - ハッチング付き、図面通り）
function drawBottomView(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  scale: number
) {
  // 寸法（図面から正確に）
  const topW = F.innerWidth * scale      // 70.00（上面 = 狭い方）
  const bottomW = F.outerWidth * scale   // 76.91（底面 = 広い方）
  const heightLeft = F.stickSlotHeight * scale   // 12.00（左側高さ）
  const heightRight = F.totalHeight * scale      // 24.60（右側高さ）

  // 台形の4点を計算（中央揃え）
  const topOffset = (bottomW - topW) / 2
  
  // 上面（狭い方 - 70.00）
  const t1x = x + topOffset           // 左上X
  const t1y = y                       // 左上Y
  const t2x = x + topOffset + topW    // 右上X
  const t2y = y                       // 右上Y
  
  // 底面（広い方 - 76.91）- 左右で高さが異なる
  const b1x = x                       // 左下X
  const b1y = y + heightLeft          // 左下Y（12.00）
  const b2x = x + bottomW             // 右下X
  const b2y = y + heightRight         // 右下Y（24.60）

  // スティック切り欠き
  const slotW = F.stickSlotWidth * scale  // 14.00
  const slotH = 8 * scale / 2.5           // 切り欠きの深さ
  const slotCenterX = x + bottomW / 2
  // 左右の底面高さの中間点を計算
  const slotLeftY = b1y + (b2y - b1y) * ((slotCenterX - slotW/2 - x) / bottomW)
  const slotRightY = b1y + (b2y - b1y) * ((slotCenterX + slotW/2 - x) / bottomW)

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
  ctx.lineWidth = 0.3
  ctx.strokeStyle = '#000000'
  const hatchSize = Math.max(bottomW, heightRight) * 2
  for (let i = -hatchSize; i < hatchSize; i += 4) {
    ctx.moveTo(x - 50 + i, y - 20)
    ctx.lineTo(x + i + 80, y + heightRight + 50)
  }
  ctx.stroke()
  ctx.restore()

  // --- 外形線を描画（太線） ---
  ctx.lineWidth = 1.2
  ctx.strokeStyle = '#000000'

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
  ctx.lineWidth = 0.6
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

// 文字輪郭をハッチング付きで描画（上面図用）
function drawTextWithHatching(
  ctx: CanvasRenderingContext2D,
  font: opentype.Font,
  params: VariableParams,
  boxX: number, boxY: number,
  boxW: number, boxH: number,
  viewScale: number,
  mirror: boolean = false
) {
  const { text, offsetX, offsetY, scale: textScale, rotation } = params

  const chars = text.split('')
  const charCount = chars.length
  const baseFontSize = Math.min(boxW * 0.85, boxH * 0.85 / charCount)
  const fontSize = baseFontSize * (textScale / 100)
  const spacing = fontSize * 1.02
  const totalHeight = (charCount - 1) * spacing

  const centerX = boxX + boxW / 2 + offsetX * viewScale
  const centerY = boxY + boxH / 2 + offsetY * viewScale

  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.rotate(rotation * Math.PI / 180)

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
        case 'M': ctx.moveTo(cmd.x, cmd.y); break
        case 'L': ctx.lineTo(cmd.x, cmd.y); break
        case 'C': ctx.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y); break
        case 'Q': ctx.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y); break
        case 'Z': ctx.closePath(); break
      }
    }

    // ハッチング（斜線で塗りつぶし）
    ctx.save()
    ctx.clip()
    ctx.beginPath()
    ctx.lineWidth = 0.4
    ctx.strokeStyle = '#000000'
    const hatchSize = Math.max(charW, charH) * 2
    for (let i = -hatchSize; i < hatchSize; i += 3) {
      ctx.moveTo(bbox.x1 - 20 + i, bbox.y1 - 20)
      ctx.lineTo(bbox.x1 + i + hatchSize, bbox.y1 + hatchSize)
    }
    ctx.stroke()
    ctx.restore()

    // 輪郭線
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
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 1.2
    ctx.stroke()

    ctx.restore()
  })

  ctx.restore()
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
  // 文字サイズ（キャビティエリアに収まるように）
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
