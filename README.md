# Ice CAD

アイス容器金型の2D/3D CAD図面を生成するデスクトップアプリケーションです。日本語テキスト（漢字）を入力することで、カスタマイズ可能な技術図面と3Dモデルを生成できます。

## 概要

Ice CADは、アイスキャンディーの金型を設計するためのツールです。地名などの日本語テキスト（例：「鎌倉」「渋谷」）を入力し、パラメータを調整することで、製造に必要な2D図面や3Dモデルをリアルタイムで生成します。

## 主な機能

- **2D CAD図面生成**: 6つの視点（側面断面、上面、正面断面、深度断面、デザイン、底面）を含む技術図面を生成
- **3Dモデル表示**: Three.jsを使用したインタラクティブな3Dプレビュー
- **日本語テキスト対応**: 漢字を含む日本語テキストの垂直レイアウト表示
- **パラメータ調整**: テキストの配置位置、スケール、回転角度などをリアルタイムで調整
- **文字埋め処理**: オプションで文字パスを膨張・統合して視覚的に強調
- **PNG出力**: 2D図面をPNG画像としてエクスポート

## 技術スタック

- **フロントエンド**: React 18 + TypeScript + Vite
- **3Dレンダリング**: Three.js + @react-three/fiber + @react-three/drei
- **フォント処理**: opentype.js（フォントパース）
- **パス処理**: clipper2-js（ポリゴンオフセット/統合）
- **スタイリング**: Tailwind CSS

## セットアップ

### 必要な環境

- Node.js 18以上
- npm または yarn

### インストール手順

1. リポジトリをクローン
```bash
git clone <repository-url>
cd ice-cad
```

2. 依存関係をインストール
```bash
npm install
```

3. 開発サーバーを起動
```bash
npm run dev
```

ブラウザで `http://localhost:5173` を開いてアプリケーションにアクセスできます。

## 開発コマンド

```bash
npm run dev          # 開発サーバーを起動（http://localhost:5173）
npm run build        # 本番用ビルド（TypeScriptコンパイル + Viteビルド）
npm run lint         # ESLintを実行
npm run preview      # 本番ビルドのプレビュー
npm run test         # テストをウォッチモードで実行
npm run test:run     # テストを一度だけ実行
npm run test:coverage # カバレッジレポート付きでテストを実行
```

## プロジェクト構造

```
ice-cad/
├── src/
│   ├── App.tsx              # メインコンポーネント（2D/3D切り替え、パラメータ制御）
│   ├── components/
│   │   ├── Drawing2D.tsx    # Canvas APIを使用した2D CAD図面描画
│   │   ├── MoldPreview.tsx   # Three.jsキャンバスラッパー（OrbitControls、Environment）
│   │   ├── MoldMesh.tsx      # 3Dジオメトリ生成（ExtrudeGeometry）
│   │   └── TextInput.tsx     # テキスト入力コンポーネント
│   ├── constants/
│   │   ├── drawing.ts        # 2D図面関連の定数
│   │   ├── geometry.ts       # ジオメトリ関連の定数
│   │   ├── manufacturing.ts  # 製造パラメータ
│   │   ├── mesh.ts           # メッシュ関連の定数
│   │   └── index.ts          # 定数のエクスポート
│   ├── utils/
│   │   ├── textToShape.ts    # 日本語テキスト→3Dシェイプ変換（フォント処理）
│   │   └── textToShape.test.ts # テストファイル
│   └── main.tsx              # エントリーポイント
├── public/
│   └── fonts/
│       └── NotoSansJP-Bold.otf # 日本語フォント（16.2MB、必須）
└── package.json
```

## 使用方法

1. **テキスト入力**: 左パネルのテキスト入力欄に日本語テキスト（例：「鎌倉」）を入力
2. **パラメータ調整**: 
   - 配置位置 X/Y: テキストの位置を調整（-20mm ～ 20mm）
   - スケール: テキストのサイズを調整（50% ～ 150%）
   - 回転角度: テキストの回転を調整（-180° ～ 180°）
   - 文字埋め処理: オプションで文字パスを膨張・統合
3. **表示モード切り替え**: 「2D 図面」または「3D モデル」ボタンで切り替え
4. **出力**: 2D図面モードで「PNG画像をダウンロード」ボタンからPNG画像を保存

## 製造パラメータ

固定仕様（`FIXED_PARAMS`）:
- 容器寸法: 76.91×113.91mm（外側）、70×107mm（内側）
- キャビティ（テキスト領域）: 57.90×97.30mm
- 深さ: 24.5mm、テキスト深さ: 3mm
- テーパー角度: 8°（外側）、4°（スティック領域）
- コーナー半径: R9.46（外側）、R6（内側）、フランジ幅: 3.455mm

## 技術的な詳細

### フォント処理

日本語テキストから3Dシェイプへの変換は `src/utils/textToShape.ts` で行われます：

1. `opentype.js` を使用して `/fonts/NotoSansJP-Bold.otf` からフォントを読み込み
2. `textToShapes()`: フォントパスコマンド（M/L/C/Q/Z）を `THREE.Shape[]` に変換
3. ベジェ曲線を線分に近似（曲線あたり5セグメント）
4. 時計回り/反時計回りの検出により、漢字文字内の穴を識別
5. オプション: `createFilledMultiCharShapes()` は clipper2-js を使用して文字パスを膨張・統合

### 重要な注意事項

- フォントファイル: `public/fonts/NotoSansJP-Bold.otf`（16.2MB、ローカルファイル必須）
- opentype.jsはTTF、OTF、WOFFのみサポート（WOFF2は非対応）
- 日本語テキストは垂直レンダリング（文字を分割して上から下に配置）
- 穴検出は符号付き面積計算（Shoelace公式）とポイントインポリゴンテスト（レイキャスティング）を使用
- clipper2-jsは整数座標を使用（CLIPPER_SCALE=1000で精度を確保）

## テスト

```bash
# ウォッチモードでテストを実行
npm run test

# テストを一度だけ実行
npm run test:run

# カバレッジレポート付きでテストを実行
npm run test:coverage
```

## デプロイ

### 本番環境: Cloudflare Pages

Ice CADは**Cloudflare Pages**でホスティングされています。

- 🌐 **本番URL**: https://ice-cad.pages.dev
- ✅ **完全無料** - 無制限の帯域幅
- 🚀 **自動デプロイ** - `main`ブランチへのpush/mergeで自動

#### デプロイフロー

```
1. feature ブランチで開発
2. プルリクエスト作成
3. プレビュー環境で確認（自動生成）
4. main にマージ
5. 本番環境に自動デプロイ 🎉
```

#### ローカルで本番ビルドをテスト

```bash
npm run build    # 本番ビルド
npm run preview  # ビルド結果をプレビュー
```

詳細なデプロイガイドについては、[DEPLOYMENT.md](./DEPLOYMENT.md)を参照してください。

## ライセンス

このプロジェクトはプライベートプロジェクトです。

## 開発者向け情報

詳細な開発ガイドについては、`CLAUDE.md` を参照してください。

