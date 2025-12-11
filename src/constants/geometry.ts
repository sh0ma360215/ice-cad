/**
 * ジオメトリ計算用の定数
 */

/** ベジェ曲線近似のセグメント数 */
export const BEZIER_SEGMENTS = 5

/** Clipperライブラリ用のスケール係数（浮動小数点→整数変換） */
export const CLIPPER_SCALE = 1000

/** フォントのURL */
export const FONT_URL = '/fonts/NotoSansJP-Bold.otf'

/** 文字埋め処理のデフォルト設定 */
export const FILL_TEXT_DEFAULTS = {
  /** オフセット距離（mm） */
  offsetDistance: 3,
  /** 小さな穴を除去する閾値 */
  minHoleArea: 100,
} as const

/** 文字サイズ計算の係数 */
export const TEXT_SIZE = {
  /** ボックスに対する最大比率 */
  maxRatio: 0.85,
  /** 文字間隔の係数 */
  spacingFactor: 1.02,
} as const

/** Shapeのポイント取得時の分割数 */
export const SHAPE_POINTS_DIVISIONS = 20
