/**
 * 2D図面描画用の定数
 */

/** キャンバスサイズ（A3横サイズ風） */
export const CANVAS = {
  width: 1400,
  height: 900,
} as const

/** 図面全体のスケールとレイアウト位置 */
export const LAYOUT = {
  /** mm → canvas pixelへの変換スケール */
  scale: 3.2,
  /** 図面全体の基準X座標 */
  baseX: 200,
  /** 図面全体の基準Y座標 */
  baseY: 250,
  /** 側面断面図のX方向オフセット */
  sideSectionOffsetX: 5,
  /** 上面図のX方向オフセット */
  topViewOffsetX: 180,
  /** 正面断面図のY方向オフセット（上面図から上へ） */
  frontSectionOffsetY: 180,
  /** 深さ断面図のX方向オフセット（上面図から右へ） */
  depthSectionOffsetX: 170,
  /** 意匠図のX方向オフセット（深さ断面図から右へ） */
  designViewOffsetX: 170,
  /** 底面図のY方向オフセット（上面図から下へ） */
  bottomViewOffsetY: 100,
  /** タイトルブロックの右マージン */
  titleBlockMarginRight: 350,
  /** タイトルブロックの下マージン */
  titleBlockMarginBottom: 150,
  /** 材料厚表示のX方向オフセット */
  materialThicknessOffsetX: 520,
  /** 材料厚表示の下マージン */
  materialThicknessMarginBottom: 100,
} as const

/** 図面枠の設定 */
export const BORDER = {
  /** 外枠の線幅 */
  lineWidth: 2,
  /** 外枠のマージン */
  margin: 10,
  /** グリッド線の線幅 */
  gridLineWidth: 0.5,
  /** グリッドの列数 */
  cols: 8,
  /** グリッドの行数 */
  rows: 6,
  /** グリッドラベルのフォント */
  labelFont: '11px Arial',
  /** 行ラベル（下から上へ） */
  rowLabels: ['F', 'E', 'D', 'C', 'B', 'A'] as const,
} as const

/** 線のスタイル */
export const LINE_STYLES = {
  /** 外形線の線幅 */
  outline: 1.2,
  /** 内側線の線幅 */
  inner: 0.8,
  /** 中心線の線幅 */
  centerLine: 0.4,
  /** ハッチングの線幅 */
  hatching: 0.3,
  /** 寸法線の線幅 */
  dimension: 0.4,
  /** スティック内部線の線幅 */
  stickInner: 0.6,
  /** 文字輪郭の線幅 */
  textOutline: 1.2,
  /** ハッチングの間隔（ピクセル） */
  hatchingSpacing: 4,
  /** 文字ハッチングの間隔 */
  textHatchingSpacing: 3,
} as const

/** 中心線のダッシュパターン */
export const CENTER_LINE_DASH = [15, 3, 3, 3] as const
export const CENTER_LINE_DASH_SHORT = [10, 3, 3, 3] as const

/** 破線パターン（キャビティ境界など） */
export const DASHED_LINE = [4, 2] as const

/** フォント設定 */
export const FONTS = {
  /** 寸法値のフォント */
  dimension: '9px Arial',
  /** 勾配・R表示のフォント */
  annotation: '8px Arial',
  /** 小さい注釈のフォント */
  small: '8px Arial',
  /** 通常テキストのフォント */
  normal: '14px Arial',
  /** タイトルブロックのラベル */
  titleLabel: '9px Arial',
  /** タイトルブロックのメインタイトル */
  titleMain: 'bold 18px Arial',
  /** タイトルブロックのサイズ表示 */
  titleSize: '14px Arial',
} as const

/** タイトルブロックのサイズ */
export const TITLE_BLOCK = {
  width: 320,
  height: 130,
  /** 行の高さ */
  rowHeight: 25,
  /** 列の幅（左から） */
  colWidths: [60, 60, 60, 60, 80] as const,
} as const

/** 寸法線の設定 */
export const DIMENSION = {
  /** 矢印のサイズ */
  arrowSize: 3,
  /** 引出線の長さ */
  extensionLength: 15,
  /** 中心線のはみ出し長さ */
  centerLineExtension: 25,
  /** 寸法線の短い延長 */
  shortExtension: 15,
  /** 寸法線の長い延長 */
  longExtension: 20,
} as const

/** 色の設定 */
export const COLORS = {
  /** 背景色 */
  background: '#ffffff',
  /** 線の色 */
  line: '#000000',
  /** テキストの色 */
  text: '#000000',
} as const
