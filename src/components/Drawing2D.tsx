import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { VariableParams, FIXED_PARAMS } from '../constants'
import { CANVAS, LAYOUT, FONTS, COLORS } from '../constants/drawing'
import { loadFont } from '../utils/font'
import {
  drawBorder,
  drawTitleBlock,
  drawSideSection,
  drawTopView,
  drawFrontSection,
  drawDepthSection,
  drawDesignView,
  drawBottomView,
} from '../utils/drawing'

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
    canvas.width = CANVAS.width
    canvas.height = CANVAS.height

    // 背景（白）
    ctx.fillStyle = COLORS.background
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 図面枠
    drawBorder(ctx, canvas.width, canvas.height)

    // スケール設定（図面サイズに合わせて調整）
    const mainScale = LAYOUT.scale

    // === 参考図面に合わせたレイアウト ===

    // 基準となる位置（図全体のオフセット）
    const baseX = LAYOUT.baseX
    const baseY = LAYOUT.baseY

    // 1. 側面断面図（左端、上面図と同じ高さ、同じスケール）
    drawSideSection(ctx, baseX + LAYOUT.sideSectionOffsetX, baseY, mainScale)

    // 2. 上面図（中央、文字入り）- メイン
    const topViewX = baseX + LAYOUT.topViewOffsetX
    const topViewY = baseY
    const topViewWidth = F.outerWidth * mainScale
    const topViewHeight = F.outerLength * mainScale
    drawTopView(ctx, topViewX, topViewY, mainScale, params, font)

    // 3. 正面断面図（上面図の上、縦に並ぶ、幅を揃える）
    const frontViewX = topViewX
    const frontViewY = topViewY - LAYOUT.frontSectionOffsetY
    drawFrontSection(ctx, frontViewX, frontViewY, mainScale)

    // 4. 深さ方向断面図（上面図と意匠図の間）
    const depthSectionX = topViewX + topViewWidth + LAYOUT.depthSectionOffsetX
    const depthSectionY = baseY
    drawDepthSection(ctx, depthSectionX, depthSectionY, mainScale)

    // 5. 意匠面図（右端、上面図と同じ高さ）
    const depthSectionWidth = F.totalHeight * mainScale
    const designViewX = depthSectionX + depthSectionWidth + LAYOUT.designViewOffsetX
    const designViewY = baseY
    drawDesignView(ctx, designViewX, designViewY, mainScale, params, font)

    // 6. 底面図（上面図の下、縦に並ぶ）
    const bottomViewX = topViewX + (topViewWidth - F.outerWidth * mainScale) / 2
    const bottomViewY = topViewY + topViewHeight + LAYOUT.bottomViewOffsetY
    drawBottomView(ctx, bottomViewX, bottomViewY, mainScale)

    // 7. タイトルブロック（右下）
    drawTitleBlock(ctx, canvas.width - LAYOUT.titleBlockMarginRight, canvas.height - LAYOUT.titleBlockMarginBottom, params.text)

    // 材料厚表示（中央下）
    ctx.font = FONTS.normal
    ctx.fillStyle = COLORS.text
    ctx.fillText(`材料厚：${F.materialThickness}mm`, baseX + LAYOUT.materialThicknessOffsetX, canvas.height - LAYOUT.materialThicknessMarginBottom)

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

Drawing2D.displayName = 'Drawing2D'

export default Drawing2D
