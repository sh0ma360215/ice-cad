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
    const mainScale = 3.2  // メインビュー用
    const sideScale = 2.5  // 側面断面図用

    // === 参考図面に合わせたレイアウト ===

    // 1. 側面断面図（左端、縦長）
    drawSideSection(ctx, 50, 80, sideScale)

    // 2. 上面図（中央左、文字入り）- メイン
    const topViewX = 180
    const topViewY = 100
    drawTopView(ctx, topViewX, topViewY, mainScale, params, font)

    // 3. 正面断面図（上面図の右側、縦長）
    const topViewWidth = F.outerWidth * mainScale
    const frontViewX = topViewX + topViewWidth + 50
    const frontViewY = 70
    drawFrontSection(ctx, frontViewX, frontViewY, mainScale)

    // 4. 意匠面図（右端、文字入り）
    const frontViewWidth = F.outerLength * mainScale
    const designViewX = frontViewX + frontViewWidth + 130
    const designViewY = 100
    drawDesignView(ctx, designViewX, designViewY, mainScale, params, font)

    // 5. 底面図（左下）
    const topViewHeight = F.outerLength * mainScale
    const bottomViewX = 80
    const bottomViewY = topViewY + topViewHeight + 100
    drawBottomView(ctx, bottomViewX, bottomViewY, mainScale)

    // 6. タイトルブロック（右下）
    drawTitleBlock(ctx, canvas.width - 350, canvas.height - 150, params.text)

    // 材料厚表示（中央下）
    ctx.font = '14px Arial'
    ctx.fillStyle = '#000000'
    ctx.fillText(`材料厚：${F.materialThickness}mm`, 520, canvas.height - 100)

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

// 側面断面図（精密版 - 勾配とハッチング付き）
function drawSideSection(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  scale: number
) {
  // 縦向きの図を描く（高さ方向＝画面Y軸、深さ方向＝画面X軸）
  const height = F.outerLength * scale     // 113.91
  const depth = F.totalHeight * scale       // 24.60
  const flangeLen = ((F.outerLength - F.innerLength) / 2) * scale  // フランジ部分の長さ
  
  // 勾配計算 (tan(8度) * 深さ)
  const draftOffset = depth * Math.tan(F.draftAngleSide * Math.PI / 180)

  ctx.save()
  
  // --- 断面の外形パスを作成 ---
  ctx.beginPath()
  
  // 外側のライン（時計回り）
  ctx.moveTo(x + depth, y)                           // 右上（フランジ端）
  ctx.lineTo(x + depth, y + flangeLen)               // フランジ付け根（上）
  ctx.lineTo(x + draftOffset, y + flangeLen)         // 勾配開始点（上）
  ctx.lineTo(x, y + height / 2)                      // 底面中央（最も狭い部分）
  ctx.lineTo(x + draftOffset, y + height - flangeLen) // 勾配終了点（下）
  ctx.lineTo(x + depth, y + height - flangeLen)      // フランジ付け根（下）
  ctx.lineTo(x + depth, y + height)                  // 右下（フランジ端）
  
  // 内側のライン（反時計回りで戻る）- 材料厚分オフセット
  const t = 3 * scale / 3  // 見やすくするため誇張
  ctx.lineTo(x + depth - t, y + height)
  ctx.lineTo(x + depth - t, y + height - flangeLen)
  ctx.lineTo(x + draftOffset + t, y + height - flangeLen)
  ctx.lineTo(x + t, y + height / 2)
  ctx.lineTo(x + draftOffset + t, y + flangeLen)
  ctx.lineTo(x + depth - t, y + flangeLen)
  ctx.lineTo(x + depth - t, y)
  
  ctx.closePath()
  
  // 輪郭描画
  ctx.lineWidth = 1.2
  ctx.strokeStyle = '#000000'
  ctx.stroke()
  
  // --- ハッチング（斜線）処理 ---
  ctx.save()
  ctx.clip()  // さっきのパスで切り抜く
  
  ctx.beginPath()
  ctx.lineWidth = 0.3
  ctx.strokeStyle = '#000000'
  const hatchSize = Math.max(height, depth) * 2
  for (let i = -hatchSize; i < hatchSize; i += 5) {
    ctx.moveTo(x - hatchSize + i, y - 10)
    ctx.lineTo(x + i + 50, y + hatchSize)
  }
  ctx.stroke()
  ctx.restore()  // クリップ解除

  // 中心線（横方向 - 一点鎖線）
  ctx.setLineDash([10, 3, 3, 3])
  ctx.lineWidth = 0.4
  ctx.beginPath()
  ctx.moveTo(x - 15, y + height / 2)
  ctx.lineTo(x + depth + 15, y + height / 2)
  ctx.stroke()
  ctx.setLineDash([])

  // 寸法線
  drawDimensionV(ctx, x - 25, y, height, '113.91')
  drawDimensionV(ctx, x - 50, y + flangeLen, height - flangeLen * 2, '97.30')
  
  // 勾配指示
  ctx.font = '9px Arial'
  ctx.fillStyle = '#000000'
  ctx.fillText(`勾配${F.draftAngleSide}°`, x - 40, y + 40)
  ctx.fillText(`勾配${F.draftAngleStick}°`, x + depth + 5, y + height - 40)
  
  // R表示
  ctx.font = '8px Arial'
  ctx.fillText(`R${F.outerR}`, x + depth + 5, y + 15)
  ctx.fillText(`R${F.innerR}`, x + depth + 5, y + flangeLen + 10)

  // ビュー名
  ctx.font = '10px Arial'
  ctx.fillText('側面断面図', x + depth / 2 - 25, y - 15)
  
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

  // 5. 文字描画（底面エリア内に配置、鏡文字）
  if (font && params.text) {
    drawTextOutlineInView(ctx, font, params, cavX, cavY, cavW, cavH, scale, true)
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

  // --- 寸法線（図面と同じ位置に配置） ---
  ctx.lineWidth = 0.5
  
  // 上部寸法
  drawDimensionH(ctx, x, y - 20, outW, '76.91')
  drawDimensionH(ctx, inX, y - 40, inW, '70.00')
  
  // 半幅寸法（35.00 + 35.00）
  const halfIn = inW / 2
  drawDimensionH(ctx, inX, y - 60, halfIn, '35.00')
  drawDimensionH(ctx, inX + halfIn, y - 60, halfIn, '35.00')
  
  // キャビティ幅
  drawDimensionH(ctx, cavX, y - 80, cavW, '57.90')

  // 右側の縦寸法
  drawDimensionV(ctx, x + outW + 20, y, outH, '113.91')
  drawDimensionV(ctx, x + outW + 45, inY, inH, '107.00')
  drawDimensionV(ctx, x + outW + 70, cavY, cavH, '97.30')

  // 下部寸法（スティック部）
  drawDimensionH(ctx, cx - slotW / 2, y + outH + 15, F.stickSlotHalf * scale, '7.00')
  drawDimensionH(ctx, cx, y + outH + 15, F.stickSlotHalf * scale, '7.00')
  drawDimensionH(ctx, cx - slotW / 2, y + outH + 35, slotW, '14.00')

  // R表示
  ctx.font = '8px Arial'
  ctx.fillStyle = '#000000'
  ctx.fillText(`R${F.outerR}`, x + 5, y + 15)
  ctx.fillText(`R${F.innerR}`, inX + 5, inY + 15)

  // ビュー名
  ctx.font = '11px Arial'
  ctx.fillText('上面図', cx - 18, y - 95)
}

// 正面断面図（精密版 - 縦向き）
function drawFrontSection(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  scale: number
) {
  // 縦向き: 幅=outerLength方向(113.91), 高さ=totalHeight方向(24.60)
  const width = F.outerLength * scale     // 113.91
  const height = F.totalHeight * scale    // 24.60
  const depthStep = F.depthStep * scale   // 21.50
  const depthText = F.depthText * scale   // 3.00
  const offsetCorner = F.offsetCorner * scale  // 1.72

  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 1.2

  // 外形（台形 - 勾配考慮）
  ctx.beginPath()
  ctx.moveTo(x, y)                              // 左上
  ctx.lineTo(x + width, y)                      // 右上
  ctx.lineTo(x + width - offsetCorner, y + height)   // 右下（テーパー）
  ctx.lineTo(x + offsetCorner, y + height)           // 左下（テーパー）
  ctx.closePath()
  ctx.stroke()

  // 文字彫り深さライン（上から3.00の位置）
  ctx.setLineDash([4, 2])
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.moveTo(x + 5, y + depthText)
  ctx.lineTo(x + width - 5, y + depthText)
  ctx.stroke()

  // 21.50ライン
  ctx.beginPath()
  ctx.moveTo(x + 5, y + depthStep)
  ctx.lineTo(x + width - 5, y + depthStep)
  ctx.stroke()
  ctx.setLineDash([])

  // 中心線（縦方向 - 一点鎖線）
  ctx.setLineDash([10, 3, 3, 3])
  ctx.lineWidth = 0.4
  ctx.beginPath()
  ctx.moveTo(x + width / 2, y - 20)
  ctx.lineTo(x + width / 2, y + height + 20)
  ctx.stroke()
  ctx.setLineDash([])

  // --- 寸法線 ---
  // 上部: 幅寸法（113.91）
  drawDimensionH(ctx, x, y - 20, width, '113.91')
  
  // 半幅寸法（53.50 + 53.50 = 107.00の半分）
  const half = (F.innerLength * scale) / 2
  const halfStart = x + (width - F.innerLength * scale) / 2
  drawDimensionH(ctx, halfStart, y - 40, half, '53.50')
  drawDimensionH(ctx, halfStart + half, y - 40, half, '53.50')

  // 右側: 深さ寸法
  drawDimensionV(ctx, x + width + 15, y, height, `${F.totalHeight}(容器内深さ)`)
  drawDimensionV(ctx, x + width + 45, y, depthStep, '21.50')
  drawDimensionV(ctx, x + width + 70, y, depthText, `${F.depthText}(文字部分深さ)`)

  // 差分寸法（右下）
  ctx.font = '9px Arial'
  ctx.fillStyle = '#000000'
  ctx.fillText(`${F.offsetCorner}`, x + width + 10, y + height + 15)
  ctx.fillText(`${F.flangeIndicated}`, x + width + 10, y + height + 28)
  ctx.fillText(`${F.stickSlotHeight}`, x + 15, y + depthText + 12)
  ctx.fillText('24.60', x + 15, y + depthStep + 12)

  // ビュー名
  ctx.font = '11px Arial'
  ctx.fillText('正面断面図', x + width / 2 - 30, y - 55)
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

  // 意匠（文字）- 正面なので鏡像なし
  if (font && params.text) {
    drawTextOutlineInView(ctx, font, params, x, y, w, h, scale, false)
  }

  // 寸法
  drawDimensionH(ctx, x, y - 25, w, '76.91')
  drawDimensionV(ctx, x + w + 25, y, h, '113.91')

  // ビュー名
  ctx.font = '11px Arial'
  ctx.fillStyle = '#000000'
  ctx.fillText('意匠面図', x + w / 2 - 22, y - 45)
}

// 底面図（精密版）
function drawBottomView(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  scale: number
) {
  const outerW = F.outerWidth * scale   // 76.91
  const outerH = F.outerLength * scale  // 113.91
  const innerW = F.innerWidth * scale   // 70.00
  const innerH = F.innerLength * scale  // 107.00
  const r = F.innerR * scale            // 6.00

  // 中心座標
  const cx = x + innerW / 2
  const cy = y + innerH / 2

  // 外形（上面の投影 - 破線）
  const outerX = cx - outerW / 2
  const outerY = cy - outerH / 2
  ctx.strokeStyle = '#000000'
  ctx.setLineDash([4, 2])
  ctx.lineWidth = 0.5
  roundedRect(ctx, outerX, outerY, outerW, outerH, F.outerR * scale)
  ctx.stroke()
  ctx.setLineDash([])

  // 底面外形（実線）
  ctx.lineWidth = 1.2
  roundedRect(ctx, x, y, innerW, innerH, r)
  ctx.stroke()

  // 中心線（一点鎖線）
  ctx.setLineDash([10, 3, 3, 3])
  ctx.lineWidth = 0.4
  ctx.beginPath()
  ctx.moveTo(cx, outerY - 20)
  ctx.lineTo(cx, outerY + outerH + 20)
  ctx.moveTo(outerX - 20, cy)
  ctx.lineTo(outerX + outerW + 20, cy)
  ctx.stroke()
  ctx.setLineDash([])

  // 寸法
  drawDimensionH(ctx, x, y + innerH + 20, innerW, '70.00')
  drawDimensionH(ctx, outerX, outerY - 20, outerW, '76.91')
  drawDimensionV(ctx, outerX - 30, outerY, outerH, '113.91')
  drawDimensionV(ctx, x + innerW + 20, y, innerH, '107.00')

  // 深さ・高さ寸法
  ctx.font = '9px Arial'
  ctx.fillStyle = '#000000'
  ctx.fillText(`${F.stickSlotHeight}`, x + innerW + 35, y + 20)
  ctx.fillText(`${F.totalHeight}`, x + innerW + 35, y + innerH / 2)

  // ビュー名
  ctx.font = '11px Arial'
  ctx.fillText('底面図', cx - 18, outerY - 35)
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
