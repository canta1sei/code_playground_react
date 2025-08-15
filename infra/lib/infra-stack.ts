import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigw from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as path from 'path';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Tables
    const bingoSongsTable = new dynamodb.Table(this, 'BingoSongsTable', {
      tableName: 'BingoSongsTable',
      partitionKey: { name: 'songId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new dynamodb.Table(this, 'BingoCardsTable', {
      tableName: 'BingoCardsTable',
      partitionKey: { name: 'cardId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new dynamodb.Table(this, 'FirstSongGuessTable', {
      tableName: 'FirstSongGuessTable',
      partitionKey: { name: 'guessId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new dynamodb.Table(this, 'SongRequestsTable', {
      tableName: 'SongRequestsTable',
      partitionKey: { name: 'requestId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Lambda Function for the Bingo Card Generator
    const bingoCardGeneratorLambda = new NodejsFunction(this, 'BingoCardGeneratorLambda', {
      entry: path.join(__dirname, '../../lambda/bingo-card-generator.ts'),
      depsLockFilePath: path.join(__dirname, '../../lambda/package-lock.json'),
      handler: 'handler',
      environment: {
        BINGO_SONGS_TABLE_NAME: bingoSongsTable.tableName,
      },
    });

    // Grant the Lambda function read access to the BingoSongsTable
    bingoSongsTable.grantReadData(bingoCardGeneratorLambda);

    // API Gateway to trigger the Lambda
    const httpApi = new apigw.HttpApi(this, 'BingoApi', {
      corsPreflight: {
        allowHeaders: ['Content-Type'],
        allowMethods: [apigw.CorsHttpMethod.GET, apigw.CorsHttpMethod.POST, apigw.CorsHttpMethod.OPTIONS],
        allowOrigins: ['*'],
      },
    });

    httpApi.addRoutes({
      path: '/generate-card',
      methods: [apigw.HttpMethod.POST],
      integration: new HttpLambdaIntegration('BingoCardGeneratorIntegration', bingoCardGeneratorLambda),
    });

    // Output the API endpoint URL
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: httpApi.url!,
    });
  }
}
