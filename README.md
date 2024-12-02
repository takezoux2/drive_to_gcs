# はじめに

Google ドライブのファイルを GCS へアップロードするツールです。

# 対応ファイル

| ファイル種類        | GCS に保存される形式 |
| :------------------ | :------------------- |
| Google ドキュメント | Markdown             |

# 使用方法

## Google OAuth2 の credentials.json の保存

Google Cloud Console から OAuth2 のアプリを作成し、credentials の json ファイルをダウンロードし
`secrets/credentials.json` に保存してください。

## AccessToken の取得

```
yarn auth
```

を実行し、http://localhost:3000 にアクセスし、Google 認証を行ってください。成功すると `secrets/token.json` が保存されます。

## Google ドライブ、GCS の設定

`.env`を作成し、次の Key を設定してください。(または、環境変数)

| KEY             | 指定する値                                                                    |
| :-------------- | :---------------------------------------------------------------------------- |
| SHARE_DRIVE_ID  | Google 共有ドライブの ID。共有ドライブのルートの URL の末尾部分を取得してくる |
| FOLDER_ID       | Copy 対象にするフォルダー名。フォルダーの URL の末尾部分を取得してくる        |
| GCS_BUCKET_NAME | 保存先の GCS のバケット名                                                     |

※AccessToken を取得したアカウントがドライブには Read 権限、Bucket には Write 権限があることを確認しておいてください。

## コピーの実行

```
yarn copy
```

を実行してください。

## Slack からの File の取得時の設定

[参考記事](https://qiita.com/kobayashi_ryo/items/a194e620b49edad27364)に従って、SlackAPP を作成し、BotToken を作って、slack_token.json の BotToken を設定してください。

1. Slack にファイル取得用の App を作成
2. SlackApp の設定画面で "OAuth & Permissions" > "Scopes" > "Bot Token Scopes"に、"files:read"権限を追加
3. SlackApp の設定画面で "OAuth & Permissions" > "OAuth Tokens"で、ワークスペースに App をインストール
4. 生成された”Bot User OAuth Token"を、`.env`の`BOT_USER_OAUTH_TOKEN`に設定
5. ファイルを取得したいチャンネルに、Slack のチャンネルの設定 > "インテグレーション" > "App"で、先ほど作成した App を追加

を行ってください

## Slack の特定チャンネルのファイルをすべてローカルにダウンロード

```
yarn ts-node src/download_slack_files_to_local.ts {ChannelID}
```

を実行してください。
ChannelID は、Slack のチャンネル名の右クリック > リンクをコピーからコピーした URL の最末尾が ChannelID です。
