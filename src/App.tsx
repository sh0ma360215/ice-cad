import { useState, useRef } from 'react'
import MoldPreview from './components/MoldPreview'
import Drawing2D, { Drawing2DHandle } from './components/Drawing2D'
import TextInput from './components/TextInput'
import { FIXED_PARAMS, VariableParams, defaultVariableParams } from './constants'

function App() {
  const [params, setParams] = useState<VariableParams>(defaultVariableParams)
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d')
  const drawing2DRef = useRef<Drawing2DHandle>(null)

  const handleExport = () => {
    if (viewMode === '2d' && drawing2DRef.current) {
      drawing2DRef.current.exportPNG()
    }
  }

  const updateParam = <K extends keyof VariableParams>(
    key: K,
    value: VariableParams[K]
  ) => {
    setParams((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Left Panel - Controls */}
      <div className="w-96 bg-gray-800 p-6 flex flex-col gap-4 overflow-y-auto">
        <h1 className="text-xl font-bold text-cyan-400">
          Ice CAD
        </h1>
        <p className="text-sm text-gray-400">
          アイス容器金型ジェネレーター
        </p>

        {/* 2D/3D切り替えボタン */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('2d')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              viewMode === '2d'
                ? 'bg-cyan-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            2D 図面
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              viewMode === '3d'
                ? 'bg-cyan-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            3D モデル
          </button>
        </div>

        {/* 固定パラメータ表示 */}
        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-sm font-medium text-gray-400 mb-2">固定パラメータ（規格値）</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-700/50 p-2 rounded">
              <span className="text-gray-400">上部: </span>
              <span className="text-cyan-400">{FIXED_PARAMS.topWidth} × {FIXED_PARAMS.topDepth}</span>
            </div>
            <div className="bg-gray-700/50 p-2 rounded">
              <span className="text-gray-400">底部: </span>
              <span className="text-cyan-400">{FIXED_PARAMS.bottomWidth} × {FIXED_PARAMS.bottomDepth}</span>
            </div>
            <div className="bg-gray-700/50 p-2 rounded">
              <span className="text-gray-400">深さ: </span>
              <span className="text-cyan-400">{FIXED_PARAMS.totalDepth}mm</span>
            </div>
            <div className="bg-gray-700/50 p-2 rounded">
              <span className="text-gray-400">彫り深さ: </span>
              <span className="text-cyan-400">{FIXED_PARAMS.textDepth}mm</span>
            </div>
            <div className="bg-gray-700/50 p-2 rounded">
              <span className="text-gray-400">外勾配: </span>
              <span className="text-cyan-400">{FIXED_PARAMS.outerTaper}°</span>
            </div>
            <div className="bg-gray-700/50 p-2 rounded">
              <span className="text-gray-400">内勾配: </span>
              <span className="text-cyan-400">{FIXED_PARAMS.innerTaper}°</span>
            </div>
          </div>
        </div>

        {/* 可変パラメータ */}
        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-sm font-medium text-gray-400 mb-2">可変パラメータ（意匠）</h3>

          <TextInput
            value={params.text}
            onChange={(text) => updateParam('text', text)}
          />
        </div>

        <div className="space-y-3">
          {/* 配置位置X */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">配置位置 X</span>
              <span className="text-cyan-400 font-mono">{params.offsetX.toFixed(1)}mm</span>
            </div>
            <input
              type="range"
              min={-20}
              max={20}
              step={0.5}
              value={params.offsetX}
              onChange={(e) => updateParam('offsetX', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
                         [&::-webkit-slider-thumb]:appearance-none
                         [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                         [&::-webkit-slider-thumb]:bg-cyan-500 [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>

          {/* 配置位置Y */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">配置位置 Y</span>
              <span className="text-cyan-400 font-mono">{params.offsetY.toFixed(1)}mm</span>
            </div>
            <input
              type="range"
              min={-20}
              max={20}
              step={0.5}
              value={params.offsetY}
              onChange={(e) => updateParam('offsetY', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
                         [&::-webkit-slider-thumb]:appearance-none
                         [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                         [&::-webkit-slider-thumb]:bg-cyan-500 [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>

          {/* スケール */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">スケール</span>
              <span className="text-cyan-400 font-mono">{params.scale}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={150}
              step={5}
              value={params.scale}
              onChange={(e) => updateParam('scale', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
                         [&::-webkit-slider-thumb]:appearance-none
                         [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                         [&::-webkit-slider-thumb]:bg-cyan-500 [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>

          {/* 回転角度 */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">回転角度</span>
              <span className="text-cyan-400 font-mono">{params.rotation}°</span>
            </div>
            <input
              type="range"
              min={-180}
              max={180}
              step={5}
              value={params.rotation}
              onChange={(e) => updateParam('rotation', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
                         [&::-webkit-slider-thumb]:appearance-none
                         [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                         [&::-webkit-slider-thumb]:bg-cyan-500 [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>

          {/* 文字埋め処理 */}
          <div className="border-t border-gray-700 pt-3 mt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">文字埋め処理</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.fillText}
                  onChange={(e) => updateParam('fillText', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
              </label>
            </div>
            {params.fillText && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">オフセット距離</span>
                  <span className="text-cyan-400 font-mono">{params.fillOffset}mm</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={params.fillOffset}
                  onChange={(e) => updateParam('fillOffset', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
                             [&::-webkit-slider-thumb]:appearance-none
                             [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                             [&::-webkit-slider-thumb]:bg-cyan-500 [&::-webkit-slider-thumb]:rounded-full"
                />
              </div>
            )}
          </div>
        </div>

        {/* 出力機能 */}
        <div className="border-t border-gray-700 pt-4 mt-4">
          <h3 className="text-sm font-medium text-gray-400 mb-2">出力</h3>
          <button
            onClick={handleExport}
            className="w-full py-2 px-4 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors"
          >
            {viewMode === '2d' ? 'PNG画像をダウンロード' : '3Dモデル（準備中）'}
          </button>
          <p className="text-xs text-gray-500 mt-2">
            {viewMode === '2d'
              ? '2D図面をPNG画像として保存します'
              : 'STL形式での出力は今後対応予定'}
          </p>
        </div>

        <div className="mt-auto text-xs text-gray-500">
          材料厚: {FIXED_PARAMS.materialThickness}mm
        </div>
      </div>

      {/* Right Panel - View */}
      <div className="flex-1 relative bg-gray-100">
        {viewMode === '2d' ? (
          <Drawing2D ref={drawing2DRef} params={params} />
        ) : (
          <MoldPreview params={params} />
        )}
      </div>
    </div>
  )
}

export default App
