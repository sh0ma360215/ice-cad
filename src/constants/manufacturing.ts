/**
 * 製造パラメータ（製造規格で変わらない - 図面から完全抽出）
 */
export const FIXED_PARAMS = {
  // --- A. 外形・全体寸法 (Overall Dimensions) ---
  outerWidth: 76.91,       // [E-F列] 上面図・正面図の全幅
  outerLength: 113.91,     // [C-D列] 右側面の全長
  totalHeight: 24.60,      // [B列] 底面図・側面図の総高さ（フランジ面〜底面）

  // --- B. 容器内径寸法 (Inner Dimensions) ---
  innerWidth: 70.00,       // [E列] フランジ内側の幅
  innerLength: 107.00,     // [D列] フランジ内側の長さ

  // --- C. キャビティ（製品形状）寸法 (Cavity Dimensions) ---
  cavityWidth: 57.90,      // [E列] 文字・製品が入るエリアの最大幅
  cavityLength: 97.30,     // [D列] 文字・製品が入るエリアの最大長

  // --- D. 深さ・Z軸方向 (Depth / Z-Axis) ---
  depthInner: 24.50,       // [E列] 容器内深さ (フランジ面基準)
  depthStep: 21.50,        // [E列] 段差までの深さ
  depthText: 3.00,         // [E列] 文字部分の彫り込み深さ

  // --- E. スティック挿入部 (Stick Slot) ---
  stickSlotWidth: 14.00,   // [B列] 下部スリット全幅
  stickSlotHalf: 7.00,     // [B列] 中心からのスリット幅
  stickSlotHeight: 12.00,  // [B列] スティック部の構造高さ

  // --- F. R・フィレット (Radii) ---
  outerR: 9.46,            // [E列] 外側コーナーR
  innerR: 6.00,            // [E列] 内側コーナーR

  // --- G. 勾配・角度 (Draft Angles) ---
  draftAngleSide: 8,       // [F列] 左側面図：側面勾配 8°
  draftAngleStick: 4,      // [D列] 左側面図：スティック部勾配 4°

  // --- H. 詳細・補足寸法 (Details) ---
  flangeWidth: 3.455,      // 計算値: (76.91-70)/2
  flangeIndicated: 3.40,   // [B列右下] フランジ幅の図面指示値
  offsetCorner: 1.72,      // [C列中央] 断面図左下の微小オフセット

  materialThickness: 0.1,  // [B列] 材料厚

  // --- 互換用エイリアス（既存コード用） ---
  topWidth: 76.91,         // = outerWidth
  topDepth: 113.91,        // = outerLength
  bottomWidth: 70.00,      // = innerWidth
  bottomDepth: 107.00,     // = innerLength
  totalDepth: 24.50,       // = depthInner
  textDepth: 3.00,         // = depthText
  outerTaper: 8,           // = draftAngleSide
  innerTaper: 4,           // = draftAngleStick
  cornerR: 6.00,           // = innerR
} as const

/** 可変パラメータ（地名ごとに変わる） */
export interface VariableParams {
  /** 文字内容 */
  text: string
  /** 配置位置X（mm、中央基準） */
  offsetX: number
  /** 配置位置Y（mm、中央基準） */
  offsetY: number
  /** スケール（%） */
  scale: number
  /** 回転角度（度） */
  rotation: number
  /** 文字埋め処理のON/OFF */
  fillText: boolean
  /** 文字埋めのオフセット距離（mm） */
  fillOffset: number
}

/** デフォルトの可変パラメータ */
export const defaultVariableParams: VariableParams = {
  text: '鎌倉',
  offsetX: 0,
  offsetY: 0,
  scale: 100,
  rotation: 0,
  fillText: false,
  fillOffset: 3,
}
