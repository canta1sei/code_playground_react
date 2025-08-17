# Infrastructure (`infra`)

このディレクトリは、[AWS Cloud Development Kit (CDK)](https://aws.amazon.com/jp/cdk/) を使って、プロジェクトのAWSインフラストラクチャを定義・管理します。言語はTypeScriptです。

## 管理リソース

このCDKスタック（`InfraStack`）では、以下のAWSリソースが定義されています。

### DynamoDB

- **BingoSongsTable**: ビンゴの元となる曲のマスターデータを格納するテーブル。
- **BingoCardsTable**: 生成されたビンゴカードの情報を保存するテーブル。
- **FirstSongGuessTable**: ライブの一曲目予想のデータを保存するテーブル。
- **SongRequestsTable**: やってほしい曲のリクエストデータを保存するテーブル。

### Lambda

- **BingoCardGeneratorLambda**: ビンゴカードを生成するコアロジックを持つ関数。

### API Gateway (HTTP API)

- **`/generate-card` (`POST`)**: `BingoCardGeneratorLambda`をトリガーし、ビンゴカードを生成するためのAPIエンドポイント。

## 主要コマンド

`infra`ディレクトリ内で以下のコマンドを実行します。

- `npm install`: 依存関係をインストールします。
- `npx cdk synth`: CDKコードからCloudFormationテンプレートを生成します（構文チェックなどに使用）。
- `npx cdk deploy`: 定義されたリソースをAWSアカウントにデプロイします。
- `npx cdk diff`: 現在デプロイされているリソースとローカルのコードとの差分を確認します。
- `npx cdk destroy`: デプロイしたリソースをすべて削除します。