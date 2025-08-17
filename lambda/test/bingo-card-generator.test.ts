import { handler } from '../bingo-card-generator';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';

// jest.mockを使ってDynamoDBDocumentClientをモック化
const ddbMock = mockClient(DynamoDBDocumentClient);

describe('Bingo Card Generator Handler', () => {

  beforeEach(() => {
    // 各テストの前にモックをリセット
    ddbMock.reset();
    // 環境変数を設定
    process.env.BINGO_SONGS_TABLE_NAME = 'BingoSongsTable';
  });

  it('should return 25 songs when the table has enough data', async () => {
    // 30曲のダミーデータを生成
    const mockSongs = Array.from({ length: 30 }, (_, i) => ({
      songId: `MCZ${String(i + 1).padStart(5, '0')}`,
      title: `Song ${i + 1}`,
    }));

    // ScanCommandが呼ばれたら、ダミーデータを返すように設定
    ddbMock.on(ScanCommand).resolves({
      Items: mockSongs,
    });

    const event: Partial<APIGatewayProxyEvent> = {};
    const result = await handler(event as APIGatewayProxyEvent);

    // 結果を検証
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(25);
  });

  it('should return a 500 error if there are not enough songs', async () => {
    // 24曲しか返さないように設定
    const mockSongs = Array.from({ length: 24 }, (_, i) => ({ songId: `id${i}`, title: `Song ${i}` }));
    ddbMock.on(ScanCommand).resolves({ Items: mockSongs });

    const event: Partial<APIGatewayProxyEvent> = {};
    const result = await handler(event as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toContain('Not enough songs');
  });

  it('should return a 500 error if DynamoDB scan fails', async () => {
    // ScanCommandが呼ばれたらエラーを発生させる
    ddbMock.on(ScanCommand).rejects(new Error('DynamoDB error'));

    const event: Partial<APIGatewayProxyEvent> = {};
    const result = await handler(event as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toContain('Failed to generate bingo card');
  });
});
