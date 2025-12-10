import { MoldParameters } from '../App'

interface ParameterSlidersProps {
  params: MoldParameters
  onUpdate: <K extends keyof MoldParameters>(key: K, value: MoldParameters[K]) => void
}

interface SliderConfig {
  key: keyof MoldParameters
  label: string
  min: number
  max: number
  step: number
  unit: string
}

const sliders: SliderConfig[] = [
  { key: 'width', label: '幅', min: 40, max: 100, step: 0.1, unit: 'mm' },
  { key: 'height', label: '高さ', min: 60, max: 150, step: 0.1, unit: 'mm' },
  { key: 'depth', label: '深さ', min: 10, max: 40, step: 0.1, unit: 'mm' },
  { key: 'textDepth', label: '文字深さ', min: 5, max: 20, step: 0.1, unit: 'mm' },
  { key: 'taperAngle', label: 'テーパー角度', min: 0, max: 15, step: 0.5, unit: '°' },
]

export default function ParameterSliders({ params, onUpdate }: ParameterSlidersProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-300">パラメータ</h3>

      {sliders.map((slider) => (
        <div key={slider.key} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">{slider.label}</span>
            <span className="text-cyan-400 font-mono">
              {(params[slider.key] as number).toFixed(1)}{slider.unit}
            </span>
          </div>
          <input
            type="range"
            min={slider.min}
            max={slider.max}
            step={slider.step}
            value={params[slider.key] as number}
            onChange={(e) => onUpdate(slider.key, parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none
                       [&::-webkit-slider-thumb]:w-4
                       [&::-webkit-slider-thumb]:h-4
                       [&::-webkit-slider-thumb]:bg-cyan-500
                       [&::-webkit-slider-thumb]:rounded-full
                       [&::-webkit-slider-thumb]:cursor-pointer
                       [&::-webkit-slider-thumb]:hover:bg-cyan-400"
          />
        </div>
      ))}
    </div>
  )
}
