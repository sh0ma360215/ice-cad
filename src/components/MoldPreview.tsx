import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei'
import { VariableParams } from '../constants'
import MoldMesh from './MoldMesh'

interface MoldPreviewProps {
  params: VariableParams
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[20, 20, 20]} />
      <meshStandardMaterial color="#00CED1" wireframe />
    </mesh>
  )
}

export default function MoldPreview({ params }: MoldPreviewProps) {
  return (
    <Canvas
      camera={{ position: [150, 100, 150], fov: 50 }}
      className="bg-gradient-to-b from-gray-700 to-gray-900"
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[50, 50, 50]} intensity={1} castShadow />
      <directionalLight position={[-50, 30, -50]} intensity={0.3} />

      <Suspense fallback={<LoadingFallback />}>
        <MoldMesh params={params} />
      </Suspense>

      <ContactShadows
        position={[0, -30, 0]}
        opacity={0.4}
        scale={200}
        blur={2}
      />

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={50}
        maxDistance={400}
      />

      <Suspense fallback={null}>
        <Environment preset="studio" />
      </Suspense>

      <gridHelper args={[200, 20, '#444444', '#333333']} />
    </Canvas>
  )
}
