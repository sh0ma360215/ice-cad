import { useMemo, useState, useEffect } from 'react'
import * as THREE from 'three'
import { VariableParams, FIXED_PARAMS } from '../constants'
import { Html } from '@react-three/drei'
import { loadFont, textToShapes, getTextBounds } from '../utils/textToShape'
import opentype from 'opentype.js'

interface MoldMeshProps {
  params: VariableParams
}

const F = FIXED_PARAMS

export default function MoldMesh({ params }: MoldMeshProps) {
  const { text, offsetX, offsetY, scale: textScale, rotation } = params
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
    const stickWidth = 10
    const stickHeight = 2
    const stickLength = 60  // 棒の長さを長く

    const shape = new THREE.Shape()
    const sw = stickWidth / 2
    const sh = stickHeight / 2
    const sr = 0.5

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
      depth: stickLength,
      bevelEnabled: false,
    })
  }, [])

  // 文字の形でアイス本体を作成
  const { iceGeometries, bottomY } = useMemo(() => {
    if (!font || !text || text.trim().length === 0) {
      return { iceGeometries: [], bottomY: 0 }
    }

    try {
      const chars = text.split('')
      const charCount = chars.length
      const baseFontSize = Math.min(F.topWidth * 0.85, F.topDepth * 0.85 / charCount)
      const fontSize = baseFontSize * (textScale / 100)
      const spacing = fontSize * 1.02
      const totalHeight = (charCount - 1) * spacing

      const geometries: THREE.ExtrudeGeometry[] = []
      let minY = Infinity

      chars.forEach((char, index) => {
        const shapes = textToShapes(font, char, fontSize)
        const bounds = getTextBounds(font, char, fontSize)

        const centerX = bounds.xMin + bounds.width / 2
        const centerY = bounds.yMin + bounds.height / 2
        const yPos = totalHeight / 2 - index * spacing

        // この文字の最下部を追跡
        const charBottomY = yPos - bounds.height / 2
        if (charBottomY < minY) minY = charBottomY

        shapes.forEach((shape) => {
          // 文字の形でアイス本体を押し出し
          const geometry = new THREE.ExtrudeGeometry(shape, {
            depth: F.totalDepth,
            bevelEnabled: true,
            bevelThickness: 2,
            bevelSize: 1.5,
            bevelSegments: 3,
          })

          // 位置調整
          geometry.translate(-centerX + offsetX, -centerY + yPos + offsetY, 0)
          geometries.push(geometry)
        })
      })

      return { iceGeometries: geometries, bottomY: minY + offsetY }
    } catch (err) {
      console.error('Ice geometry generation failed:', err)
      return { iceGeometries: [], bottomY: 0 }
    }
  }, [font, text, textScale, offsetX, offsetY])

  const iceColor = '#FFB6C1'  // ピンク色（実際のアイスに近い色）
  const stickColor = '#2F2F2F' // 棒の色（黒っぽい色）

  return (
    <group rotation={[-Math.PI / 2, 0, rotation * Math.PI / 180]}>
      {/* アイス本体（文字の形） */}
      {iceGeometries.map((geometry, index) => (
        <mesh key={index} geometry={geometry} position={[0, 0, 0]}>
          <meshStandardMaterial
            color={iceColor}
            metalness={0.1}
            roughness={0.4}
          />
        </mesh>
      ))}

      {/* 棒（スティック）- 文字の下から */}
      {iceGeometries.length > 0 && (
        <mesh
          geometry={stickGeometry}
          position={[0, bottomY - 35, F.totalDepth / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <meshStandardMaterial color={stickColor} metalness={0.1} roughness={0.6} />
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
