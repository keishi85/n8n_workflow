# N8N情報収集自動化ワークフロー セットアップガイド

## 概要
SNS発信用のAI・N8N・Dify関連情報を自動収集し、投稿コンテンツを生成するN8Nワークフローです。

## 前提条件
- N8N v1.0以上がインストール済み
- Google Cloud Platform アカウント
- OpenAI API アカウント
- Slack ワークスペース
- Gmail または SMTP サーバー

## 1. Google Sheets の準備

### 1.1 新しいスプレッドシートを作成
Google Sheetsで新しいスプレッドシートを作成し、以下の4つのシートを用意してください。

### 1.2 シート構成

#### シート1: 「RSS情報源管理」
| A列 | B列 | C列 | D列 | E列 | F列 |
|-----|-----|-----|-----|-----|-----|
| カテゴリ | 情報源名 | RSS URL | 有効/無効 | 優先度 | 備考 |
| AI最新情報 | OpenAI Blog | https://openai.com/blog/rss.xml | 有効 | 1 | 公式ブログ |
| AI活用事例 | AI事例DB | https://example.com/rss | 有効 | 2 | 事例集 |

#### シート2: 「検索キーワード管理」
| A列 | B列 | C列 | D列 | E列 | F列 | G列 |
|-----|-----|-----|-----|-----|-----|-----|
| カテゴリ | キーワード | 検索エンジン | 有効/無効 | 言語 | 検索頻度 | 備考 |
| AI最新情報 | ChatGPT 新機能 | google-news | 有効 | ja | daily | 最新機能情報 |
| N8N事例 | n8n automation | google-search | 有効 | en | daily | 自動化事例 |

#### シート3: 「AIプロンプト設定」  
| A列 | B列 | C列 | D列 | E列 | F列 | G列 |
|-----|-----|-----|-----|-----|-----|-----|
| プロンプトID | カテゴリ | プロンプト種別 | プロンプト内容 | 有効/無効 | バージョン | 備考 |
| FILTER_AI | AI最新情報 | filter | あなたはSNS投稿用の編集者です。この記事がSNS投稿に値するか判定してください。 | 有効 | 1.0 | フィルタ用 |
| POST_AI | AI最新情報 | generate | AI関連の短いSNS投稿文を生成してください。専門的すぎず親しみやすく。 | 有効 | 1.0 | 投稿文生成 |

#### シート4: 「投稿コンテンツ生成結果」
| A列 | B列 | C列 | D列 | E列 | F列 | G列 | H列 | I列 | J列 |
|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| 日付 | カテゴリ | 元記事タイトル | 元記事URL | 生成された投稿文 | ハッシュタグ | 推奨画像プロンプト | 投稿済み | 投稿先 | 備考 |

#### シート5: 「エラーログ」（エラー記録用）
| A列 | B列 | C列 | D列 | E列 | F列 | G列 | H列 |
|-----|-----|-----|-----|-----|-----|-----|-----|
| タイムスタンプ | ワークフロー名 | ノード名 | エラーメッセージ | エラータイプ | 重要度 | 実行ID | 再試行可能 |

## 2. Google Cloud Platform 設定

### 2.1 プロジェクトの作成・選択
1. [Google Cloud Console](https://console.cloud.google.com/) にログイン
2. 新しいプロジェクトを作成、または既存プロジェクトを選択

### 2.2 必要なAPIの有効化
以下のAPIを有効にしてください：
- Google Sheets API
- Google Drive API
- Custom Search API（Google検索用）

### 2.3 サービスアカウントの作成
1. IAM と管理 > サービス アカウント
2. 「サービス アカウントを作成」をクリック
3. 名前を入力（例：n8n-automation）
4. 以下の役割を付与：
   - Google Sheets API > Sheets Editor
   - Google Drive API > Drive File Access

### 2.4 認証キーの生成
1. 作成したサービス アカウントをクリック
2. 「キー」タブ > 「キーを追加」> 「JSON」を選択
3. ダウンロードしたJSONファイルを安全な場所に保存

### 2.5 Google Sheets の共有設定
1. 作成したスプレッドシートを開く
2. 「共有」ボタンをクリック  
3. サービス アカウントのメールアドレスを「編集者」権限で追加

### 2.6 Custom Search Engine 設定（Google検索用）
1. [Custom Search Engine](https://cse.google.com/cse/) にアクセス
2. 「新しい検索エンジン」を作成
3. 検索対象を「ウェブ全体」に設定
4. 検索エンジンIDをメモ（環境変数で使用）

## 3. API キーの取得

### 3.1 OpenAI API
1. [OpenAI Platform](https://platform.openai.com/) にログイン
2. API Keys > Create new secret key
3. キーを安全な場所に保存

### 3.2 NewsAPI（ニュース検索用）
1. [NewsAPI](https://newsapi.org/) でアカウント作成
2. API キーを取得
3. 無料プランは100リクエスト/日まで

### 3.3 Slack API  
1. [Slack API](https://api.slack.com/apps) でアプリ作成
2. OAuth & Permissions で以下のスコープを追加：
   - `chat:write`
   - `channels:read`
3. Bot User OAuth Token を取得

## 4. N8N 環境変数の設定

N8Nの環境変数に以下を設定してください：

```bash
# Google Sheets
SHEET_ID=your_google_sheet_id
GOOGLE_SHEETS_CREDENTIAL_ID=your_n8n_google_credential_id

# OpenAI
OPENAI_CRED_ID=your_n8n_openai_credential_id

# 検索API
NEWSAPI_KEY=your_newsapi_key
GOOGLE_CUSTOM_SEARCH_KEY=your_google_api_key  
GOOGLE_CSE_ID=your_custom_search_engine_id

# Slack
SLACK_CRED_ID=your_n8n_slack_credential_id
SLACK_NOTIFICATION_CHANNEL=#sns-automation
SLACK_ERROR_CHANNEL=#errors

# メール通知
SMTP_CRED_ID=your_n8n_smtp_credential_id
ONCALL_EMAIL=admin@yourcompany.com
```

### Google Sheet ID の取得方法
スプレッドシートのURLから抜き出します：
```
https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
```

## 5. N8N認証情報の設定

### 5.1 Google Sheets OAuth2
1. N8N > Settings > Credentials
2. 「Add Credential」> Google Sheets OAuth2
3. ダウンロードしたJSONファイルの内容を使用して設定

### 5.2 OpenAI
1. 「Add Credential」> OpenAI
2. API Key に取得したキーを入力

### 5.3 Slack
1. 「Add Credential」> Slack
2. Bot User OAuth Token を入力

### 5.4 SMTP（Gmail使用の場合）
1. 「Add Credential」> SMTP
2. Gmail設定：
   - Host: smtp.gmail.com
   - Port: 587
   - User: your-email@gmail.com
   - Password: App Password（2段階認証が必要）

## 6. ワークフローのインポート

### 6.1 メインワークフローのインポート
1. N8N > Workflows > Import from File
2. `sns投稿.json` をインポート
3. 全ての認証情報を正しく設定されていることを確認

### 6.2 エラーワークフローのインポート  
1. `error-workflow.json` をインポート
2. メインワークフローの設定でエラーワークフローを指定

## 7. 初回テスト実行

### 7.1 手動テスト実行
1. メインワークフローを開く
2. 「Test workflow」をクリック  
3. 各ノードが正常に実行されることを確認

### 7.2 想定される実行フロー
```
07:00 - ワークフロー開始
07:05 - RSS情報源からデータ取得完了
07:10 - キーワード検索完了
07:15 - 記事の統合・重複除去完了
07:20 - AI による記事フィルタリング完了
07:25 - 投稿文・画像プロンプト生成完了  
07:30 - Google Sheets への保存完了
07:32 - Slack 通知送信完了
```

## 8. 運用開始後の確認事項

### 8.1 定期確認（毎日）
- [ ] Slack通知が正常に送信されているか
- [ ] Google Sheetsに新しいコンテンツが保存されているか
- [ ] エラー通知が来ていないか

### 8.2 週次確認  
- [ ] 生成コンテンツの品質は適切か
- [ ] APIクォータの使用量は上限内か
- [ ] フィルタリング精度に問題はないか

### 8.3 月次レビュー
- [ ] RSS情報源の追加・削除
- [ ] キーワードの見直し・追加
- [ ] プロンプトの改善・最適化
- [ ] A/Bテスト結果の分析

## 9. トラブルシューティング

### よくあるエラーと対処法

#### Google Sheets エラー
**エラー**: "The caller does not have permission"
**対処法**: サービスアカウントにシートの編集権限が付与されているか確認

#### OpenAI API エラー
**エラー**: "Rate limit exceeded" 
**対処法**: リクエスト間隔を調整、またはAPI使用量を確認

#### RSS読み込みエラー
**エラー**: "Feed could not be read"
**対処法**: RSS URLの有効性を確認、無効なソースを「無効」に設定

#### Slack通知エラー
**エラー**: "Channel not found"
**対処法**: チャンネル名の確認、Botの権限設定を確認

### パフォーマンス最適化

#### 処理時間短縮
- RSS情報源数を20個以下に制限  
- 検索キーワード数を10個以下に制限
- OpenAI APIリクエストにTimeout設定を追加

#### コスト削減
- OpenAI temperature を0.0に設定してトークン使用量削減
- max_tokens を適切に制限
- 不要な記事の早期フィルタリング

## 10. セキュリティ考慮事項

### API キーの管理
- [ ] 全てのAPIキーが環境変数で管理されている
- [ ] 認証情報がコードにハードコードされていない  
- [ ] 定期的なAPIキーのローテーション

### アクセス権限
- [ ] Google Sheetsの最小権限設定
- [ ] Slackボットの必要最小権限
- [ ] SMTPアカウントの専用パスワード使用

## サポート

質問や問題が発生した場合：
1. まず本ガイドのトラブルシューティングセクションを確認
2. N8Nのログを確認してエラー詳細を特定  
3. 必要に応じて技術サポートに連絡

---

**注意**: 本ワークフローはAI生成コンテンツを含むため、投稿前に必ず内容を確認してください。