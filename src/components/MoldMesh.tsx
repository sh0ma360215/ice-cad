import { useMemo, useState, useEffect } from 'react'
import * as THREE from 'three'
import { VariableParams, FIXED_PARAMS } from '../constants'
import {
  BASE_DIMENSIONS,
  STICK_DIMENSIONS,
  ICE_EXTRUDE_SETTINGS,
  STICK_OFFSET_Y,
  MESH_COLORS,
  MATERIAL_SETTINGS,
} from '../constants/mesh'
import { TEXT_SIZE } from '../constants/geometry'
import { Html } from '@react-three/drei'
import { loadFont } from '../utils/font'
import { textToShapes, getTextBounds } from '../utils/geometry'
import { createFilledMultiCharShapes } from '../utils/clipper'
import opentype from 'opentype.js'

interface MoldMeshProps {
  params: VariableParams
}

const F = FIXED_PARAMS

export default function MoldMesh({ params }: MoldMeshProps) {
  const { text, offsetX, offsetY, scale: textScale, rotation, fillText, fillOffset } = params
  const [font, setFont] = useState<opentype.Font | null>(null)
  const [fontError, setFontError] = useState<string | null>(null)

  useEffect(() => {
    loadFont()
      .then(setFont)
      .catch((err) => {
        console.error('Font loading failed:', err)
        setFontError('フォント読み込み失敗')
      })
  }, [])

  // 棒（スティック）の形状
  const stickGeometry = useMemo(() => {
    const { width, height, length, cornerRadius } = STICK_DIMENSIONS

    const shape = new THREE.Shape()
    const sw = width / 2
    const sh = height / 2
    const sr = cornerRadius

    shape.moveTo(-sw + sr, -sh)
    shape.lineTo(sw - sr, -sh)
    shape.quadraticCurveTo(sw, -sh, sw, -sh + sr)
    shape.lineTo(sw, sh - sr)
    shape.quadraticCurveTo(sw, sh, sw - sr, sh)
    shape.lineTo(-sw + sr, sh)
    shape.quadraticCurveTo(-sw, sh, -sw, sh - sr)
    shape.lineTo(-sw, -sh + sr)
    shape.quadraticCurveTo(-sw, -sh, -sw + sr, -sh)

    return new THREE.ExtrudeGeometry(shape, {
      depth: length,
      bevelEnabled: false,
    })
  }, [])

  // 文字の形でアイス本体を作成
  const { iceGeometries, baseGeometries, bottomY } = useMemo(() => {
    if (!font || !text || text.trim().length === 0) {
      return { iceGeometries: [], baseGeometries: [], bottomY: 0 }
    }

    try {
      const chars = text.split('')
      const charCount = chars.length
      const baseFontSize = Math.min(
        F.outerWidth * TEXT_SIZE.maxRatio,
        F.outerLength * TEXT_SIZE.maxRatio / charCount
      )
      const fontSize = baseFontSize * (textScale / 100)
      const spacing = fontSize * TEXT_SIZE.spacingFactor
      const totalHeight = (charCount - 1) * spacing

      // 各文字の位置を計算し、全体のバウンディングボックスを取得
      const charPositions: { x: number; y: number }[] = []
      let minX = Infinity
      let maxX = -Infinity
      let minY = Infinity
      let maxY = -Infinity

      chars.forEach((char, index) => {
        const bounds = getTextBounds(font, char, fontSize)
        const centerX = bounds.xMin + bounds.width / 2
        const centerY = bounds.yMin + bounds.height / 2
        const yPos = totalHeight / 2 - index * spacing

        const posX = -centerX + offsetX
        const posY = -centerY + yPos + offsetY

        charPositions.push({ x: posX, y: posY })

        // バウンディングボックスの更新
        const charMinX = posX + bounds.xMin
        const charMaxX = posX + bounds.xMin + bounds.width
        const charMinY = posY + bounds.yMin
        const charMaxY = posY + bounds.yMin + bounds.height

        if (charMinX < minX) minX = charMinX
        if (charMaxX > maxX) maxX = charMaxX
        if (charMinY < minY) minY = charMinY
        if (charMaxY > maxY) maxY = charMaxY
      })

      let shapes: THREE.Shape[]

      if (fillText) {
        // 文字縁取り処理ON: 全文字をまとめて縁取り（文字間も統合）
        // fillOffset = 縁取りの幅（mm）
        shapes = createFilledMultiCharShapes(font, chars, fontSize, charPositions, fillOffset, 50)
      } else {
        // 文字埋め処理OFF: 各文字を個別に処理
        shapes = []
        chars.forEach((char, index) => {
          const charShapes = textToShapes(font, char, fontSize)
          const pos = charPositions[index]

          charShapes.forEach((shape) => {
            // 位置を適用した新しいShapeを作成
            const movedShape = new THREE.Shape()
            const points = shape.getPoints()
            if (points.length > 0) {
              movedShape.moveTo(points[0].x + pos.x, points[0].y + pos.y)
              for (let i = 1; i < points.length; i++) {
                movedShape.lineTo(points[i].x + pos.x, points[i].y + pos.y)
              }
              movedShape.closePath()

              // 穴も移動
              for (const hole of shape.holes) {
                const movedHole = new THREE.Path()
                const holePoints = hole.getPoints()
                if (holePoints.length > 0) {
                  movedHole.moveTo(holePoints[0].x + pos.x, holePoints[0].y + pos.y)
                  for (let i = 1; i < holePoints.length; i++) {
                    movedHole.lineTo(holePoints[i].x + pos.x, holePoints[i].y + pos.y)
                  }
                  movedHole.closePath()
                  movedShape.holes.push(movedHole)
                }
              }

              shapes.push(movedShape)
            }
          })
        })
      }

      // Shapeをジオメトリに変換
      const geometries: THREE.ExtrudeGeometry[] = []
      shapes.forEach((shape) => {
        const geometry = new THREE.ExtrudeGeometry(shape, {
          depth: F.depthText, // 3mm（文字の厚み）
          ...ICE_EXTRUDE_SETTINGS,
        })
        geometries.push(geometry)
      })

      // 土台のサイズを計算（文字の輪郭を縁取った形）
      // 文字全体を統合して、8mm膨張させる
      const baseMargin = 8 // 余白8mm（文字を一回り大きく）
      const baseShapes = createFilledMultiCharShapes(
        font,
        chars,
        fontSize,
        charPositions,
        baseMargin, // オフセット距離
        50 // minHoleArea
      )

      // 土台ジオメトリを生成（19mm厚）
      const baseDepth = BASE_DIMENSIONS.depth // 19mm
      const baseGeometries: THREE.ExtrudeGeometry[] = []
      baseShapes.forEach((shape) => {
        const geometry = new THREE.ExtrudeGeometry(shape, {
          depth: baseDepth,
          bevelEnabled: false, // 土台はベベルなし
        })
        baseGeometries.push(geometry)
      })

      return {
        iceGeometries: geometries,
        baseGeometries: baseGeometries,
        bottomY: minY
      }
    } catch (err) {
      console.error('Ice geometry generation failed:', err)
      return { iceGeometries: [], baseGeometries: [], bottomY: 0 }
    }
  }, [font, text, textScale, offsetX, offsetY, fillText, fillOffset])

  return (
    <group rotation={[-Math.PI / 2, 0, rotation * Math.PI / 180]}>
      {/* 土台（文字の輪郭に沿った形） - Z=0mm（底面） */}
      {baseGeometries.map((geometry, index) => (
        <mesh key={`base-${index}`} geometry={geometry} position={[0, 0, 0]}>
          <meshStandardMaterial
            color={MESH_COLORS.ice}
            {...MATERIAL_SETTINGS.ice}
          />
        </mesh>
      ))}

      {/* アイス本体（文字の形） - Z=19mm（土台の上） */}
      {iceGeometries.map((geometry, index) => (
        <mesh key={`text-${index}`} geometry={geometry} position={[0, 0, BASE_DIMENSIONS.depth]}>
          <meshStandardMaterial
            color={MESH_COLORS.ice}
            {...MATERIAL_SETTINGS.ice}
          />
        </mesh>
      ))}

      {/* 棒（スティック）- 文字の下、土台の底面から */}
      {iceGeometries.length > 0 && (
        <mesh
          geometry={stickGeometry}
          position={[0, bottomY - STICK_OFFSET_Y, -STICK_DIMENSIONS.length / 2]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <meshStandardMaterial color={MESH_COLORS.stick} {...MATERIAL_SETTINGS.stick} />
        </mesh>
      )}

      {/* 読み込み状態 */}
      {!font && !fontError && (
        <Html position={[0, 0, 30]} center>
          <div className="text-white text-sm bg-black/70 px-3 py-1 rounded">
            フォント読み込み中...
          </div>
        </Html>
      )}
      {fontError && (
        <Html position={[0, 0, 30]} center>
          <div className="text-red-400 text-sm bg-black/70 px-3 py-1 rounded">
            {fontError}
          </div>
        </Html>
      )}
    </group>
  )
}
