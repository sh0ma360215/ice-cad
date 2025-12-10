// 固定パラメータ（製造規格で変わらない）
export const FIXED_PARAMS = {
  topWidth: 76.91,      // 外形上部幅
  topDepth: 113.91,     // 外形上部奥行
  bottomWidth: 70.00,   // 外形底部幅
  bottomDepth: 107.00,  // 外形底部奥行
  totalDepth: 24.50,    // 容器全体深さ
  textDepth: 3.00,      // 文字彫り深さ
  outerTaper: 8,        // 側面勾配（外）度
  innerTaper: 4,        // 側面勾配（内）度
  cornerR: 6.00,        // コーナーR
  flangeWidth: 7.00,    // フランジ幅
  materialThickness: 0.1, // 材料厚
}

// 可変パラメータ（地名ごとに変わる）
export interface VariableParams {
  text: string          // 文字内容
  offsetX: number       // 配置位置X（mm、中央基準）
  offsetY: number       // 配置位置Y（mm、中央基準）
  scale: number         // スケール（%）
  rotation: number      // 回転角度（度）
}

export const defaultVariableParams: VariableParams = {
  text: '鎌倉',
  offsetX: 0,
  offsetY: 0,
  scale: 100,
  rotation: 0,
}
