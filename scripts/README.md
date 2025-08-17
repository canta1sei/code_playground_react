# Utility Scripts (`scripts`)

このディレクトリは、プロジェクトの開発やメンテナンスを補助するためのユーティリティスクリプトを格納します。

## `seed-database.ts`

### 目的

AWS上のDynamoDBテーブル `BingoSongsTable` に、ビンゴの元となる曲のマスターデータを一括で登録（シーディング）します。

### データソース

`./data/songs.csv` ファイルを読み込み、その内容をデータベースに登録します。

### 使い方

`scripts`ディレクトリ内で、以下のコマンドを実行します。

```bash
# 依存ライブラリのインストール（初回のみ）
npm install

# スクリプトの実行
npm run seed
```
