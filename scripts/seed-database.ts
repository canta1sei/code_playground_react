import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import * as fs from 'fs';
import { parse } from 'csv-parse';
import * as path from 'path';

// AWSクライアントの設定
const REGION = 'ap-northeast-1'; // デプロイしたリージョンに合わせてください
const envName = process.env.ENV_NAME || 'dev'; // ENV_NAME環境変数を読み込む、なければ'dev'
const TABLE_NAME = `BingoSongsTable-${envName}`; // 環境名でテーブル名を動的に変更


const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

interface Song {
  songId: string;
  title: string;
  shortTitle?: string; // Add shortTitle
}

const seedDatabase = async () => {
  console.log(`Start seeding database for ${envName} environment...`);

  // 1. テーブルの全アイテムをスキャンして削除
  console.log(`Scanning all items from ${TABLE_NAME} to delete...`);
  let allItems: Record<string, any>[] = [];
  let lastEvaluatedKey: Record<string, any> | undefined;

  do {
    const scanCommand = new ScanCommand({
      TableName: TABLE_NAME,
      ProjectionExpression: 'songId', // 削除にはキーだけでOK
      ExclusiveStartKey: lastEvaluatedKey,
    });
    const scanResult = await docClient.send(scanCommand);
    if (scanResult.Items) {
      allItems = allItems.concat(scanResult.Items);
    }
    lastEvaluatedKey = scanResult.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`Found ${allItems.length} items to delete.`);

  if (allItems.length > 0) {
    const deleteChunkSize = 25;
    for (let i = 0; i < allItems.length; i += deleteChunkSize) {
      const chunk = allItems.slice(i, i + deleteChunkSize);
      const deleteRequests = chunk.map(item => ({
        DeleteRequest: {
          Key: { songId: item.songId },
        },
      }));

      const deleteCommand = new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: deleteRequests,
        },
      });

      try {
        console.log(`Deleting chunk ${i / deleteChunkSize + 1}...`);
        await docClient.send(deleteCommand);
        console.log(`Successfully deleted ${chunk.length} items.`);
      } catch (err) {
        console.error('Error deleting from DynamoDB:', err);
        return;
      }
    }
    console.log('All items have been deleted from the table.');
  }

  // 2. CSVから新しいデータを読み込んで投入
  console.log('Reading new data from CSV file...');
  const csvFilePath = path.resolve(__dirname, 'data/songs.csv');
  const songs: Song[] = [];

  const parser = fs.createReadStream(csvFilePath)
    .pipe(parse({ columns: true, trim: true }));

  for await (const record of parser) {
    songs.push(record as Song);
  }

  console.log(`Found ${songs.length} songs in CSV file.`);

  if (songs.length === 0) {
    console.log('No songs to seed. Exiting.');
    return;
  }

  // DynamoDBのBatchWriteItemは一度に25件までしか書き込めないため、チャンクに分割
  const putChunkSize = 25;
  for (let i = 0; i < songs.length; i += putChunkSize) {
    const chunk = songs.slice(i, i + putChunkSize);

    const putRequests = chunk.map(song => ({
      PutRequest: {
        Item: song,
      },
    }));

    const putCommand = new BatchWriteCommand({
      RequestItems: {
        [TABLE_NAME]: putRequests,
      },
    });

    try {
      console.log(`Writing chunk ${i / putChunkSize + 1}...`);
      await docClient.send(putCommand);
      console.log(`Successfully wrote ${chunk.length} items to ${TABLE_NAME}.`);
    } catch (err) {
      console.error('Error writing to DynamoDB:', err);
      return;
    }
  }

  console.log('Database seeding complete!');
};

seedDatabase().catch(err => {
  console.error('Seeding script failed:', err);
});
