/**
 * 図面描画用の枠線・タイトルブロック関数
 */

import { BORDER, COLORS, FONTS, TITLE_BLOCK } from '../../constants/drawing'

/**
 * 図面の外枠とグリッド参照線を描画する
 */
export function drawBorder(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const margin = BORDER.margin
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = BORDER.lineWidth
  ctx.strokeRect(margin, margin, w - margin * 2, h - margin * 2)

  // グリッド参照（A-F, 1-8）
  ctx.lineWidth = BORDER.gridLineWidth
  ctx.font = BORDER.labelFont
  ctx.fillStyle = COLORS.text

  const cols = BORDER.cols
  const rows = BORDER.rows
  const colWidth = (w - margin * 4) / cols
  const rowHeight = (h - margin * 4) / rows

  for (let i = 0; i < cols; i++) {
    const x = margin * 2 + colWidth * i + colWidth / 2
    ctx.fillText(String(cols - i), x - 4, margin + 14)
    ctx.fillText(String(cols - i), x - 4, h - margin - 4)
    if (i > 0) {
      ctx.beginPath()
      ctx.moveTo(margin * 2 + colWidth * i, margin)
      ctx.lineTo(margin * 2 + colWidth * i, margin + 18)
      ctx.moveTo(margin * 2 + colWidth * i, h - margin - 18)
      ctx.lineTo(margin * 2 + colWidth * i, h - margin)
      ctx.stroke()
    }
  }

  for (let i = 0; i < rows; i++) {
    const y = margin * 2 + rowHeight * i + rowHeight / 2
    ctx.fillText(BORDER.rowLabels[i], margin + 4, y + 4)
    ctx.fillText(BORDER.rowLabels[i], w - margin * 2, y + 4)
    if (i > 0) {
      ctx.beginPath()
      ctx.moveTo(margin, margin * 2 + rowHeight * i)
      ctx.lineTo(margin + 18, margin * 2 + rowHeight * i)
      ctx.moveTo(w - margin - 18, margin * 2 + rowHeight * i)
      ctx.lineTo(w - margin, margin * 2 + rowHeight * i)
      ctx.stroke()
    }
  }
}

/**
 * タイトルブロックを描画する
 */
export function drawTitleBlock(ctx: CanvasRenderingContext2D, x: number, y: number, text: string) {
  const w = TITLE_BLOCK.width
  const h = TITLE_BLOCK.height

  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 1

  // 外枠
  ctx.strokeRect(x, y, w, h)

  // 内部グリッド線
  ctx.lineWidth = 0.5
  ctx.beginPath()
  // 横線（ヘッダー行、データ行の区切り）
  ctx.moveTo(x, y + TITLE_BLOCK.rowHeight)
  ctx.lineTo(x + w, y + TITLE_BLOCK.rowHeight)
  ctx.moveTo(x, y + TITLE_BLOCK.rowHeight * 2)
  ctx.lineTo(x + w, y + TITLE_BLOCK.rowHeight * 2)
  ctx.moveTo(x, y + TITLE_BLOCK.rowHeight * 3)
  ctx.lineTo(x + w, y + TITLE_BLOCK.rowHeight * 3)
  ctx.moveTo(x, y + TITLE_BLOCK.rowHeight * 4)
  ctx.lineTo(x + w, y + TITLE_BLOCK.rowHeight * 4)
  // 縦線（列の区切り）
  let colX = x
  for (let i = 0; i < TITLE_BLOCK.colWidths.length - 1; i++) {
    colX += TITLE_BLOCK.colWidths[i]
    ctx.moveTo(colX, y)
    ctx.lineTo(colX, y + TITLE_BLOCK.rowHeight * 4)
  }
  ctx.stroke()

  // ヘッダー行のラベル
  ctx.font = FONTS.titleLabel
  ctx.fillStyle = COLORS.text
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'

  // ヘッダー行（中央揃え）
  const headerY = y + TITLE_BLOCK.rowHeight / 2
  ctx.textAlign = 'center'
  ctx.fillText('設計者欄出力', x + TITLE_BLOCK.colWidths[0] / 2, headerY)
  ctx.fillText('作成者', x + TITLE_BLOCK.colWidths[0] + TITLE_BLOCK.colWidths[1] / 2, headerY)
  ctx.fillText(
    '内容/備考/修正案',
    x + TITLE_BLOCK.colWidths[0] + TITLE_BLOCK.colWidths[1] + TITLE_BLOCK.colWidths[2] / 2,
    headerY
  )
  ctx.fillText(
    '改訂履歴',
    x +
      TITLE_BLOCK.colWidths[0] +
      TITLE_BLOCK.colWidths[1] +
      TITLE_BLOCK.colWidths[2] +
      TITLE_BLOCK.colWidths[3] / 2 +
      TITLE_BLOCK.colWidths[4] / 2,
    headerY
  )

  // データ行のラベル（左揃え）
  ctx.textAlign = 'left'
  ctx.fillText('会社', x + 5, y + TITLE_BLOCK.rowHeight * 1.5)
  ctx.fillText('部署', x + 5, y + TITLE_BLOCK.rowHeight * 2.5)
  ctx.fillText('名　称', x + 5, y + TITLE_BLOCK.rowHeight * 3.5)

  // 「製図」は「内容/備考/修正案」列に配置
  ctx.textAlign = 'center'
  ctx.fillText(
    '製　図',
    x + TITLE_BLOCK.colWidths[0] + TITLE_BLOCK.colWidths[1] + TITLE_BLOCK.colWidths[2] / 2,
    y + TITLE_BLOCK.rowHeight * 3.5
  )

  // メインタイトル（下部の大きなタイトルエリア）
  ctx.font = FONTS.titleMain
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${text}投影図`, x + 10, y + h - TITLE_BLOCK.rowHeight / 2)

  // 図面サイズ（右側に配置）
  ctx.font = FONTS.titleSize
  ctx.textAlign = 'right'
  ctx.fillText('A3', x + w - 10, y + h - TITLE_BLOCK.rowHeight / 2)
}
