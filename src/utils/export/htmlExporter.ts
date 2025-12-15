import * as THREE from 'three'

/**
 * Three.jsシーンをインタラクティブなスタンドアロンHTMLファイルとしてエクスポート
 * ブラウザでくるくる回せる3Dモデルを生成
 *
 * @param scene - Three.jsシーン
 * @param camera - カメラ
 * @param filename - ファイル名（拡張子なし）
 */
export function exportInteractiveHTML(
  scene: THREE.Scene,
  camera: THREE.Camera,
  filename: string
): void {
  // シーンデータを抽出
  const sceneData = extractSceneData(scene, camera)

  // HTMLテンプレートを生成
  const html = generateHTML(filename, sceneData)

  // ダウンロード
  downloadHTML(html, `${filename}_3Dモデル.html`)
}

/**
 * シーンからデータを抽出
 */
function extractSceneData(scene: THREE.Scene, camera: THREE.Camera) {
  const perspectiveCamera = camera as THREE.PerspectiveCamera
  const data = {
    camera: {
      fov: perspectiveCamera.fov || 50,
      near: perspectiveCamera.near || 0.1,
      far: perspectiveCamera.far || 1000,
      position: camera.position.toArray(),
    },
    lights: [] as Array<{
      type: string
      color: number
      intensity: number
      position?: number[]
    }>,
    meshes: [] as Array<{
      position: number[]
      normal: number[] | null
      index: number[] | null
      material: {
        color: number
        metalness: number
        roughness: number
      }
      meshPosition: number[]
      meshRotation: number[]
    }>,
  }

  // ライトを抽出
  scene.traverse((object) => {
    if (object instanceof THREE.AmbientLight) {
      data.lights.push({
        type: 'ambient',
        color: object.color.getHex(),
        intensity: object.intensity,
      })
    } else if (object instanceof THREE.DirectionalLight) {
      data.lights.push({
        type: 'directional',
        color: object.color.getHex(),
        intensity: object.intensity,
        position: object.position.toArray(),
      })
    }
  })

  // メッシュを抽出（ワールド座標系での位置・回転を使用）
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh && object.geometry) {
      const geometry = object.geometry
      const material = object.material as THREE.MeshStandardMaterial

      // BufferGeometryからデータを抽出
      const positionAttr = geometry.attributes.position
      const normalAttr = geometry.attributes.normal
      const indexAttr = geometry.index

      // ワールド座標系での位置と回転を取得
      const worldPosition = new THREE.Vector3()
      const worldQuaternion = new THREE.Quaternion()
      const worldScale = new THREE.Vector3()
      object.getWorldPosition(worldPosition)
      object.getWorldQuaternion(worldQuaternion)
      object.getWorldScale(worldScale)

      // QuaternionをEuler角に変換
      const euler = new THREE.Euler().setFromQuaternion(worldQuaternion)

      data.meshes.push({
        position: Array.from(positionAttr.array),
        normal: normalAttr ? Array.from(normalAttr.array) : null,
        index: indexAttr ? Array.from(indexAttr.array) : null,
        material: {
          color: material.color.getHex(),
          metalness: material.metalness || 0,
          roughness: material.roughness || 0.5,
        },
        meshPosition: worldPosition.toArray(),
        meshRotation: [euler.x, euler.y, euler.z],
      })
    }
  })

  return data
}

/**
 * HTMLテンプレートを生成
 */
function generateHTML(title: string, sceneData: any): string {
  // JSONを圧縮（小数点以下2桁に丸める）
  const compressedData = compressSceneData(sceneData)

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - 3Dモデル</title>
  <script type="importmap">
    {
      "imports": {
        "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
        "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"
      }
    }
  </script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      overflow: hidden;
      background: #1a1a1a;
    }
    canvas {
      display: block;
    }
    #info {
      position: absolute;
      top: 20px;
      left: 20px;
      color: white;
      background: rgba(0, 0, 0, 0.7);
      padding: 15px 20px;
      border-radius: 8px;
      font-size: 14px;
      line-height: 1.6;
      backdrop-filter: blur(10px);
      pointer-events: none;
      z-index: 1000;
    }
    #info h3 {
      margin: 0 0 10px 0;
      font-size: 18px;
      font-weight: 600;
    }
    #info p {
      margin: 0;
      opacity: 0.9;
    }
    #loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-size: 18px;
      background: rgba(0, 0, 0, 0.8);
      padding: 20px 40px;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <div id="loading">読み込み中...</div>
  <div id="info">
    <h3>${escapeHtml(title)}</h3>
    <p>
      <strong>操作方法:</strong><br>
      マウスドラッグ: 回転<br>
      ホイール: ズーム<br>
      右クリックドラッグ: パン
    </p>
  </div>

  <script type="module">
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

    // シーンデータ
    const sceneData = ${JSON.stringify(compressedData)};

    // Three.js初期化
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf3f4f6);

    // カメラ
    const camera = new THREE.PerspectiveCamera(
      sceneData.camera.fov,
      window.innerWidth / window.innerHeight,
      sceneData.camera.near,
      sceneData.camera.far
    );
    camera.position.fromArray(sceneData.camera.position);

    // レンダラー
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // ライト
    sceneData.lights.forEach(light => {
      if (light.type === 'ambient') {
        const ambientLight = new THREE.AmbientLight(light.color, light.intensity);
        scene.add(ambientLight);
      } else if (light.type === 'directional') {
        const dirLight = new THREE.DirectionalLight(light.color, light.intensity);
        dirLight.position.fromArray(light.position);
        dirLight.castShadow = true;
        scene.add(dirLight);
      }
    });

    // メッシュ
    sceneData.meshes.forEach(meshData => {
      const geometry = new THREE.BufferGeometry();

      // 頂点データ
      geometry.setAttribute('position',
        new THREE.BufferAttribute(new Float32Array(meshData.position), 3));

      // 法線データ
      if (meshData.normal) {
        geometry.setAttribute('normal',
          new THREE.BufferAttribute(new Float32Array(meshData.normal), 3));
      } else {
        geometry.computeVertexNormals();
      }

      // インデックス
      if (meshData.index) {
        geometry.setIndex(meshData.index);
      }

      // マテリアル
      const material = new THREE.MeshStandardMaterial({
        color: meshData.material.color,
        metalness: meshData.material.metalness,
        roughness: meshData.material.roughness
      });

      // メッシュ
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.fromArray(meshData.meshPosition);
      mesh.rotation.fromArray(meshData.meshRotation);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      scene.add(mesh);
    });

    // グリッド
    const gridHelper = new THREE.GridHelper(200, 20, 0x888888, 0xcccccc);
    gridHelper.position.y = -50;
    scene.add(gridHelper);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 50;
    controls.maxDistance = 400;

    // ローディング非表示
    document.getElementById('loading').style.display = 'none';

    // アニメーション
    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // リサイズ対応
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  </script>
</body>
</html>`
}

/**
 * シーンデータを圧縮（小数点以下2桁に丸める）
 */
function compressSceneData(data: any): any {
  const round = (num: number) => Math.round(num * 100) / 100

  return {
    camera: {
      ...data.camera,
      position: data.camera.position.map(round),
    },
    lights: data.lights.map((light: any) => ({
      ...light,
      position: light.position ? light.position.map(round) : undefined,
    })),
    meshes: data.meshes.map((mesh: any) => ({
      position: mesh.position.map(round),
      normal: mesh.normal ? mesh.normal.map(round) : null,
      index: mesh.index,
      material: mesh.material,
      meshPosition: mesh.meshPosition.map(round),
      meshRotation: mesh.meshRotation.map(round),
    })),
  }
}

/**
 * HTMLをダウンロード
 */
function downloadHTML(html: string, filename: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * HTML文字列をエスケープ
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
