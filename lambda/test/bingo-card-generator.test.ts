import { handler } from '../bingo-card-generator';
import { APIGatewayProxyEvent } from 'aws-lambda';

describe('Bingo Card Generator Handler', () => {
  it('should return a 200 status code and a hello message', async () => {
    const event: Partial<APIGatewayProxyEvent> = {}; // Mock event

    const result = await handler(event as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ message: 'Hello from Bingo Card Generator!' });
  });
});
