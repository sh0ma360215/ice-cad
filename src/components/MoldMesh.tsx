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

  // 容器の外形（台形）を生成
  const containerGeometry = useMemo(() => {
    const shape = new THREE.Shape()
    const r = F.cornerR

    // 上面の形状（角丸四角形）
    const w = F.topWidth / 2
    const h = F.topDepth / 2

    shape.moveTo(-w + r, -h)
    shape.lineTo(w - r, -h)
    shape.quadraticCurveTo(w, -h, w, -h + r)
    shape.lineTo(w, h - r)
    shape.quadraticCurveTo(w, h, w - r, h)
    shape.lineTo(-w + r, h)
    shape.quadraticCurveTo(-w, h, -w, h - r)
    shape.lineTo(-w, -h + r)
    shape.quadraticCurveTo(-w, -h, -w + r, -h)

    // 押し出し設定（テーパー付き）
    const extrudeSettings = {
      depth: F.totalDepth,
      bevelEnabled: false,
    }

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)

    return geometry
  }, [])

  // フランジ部分
  const flangeGeometry = useMemo(() => {
    const shape = new THREE.Shape()
    const r = F.cornerR + F.flangeWidth * 0.5

    const w = (F.topWidth + F.flangeWidth * 2) / 2
    const h = (F.topDepth + F.flangeWidth * 2) / 2

    shape.moveTo(-w + r, -h)
    shape.lineTo(w - r, -h)
    shape.quadraticCurveTo(w, -h, w, -h + r)
    shape.lineTo(w, h - r)
    shape.quadraticCurveTo(w, h, w - r, h)
    shape.lineTo(-w + r, h)
    shape.quadraticCurveTo(-w, h, -w, h - r)
    shape.lineTo(-w, -h + r)
    shape.quadraticCurveTo(-w, -h, -w + r, -h)

    // 内側の穴
    const hole = new THREE.Path()
    const wi = F.topWidth / 2
    const hi = F.topDepth / 2
    const ri = F.cornerR

    hole.moveTo(-wi + ri, -hi)
    hole.lineTo(wi - ri, -hi)
    hole.quadraticCurveTo(wi, -hi, wi, -hi + ri)
    hole.lineTo(wi, hi - ri)
    hole.quadraticCurveTo(wi, hi, wi - ri, hi)
    hole.lineTo(-wi + ri, hi)
    hole.quadraticCurveTo(-wi, hi, -wi, hi - ri)
    hole.lineTo(-wi, -hi + ri)
    hole.quadraticCurveTo(-wi, -hi, -wi + ri, -hi)

    shape.holes.push(hole)

    return new THREE.ExtrudeGeometry(shape, {
      depth: 2,
      bevelEnabled: false,
    })
  }, [])

  // テキストの3D形状
  const textGeometries = useMemo(() => {
    if (!font || !text || text.trim().length === 0) return []

    try {
      const chars = text.split('')
      const charCount = chars.length
      // 文字サイズを大きく（端ギリギリまで）
      const baseFontSize = Math.min(F.topWidth * 0.85, F.topDepth * 0.85 / charCount)
      const fontSize = baseFontSize * (textScale / 100)
      const spacing = fontSize * 1.05
      const totalHeight = (charCount - 1) * spacing

      const geometries: THREE.ExtrudeGeometry[] = []

      chars.forEach((char, index) => {
        const shapes = textToShapes(font, char, fontSize)
        const bounds = getTextBounds(font, char, fontSize)

        const centerX = bounds.xMin + bounds.width / 2
        const centerY = bounds.yMin + bounds.height / 2
        const yPos = totalHeight / 2 - index * spacing

        shapes.forEach((shape) => {
          const geometry = new THREE.ExtrudeGeometry(shape, {
            depth: F.textDepth,
            bevelEnabled: true,
            bevelThickness: 0.3,
            bevelSize: 0.2,
            bevelSegments: 2,
          })

          // 位置調整
          geometry.translate(-centerX + offsetX, -centerY + yPos + offsetY, 0)

          geometries.push(geometry)
        })
      })

      return geometries
    } catch (err) {
      console.error('Text geometry generation failed:', err)
      return []
    }
  }, [font, text, textScale, offsetX, offsetY])

  const moldColor = '#00CED1'
  const textColor = '#008B8B'

  return (
    <group rotation={[-Math.PI / 2, 0, rotation * Math.PI / 180]}>
      {/* フランジ */}
      <mesh geometry={flangeGeometry} position={[0, 0, 0]}>
        <meshStandardMaterial color={moldColor} metalness={0.3} roughness={0.4} />
      </mesh>

      {/* 容器本体 */}
      <mesh geometry={containerGeometry} position={[0, 0, -F.totalDepth]}>
        <meshStandardMaterial color={moldColor} metalness={0.3} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>

      {/* テキスト */}
      {textGeometries.map((geometry, index) => (
        <mesh key={index} geometry={geometry} position={[0, 0, 1]}>
          <meshStandardMaterial color={textColor} metalness={0.2} roughness={0.5} />
        </mesh>
      ))}

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
