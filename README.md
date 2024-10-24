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
