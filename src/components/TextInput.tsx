interface TextInputProps {
  value: string
  onChange: (value: string) => void
}

export default function TextInput({ value, onChange }: TextInputProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">
        彫り込む文字
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="例: 鎌倉、渋谷、原宿"
        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg
                   text-white text-lg placeholder-gray-500
                   focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
        maxLength={4}
      />
      <p className="text-xs text-gray-500">
        1〜4文字の漢字・ひらがな・カタカナ
      </p>
    </div>
  )
}
