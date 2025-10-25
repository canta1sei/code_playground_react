import { APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (): Promise<APIGatewayProxyResult> => {
  const tableName = process.env.BINGO_SONGS_TABLE_NAME;

  if (!tableName) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*', // FIXME: More restrictive CORS in production
      },
      body: JSON.stringify({ message: 'BINGO_SONGS_TABLE_NAME environment variable is not set.' }),
    };
  }

  try {
    const command = new ScanCommand({
      TableName: tableName,
      ProjectionExpression: 'songId, title, shortTitle', // Get songId, title, and shortTitle
    });

    const response = await docClient.send(command);
    const songs = response.Items;

    // Sort songs by songId (assuming it's a number or can be sorted lexicographically)
    const sortedSongs = songs?.sort((a, b) => {
      const idA = parseInt(a.songId, 10);
      const idB = parseInt(b.songId, 10);
      if (!isNaN(idA) && !isNaN(idB)) {
        return idA - idB;
      }
      return a.songId.localeCompare(b.songId);
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(sortedSongs),
    };

  } catch (error) {
    console.error('Error fetching all songs:', error);
    const errorMessage = (error instanceof Error) ? error.message : 'Unknown error';
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Failed to fetch songs.', error: errorMessage }),
    };
  }
};
