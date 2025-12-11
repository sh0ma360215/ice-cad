# Ice CAD リファクタリング計画

## 現状分析

### ファイル規模
| ファイル | 行数 | 状態 |
|---------|------|------|
| Drawing2D.tsx | 1069 | 🔴 要分割 |
| textToShape.ts | 486 | 🟡 要分割 |
| App.tsx | 252 | 🟡 要整理 |
| MoldMesh.tsx | 195 | 🟢 適正 |
| constants.ts | 72 | 🟢 適正 |
| MoldPreview.tsx | 56 | 🟢 適正 |
| TextInput.tsx | 27 | 🟢 適正 |

### 主要な問題点
1. **Drawing2D.tsx が巨大** - 描画ロジックがすべて1ファイル
2. **テストなし** - 単体テスト、E2Eテスト一切なし
3. **マジックナンバー散在** - 意味不明な数値がハードコード
4. **重複コード** - スライダー、パス描画処理など
5. **console.log残存** - 本番環境で不要
6. **エラーハンドリング不足** - ユーザーへの通知なし

---

## フェーズ1: 基盤整備（リスク低・効果高）

### 1.1 テスト環境構築
**目的**: 安全にリファクタリングを進めるための基盤

**タスク**:
- [ ] Vitest + React Testing Library 導入
- [ ] `textToShape.ts` の単体テスト作成（最優先）
  - `isClockwise()` のテスト
  - `textToShapes()` のテスト
  - `createFilledMultiCharShapes()` のテスト
- [ ] テストカバレッジ設定

**追加パッケージ**:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitest/coverage-v8
```

**推定作業量**: 小

---

### 1.2 マジックナンバー定数化
**目的**: コードの可読性・保守性向上

**対象箇所**:
```typescript
// Drawing2D.tsx
const mainScale = 3.2        // → DRAWING_SCALE
const baseX = 200            // → LAYOUT.baseX
const baseY = 250            // → LAYOUT.baseY
canvas.width = 1400          // → CANVAS.width
canvas.height = 900          // → CANVAS.height

// MoldMesh.tsx
const stickWidth = 10        // → STICK_DIMENSIONS.width
const stickHeight = 2        // → STICK_DIMENSIONS.height
const stickLength = 60       // → STICK_DIMENSIONS.length

// textToShape.ts
const CLIPPER_SCALE = 1000   // ✓ 既に定数化済み
segments: 5                  // → BEZIER_SEGMENTS
```

**新規ファイル**: `src/constants/drawing.ts`

**推定作業量**: 小

---

### 1.3 console.log 削除・ロガー導入
**目的**: 本番環境でのデバッグ情報制御

**タスク**:
- [ ] `textToShape.ts:301-311` の console.log 削除
- [ ] 開発時のみ有効なロガーユーティリティ作成（オプション）

**推定作業量**: 極小

---

## フェーズ2: コード分割（リスク中・効果高）

### 2.1 Drawing2D.tsx の分割
**目的**: 1069行 → 各200行以下に分割

**現在の構造**:
```
Drawing2D.tsx (1069行)
├── drawBorder()           (43行)
├── drawSideSection()      (74行)
├── drawTopView()         (121行)
├── drawFrontSection()    (121行)
├── drawDepthSection()     (91行)
├── drawDesignView()       (45行)
├── drawBottomView()      (129行)
├── drawTitleBlock()       (49行)
├── drawTextWithHatching() (86行)
├── drawTextOutlineInView()(62行)
├── roundedRect()          (18行)
├── drawDimensionH()       (21行)
├── drawDimensionV()       (24行)
├── drawArrowH()           (15行)
└── drawArrowV()           (14行)
```

**提案する新構造**:
```
src/
├── components/
│   └── Drawing2D/
│       ├── index.tsx              # メインコンポーネント（100行）
│       ├── Drawing2D.types.ts     # 型定義
│       └── hooks/
│           └── useDrawing.ts      # Canvas描画ロジック
├── utils/
│   └── drawing/
│       ├── index.ts               # エクスポート
│       ├── border.ts              # drawBorder
│       ├── sections.ts            # drawSideSection, drawFrontSection, etc.
│       ├── views.ts               # drawTopView, drawDesignView, etc.
│       ├── dimensions.ts          # drawDimensionH, drawDimensionV, arrows
│       ├── text.ts                # drawTextWithHatching, drawTextOutlineInView
│       └── primitives.ts          # roundedRect
```

**推定作業量**: 中

---

### 2.2 textToShape.ts の分割
**目的**: 486行 → 各150行以下に分割

**提案する新構造**:
```
src/utils/
├── font/
│   ├── index.ts           # エクスポート
│   ├── loader.ts          # loadFont()
│   └── types.ts           # 型定義
├── geometry/
│   ├── index.ts           # エクスポート
│   ├── bezier.ts          # approximateCubicBezier, approximateQuadraticBezier
│   ├── polygon.ts         # isClockwise, getCenter, isPointInPolygon
│   └── shape.ts           # textToShapes, getTextBounds
└── clipper/
    ├── index.ts           # エクスポート
    ├── converter.ts       # shapesToClipperPaths, clipperPathsToShapes
    └── operations.ts      # createFilledTextShapes, createFilledMultiCharShapes
```

**推定作業量**: 中

---

## フェーズ3: 品質向上（リスク低・効果中）

### 3.1 共通コンポーネント抽出
**目的**: 重複コードの削減

**対象**:
```typescript
// App.tsx の4つのスライダーを共通化
// 現在: 各15行 × 4 = 60行の重複

// 新コンポーネント
interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (value: number) => void
}

// src/components/ui/Slider.tsx
```

**推定作業量**: 小

---

### 3.2 エラーバウンダリ実装
**目的**: エラー時のユーザー体験向上

**タスク**:
- [ ] `src/components/ErrorBoundary.tsx` 作成
- [ ] Canvas描画エラーのキャッチ
- [ ] Three.jsレンダリングエラーのキャッチ
- [ ] フォント読み込みエラーの適切な表示

**推定作業量**: 小

---

### 3.3 型安全性強化
**目的**: ランタイムエラーの防止

**タスク**:
- [ ] `as const` の活用確認
- [ ] `unknown` 型の適切な使用
- [ ] Zod/Yup によるランタイムバリデーション（オプション）

**推定作業量**: 小

---

## フェーズ4: 追加機能（リスク中・効果高）

### 4.1 STL エクスポート機能
**目的**: 3Dモデルの活用拡大

**タスク**:
- [ ] three-stdlib または自作でSTLExporter実装
- [ ] MoldMesh からジオメトリを取得
- [ ] ダウンロード機能

**追加パッケージ**:
```bash
npm install three-stdlib
```

**推定作業量**: 中

---

## 実行順序（推奨）

```
Week 1: フェーズ1（基盤整備）
├── 1.1 テスト環境構築
├── 1.2 マジックナンバー定数化
└── 1.3 console.log削除

Week 2-3: フェーズ2（コード分割）
├── 2.1 Drawing2D.tsx の分割
└── 2.2 textToShape.ts の分割

Week 4: フェーズ3（品質向上）
├── 3.1 共通コンポーネント抽出
├── 3.2 エラーバウンダリ実装
└── 3.3 型安全性強化

Week 5+: フェーズ4（追加機能）
└── 4.1 STLエクスポート機能
```

---

## スモールスタート: 最初の1歩

**推奨開始タスク**: 1.1 テスト環境構築

理由:
1. 他のリファクタリングの安全網になる
2. 既存コードを壊すリスクがゼロ
3. `textToShape.ts` は純粋関数が多くテストしやすい
4. 成果が目に見えやすい（カバレッジレポート）

---

## 成功指標

| 指標 | 現在 | 目標 |
|------|------|------|
| 最大ファイル行数 | 1069行 | 300行以下 |
| テストカバレッジ | 0% | 60%以上 |
| TypeScript strict | 有効 | 維持 |
| console.log | 2箇所 | 0 |
| ESLint警告 | 未確認 | 0 |
