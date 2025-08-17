import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import * as fs from 'fs';
import { parse } from 'csv-parse';
import * as path from 'path';

// AWSクライアントの設定
const REGION = 'ap-northeast-1'; // デプロイしたリージョンに合わせてください
const TABLE_NAME = 'BingoSongsTable';

const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

interface Song {
  songId: string;
  title: string;
}

const seedDatabase = async () => {
  console.log('Seeding database...');

  const csvFilePath = path.resolve(__dirname, 'data/songs.csv');
  const songs: Song[] = [];

  const parser = fs.createReadStream(csvFilePath)
    .pipe(parse({ columns: true, trim: true }));

  for await (const record of parser) {
    songs.push(record as Song);
  }

  console.log(`Found ${songs.length} songs in CSV file.`);

  // DynamoDBのBatchWriteItemは一度に25件までしか書き込めないため、チャンクに分割
  const chunkSize = 25;
  for (let i = 0; i < songs.length; i += chunkSize) {
    const chunk = songs.slice(i, i + chunkSize);

    const putRequests = chunk.map(song => ({
      PutRequest: {
        Item: song,
      },
    }));

    const command = new BatchWriteCommand({
      RequestItems: {
        [TABLE_NAME]: putRequests,
      },
    });

    try {
      console.log(`Writing chunk ${i / chunkSize + 1}...`);
      await docClient.send(command);
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
