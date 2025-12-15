import * as THREE from 'three'

/**
 * 土台（ベース板）のジオメトリを生成
 * アイスの土台部分（19mm厚の角丸長方形）を作成
 *
 * @param width - 土台の幅（mm）
 * @param length - 土台の長さ（mm）
 * @param depth - 土台の厚み（mm）
 * @param cornerRadius - コーナーの半径（mm）
 * @returns ExtrudeGeometry
 */
export function createBaseGeometry(
  width: number,
  length: number,
  depth: number,
  cornerRadius: number
): THREE.ExtrudeGeometry {
  // 角丸長方形の2D形状を作成
  const shape = new THREE.Shape()
  const w = width / 2
  const l = length / 2
  const r = cornerRadius

  // 角丸長方形のパスを描画
  // 開始点：左下のコーナー後
  shape.moveTo(-w + r, -l)

  // 下辺：左から右へ
  shape.lineTo(w - r, -l)
  // 右下コーナー（二次ベジェ曲線で滑らかに）
  shape.quadraticCurveTo(w, -l, w, -l + r)

  // 右辺：下から上へ
  shape.lineTo(w, l - r)
  // 右上コーナー
  shape.quadraticCurveTo(w, l, w - r, l)

  // 上辺：右から左へ
  shape.lineTo(-w + r, l)
  // 左上コーナー
  shape.quadraticCurveTo(-w, l, -w, l - r)

  // 左辺：上から下へ
  shape.lineTo(-w, -l + r)
  // 左下コーナー
  shape.quadraticCurveTo(-w, -l, -w + r, -l)

  // パスを閉じる
  shape.closePath()

  // Z方向に押し出してジオメトリを生成
  return new THREE.ExtrudeGeometry(shape, {
    depth: depth,
    bevelEnabled: false, // ベベル（面取り）は無効
  })
}
