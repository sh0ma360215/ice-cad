# Ice CAD デプロイガイド

## デプロイ先: Cloudflare Pages

Ice CADは**Cloudflare Pages**で運用しています。

### なぜCloudflare Pages？

- ✅ **完全無料** - 無制限の帯域幅
- ✅ **高速CDN** - 世界中に配信拠点
- ✅ **簡単デプロイ** - GitHubと連携、自動ビルド
- ✅ **大容量対応** - 17MBフォントファイルでも問題なし

### コスト

- **月額**: $0（完全無料）
- **帯域**: 無制限
- **ビルド**: 500回/月まで無料

---

## デプロイ済み環境

### 本番環境
- **URL**: https://ice-cad.pages.dev
- **トリガー**: `main`ブランチへのpush/merge
- **自動デプロイ**: 有効

### プレビュー環境
- **URL**: `https://[commit-hash].ice-cad.pages.dev`
- **トリガー**: プルリクエストの作成/更新
- **自動デプロイ**: 有効

---

## ビルド設定

Cloudflare Pagesダッシュボードで設定済み：

```
Framework preset: React (Vite)
Build command: npm run build
Build output directory: dist
Root directory: /
Node.js version: 18 (package.jsonのenginesで指定)
```

---

## デプロイフロー

### 本番デプロイ

```
1. ローカルで開発・テスト
   npm run dev

2. プルリクエスト作成
   git checkout -b feature/xxx
   git push origin feature/xxx

3. プレビュー環境で確認
   https://[commit-hash].ice-cad.pages.dev

4. mainブランチにマージ
   GitHub UIでMerge

5. 本番環境に自動デプロイ 🚀
   https://ice-cad.pages.dev
```

### ローカルで本番ビルドをテスト

```bash
# 本番ビルド
npm run build

# ビルド結果をプレビュー
npm run preview
# → http://localhost:4173
```

---

## トラブルシューティング

### ビルドエラーが発生した場合

1. **ローカルでビルドテスト**
   ```bash
   npm run build
   ```

2. **Node.jsバージョン確認**
   - ローカル: Node.js 18以上
   - Cloudflare Pages: 自動的に18を使用

3. **依存関係の再インストール**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

4. **Cloudflareのビルドログを確認**
   - Cloudflare Pagesダッシュボード → Deployments → ビルドログ

### フォント読み込みエラー

- `public/fonts/NotoSansJP-Bold.otf`が正しく配置されているか確認
- ブラウザのNetwork tabでフォントファイルのパスを確認
- パス: `/fonts/NotoSansJP-Bold.otf`（絶対パス）

### 大容量アセット警告

```
(!) Some chunks are larger than 500 kB after minification.
```

→ **無視してOK**（フォントファイル17MBは必須アセット）

---

## パフォーマンス

### 現在の転送サイズ

- **HTML**: 0.5 KB (gzip: 0.37 KB)
- **CSS**: 13 KB (gzip: 3.2 KB)
- **JavaScript**: 1.3 MB (gzip: 374 KB)
- **フォント**: 17 MB
- **合計**: 約18 MB

### 最適化済み

- ✅ Cloudflare自動圧縮（Brotli/Gzip）有効
- ✅ CDNキャッシング有効
- ✅ HTTPSデフォルト

### 将来的な最適化案

#### 1. フォントのサブセット化
```bash
# 必要な文字だけ抽出
pyftsubset NotoSansJP-Bold.otf \
  --text="鎌倉渋谷..." \
  --output-file="NotoSansJP-Bold-subset.otf"
```
**効果**: 17MB → 1-2MB

#### 2. Code Splitting
```typescript
// 動的インポート
const MoldMesh = lazy(() => import('./components/MoldMesh'))
```
**効果**: 初期ロード時間短縮

---

## 新しい環境を作る場合

別のCloudflare Pagesプロジェクトを作成する手順：

### 1. Cloudflareダッシュボード

https://dash.cloudflare.com/ → Pages → Create a project

### 2. GitHubリポジトリを接続

- リポジトリ選択: `sh0ma360215/ice-cad`

### 3. ビルド設定

```
Framework preset: React (Vite)
Build command: npm run build
Build output directory: dist
Root directory: /
```

### 4. 環境変数（不要）

現時点では環境変数は不要（完全静的サイト）

### 5. デプロイ

Save and Deploy → 完了！

---

## カスタムドメイン設定（オプション）

Cloudflareでドメインを管理している場合：

1. **Pagesダッシュボード** → Custom domains
2. **Add a custom domain**
3. ドメイン入力（例: `ice-cad.example.com`）
4. DNS設定が自動適用
5. HTTPS証明書が自動発行

---

## セキュリティ

- ✅ HTTPS強制（自動）
- ✅ SSL証明書自動更新
- ✅ DDoS保護（Cloudflareネットワーク）
- ✅ WAF（Web Application Firewall）オプション

---

## モニタリング

### アクセス統計

Cloudflare Pagesダッシュボード → Analytics

- ページビュー数
- 帯域使用量
- ビルド回数
- エラー率

### アラート設定

- ビルド失敗時の通知
- カスタムドメインのSSL更新通知

---

## バックアップ・ロールバック

### ロールバック

Cloudflare Pagesは全デプロイ履歴を保持：

1. Deployments → 履歴から選択
2. **Rollback to this deployment**
3. 即座に以前のバージョンに戻る

### ソースコード

- GitHub上に全履歴が保存
- タグ/リリースで管理可能

---

## まとめ

| 項目 | 内容 |
|------|------|
| **プラットフォーム** | Cloudflare Pages |
| **本番URL** | https://ice-cad.pages.dev |
| **月額コスト** | $0（無制限帯域） |
| **デプロイ方法** | GitHubプッシュで自動 |
| **ビルド時間** | 約1-2分 |
| **ロールバック** | ワンクリック |

Cloudflare Pagesにより、**完全無料**で**スケーラブル**なホスティングを実現しています。
