/**
 * 3Dメッシュ生成用の定数
 */

/** スティック（棒）の寸法 */
export const STICK_DIMENSIONS = {
  /** 幅（mm） */
  width: 10,
  /** 厚さ（mm） */
  height: 2,
  /** 長さ（mm） */
  length: 60,
  /** 角の丸み */
  cornerRadius: 0.5,
} as const

/** アイス本体の3D設定 */
export const ICE_EXTRUDE_SETTINGS = {
  /** ベベルを有効にする */
  bevelEnabled: true,
  /** ベベルの厚さ */
  bevelThickness: 2,
  /** ベベルのサイズ */
  bevelSize: 1.5,
  /** ベベルのセグメント数 */
  bevelSegments: 3,
} as const

/** スティックの位置オフセット（文字の下からの距離） */
export const STICK_OFFSET_Y = 35

/** マテリアルの色 */
export const MESH_COLORS = {
  /** アイス本体の色（ピンク） */
  ice: '#FFB6C1',
  /** スティックの色（ダークグレー） */
  stick: '#2F2F2F',
} as const

/** マテリアルの設定 */
export const MATERIAL_SETTINGS = {
  ice: {
    metalness: 0.1,
    roughness: 0.4,
  },
  stick: {
    metalness: 0.1,
    roughness: 0.6,
  },
} as const
