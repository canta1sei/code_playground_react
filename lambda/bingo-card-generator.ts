import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Fisher-Yates (aka Knuth) Shuffle Algorithm
const shuffle = (array: any[]) => {
  let currentIndex = array.length, randomIndex;

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }

  return array;
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('event', event);
  const tableName = process.env.BINGO_SONGS_TABLE_NAME;

  if (!tableName) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'BINGO_SONGS_TABLE_NAME environment variable is not set.' }),
    };
  }

  try {
    const command = new ScanCommand({
      TableName: tableName,
    });

    const response = await docClient.send(command);
    const songs = response.Items;

    if (!songs || songs.length < 25) {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: `Not enough songs in the database to generate a card. Found only ${songs?.length || 0}.` }),
      };
    }

    const shuffledSongs = shuffle(songs);
    const bingoCardSongs = shuffledSongs.slice(0, 25);

    return {
      statusCode: 200,
      body: JSON.stringify(bingoCardSongs),
    };

  } catch (error) {
    console.error('Error generating bingo card:', error);
    const errorMessage = (error instanceof Error) ? error.message : 'Unknown error';
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to generate bingo card.', error: errorMessage }),
    };
  }
};
