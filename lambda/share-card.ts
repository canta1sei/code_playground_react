import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const s3Client = new S3Client({});

const BINGO_CARDS_TABLE_NAME = process.env.BINGO_CARDS_TABLE_NAME;
const CARD_IMAGES_BUCKET_NAME = process.env.CARD_IMAGES_BUCKET_NAME;
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (!event.body) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Request body is missing' }) };
  }

  if (!BINGO_CARDS_TABLE_NAME || !CARD_IMAGES_BUCKET_NAME || !CLOUDFRONT_DOMAIN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Environment variables for table, bucket name or CloudFront domain are not set.' }),
    };
  }

  try {
    const { imageData, guestId } = JSON.parse(event.body);

    if (!imageData || !guestId) {
      return { statusCode: 400, body: JSON.stringify({ message: 'imageData and guestId are required.' }) };
    }

    // Decode base64 image data
    const imageBuffer = Buffer.from(imageData.replace(/^data:image\/\w+;base64,/, ''), 'base64');

    const cardId = randomUUID();
    const s3Key = `bingo-cards/${cardId}.png`;

    // Upload to S3
    await s3Client.send(new PutObjectCommand({
      Bucket: CARD_IMAGES_BUCKET_NAME,
      Key: s3Key,
      Body: imageBuffer,
      ContentType: 'image/png',
    }));

    const imageUrl = `https://${CLOUDFRONT_DOMAIN}/images/${s3Key}`;

    // Save to DynamoDB
    await docClient.send(new PutCommand({
      TableName: BINGO_CARDS_TABLE_NAME,
      Item: {
        guestId,
        cardId,
        imageUrl,
        createdAt: new Date().toISOString(),
      },
    }));

    console.log('Generated image URL:', imageUrl);
    return {
      statusCode: 200,
      body: JSON.stringify({ imageUrl }),
    };

  } catch (error) {
    console.error('Error processing share card request:', error);
    const errorMessage = (error instanceof Error) ? error.message : 'Unknown error';
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to process share card request.', error: errorMessage }),
    };
  }
};
