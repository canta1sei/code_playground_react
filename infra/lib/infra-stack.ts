import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigw from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as path from 'path';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';

// スタックに渡すプロパティの型を定義
export interface InfraStackProps extends cdk.StackProps {
  envName: 'dev' | 'prod';
}

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: InfraStackProps) {
    super(scope, id, props);

    const { envName } = props;
    const suffix = `-${envName}`;

    // 環境に応じた削除ポリシーを決定 (prodではリソースを保持)
    const removalPolicy = envName === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;

    // DynamoDB テーブル
    const bingoSongsTable = new dynamodb.Table(this, `BingoSongsTable${suffix}`, {
      tableName: `BingoSongsTable${suffix}`,
      partitionKey: { name: 'songId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy,
    });

    const bingoCardsTable = new dynamodb.Table(this, `BingoCardsTable${suffix}`, {
      tableName: `BingoCardsTable${suffix}`,
      partitionKey: { name: 'cardId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy,
    });

    new dynamodb.Table(this, `FirstSongGuessTable${suffix}`, {
      tableName: `FirstSongGuessTable${suffix}`,
      partitionKey: { name: 'guessId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy,
    });

    new dynamodb.Table(this, `SongRequestsTable${suffix}`, {
      tableName: `SongRequestsTable${suffix}`,
      partitionKey: { name: 'requestId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy,
    });

    // 画像保存用のS3バケット
    const cardImagesBucket = new s3.Bucket(this, `CardImagesBucket${suffix}`, {
      bucketName: `mononofu-bingo-images${suffix.toLowerCase()}`,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy,
      autoDeleteObjects: envName === 'dev',
    });

    // ビンゴカード生成用のLambda関数
    const bingoCardGeneratorLambda = new NodejsFunction(this, `BingoCardGeneratorLambda${suffix}`, {
      functionName: `BingoCardGeneratorLambda${suffix}`,
      entry: path.join(__dirname, '../../lambda/bingo-card-generator.ts'),
      depsLockFilePath: path.join(__dirname, '../../lambda/package-lock.json'),
      handler: 'handler',
      environment: {
        BINGO_SONGS_TABLE_NAME: bingoSongsTable.tableName,
      },
      bundling: {
        externalModules: ['@aws-sdk/client-dynamodb', '@aws-sdk/lib-dynamodb'],
      },
    });

    bingoSongsTable.grantReadData(bingoCardGeneratorLambda);

    // 全曲リスト取得用のLambda関数
    const getAllSongsLambda = new NodejsFunction(this, `GetAllSongsLambda${suffix}`, {
      functionName: `GetAllSongsLambda${suffix}`,
      entry: path.join(__dirname, '../../lambda/get-all-songs.ts'),
      depsLockFilePath: path.join(__dirname, '../../lambda/package-lock.json'),
      handler: 'handler',
      environment: {
        BINGO_SONGS_TABLE_NAME: bingoSongsTable.tableName,
      },
      bundling: {
        externalModules: ['@aws-sdk/client-dynamodb', '@aws-sdk/lib-dynamodb'],
      },
    });

    bingoSongsTable.grantReadData(getAllSongsLambda);

    // フロントエンド用S3バケット
    const frontendBucket = new s3.Bucket(this, `FrontendBucket${suffix}`, {
      bucketName: `mononofu-bingo-frontend${suffix.toLowerCase()}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy,
      autoDeleteObjects: envName === 'dev',
    });

    // CloudFront ディストリビューション
        const distribution = new cloudfront.Distribution(this, `CloudFrontDistribution${suffix}`, {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(frontendBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
      },
      additionalBehaviors: {
        '/images/*': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(cardImagesBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
      ],
    });

    // カード共有用のLambda関数
    const shareCardLambda = new NodejsFunction(this, `ShareCardLambda${suffix}`, {
      functionName: `ShareCardLambda${suffix}`,
      entry: path.join(__dirname, '../../lambda/share-card.ts'),
      depsLockFilePath: path.join(__dirname, '../../lambda/package-lock.json'),
      handler: 'handler',
      environment: {
                BINGO_CARDS_TABLE_NAME: bingoCardsTable.tableName,
        CARD_IMAGES_BUCKET_NAME: cardImagesBucket.bucketName,
        CLOUDFRONT_DOMAIN: distribution.distributionDomainName,
      },
      bundling: {
        externalModules: [
          '@aws-sdk/client-dynamodb',
          '@aws-sdk/lib-dynamodb',
          '@aws-sdk/client-s3',
        ],
      },
    });

    bingoCardsTable.grantWriteData(shareCardLambda);
    cardImagesBucket.grantWrite(shareCardLambda);

    // API Gateway
    const httpApi = new apigw.HttpApi(this, `BingoApi${suffix}`, {
      apiName: `BingoApi${suffix}`,
      corsPreflight: {
        allowHeaders: ['Content-Type'],
        allowMethods: [apigw.CorsHttpMethod.GET, apigw.CorsHttpMethod.POST, apigw.CorsHttpMethod.OPTIONS],
        allowOrigins: envName === 'prod' ? [`https://${distribution.distributionDomainName}`] : ['*'],
      },
    });

    httpApi.addRoutes({
      path: '/generate-card',
      methods: [apigw.HttpMethod.POST],
      integration: new HttpLambdaIntegration(`BingoCardGeneratorIntegration${suffix}`, bingoCardGeneratorLambda),
    });

    httpApi.addRoutes({
      path: '/songs',
      methods: [apigw.HttpMethod.GET],
      integration: new HttpLambdaIntegration(`GetAllSongsIntegration${suffix}`, getAllSongsLambda),
    });

    httpApi.addRoutes({
      path: '/share-card',
      methods: [apigw.HttpMethod.POST],
      integration: new HttpLambdaIntegration(`ShareCardIntegration${suffix}`, shareCardLambda),
    });

    // アウトプット
    new cdk.CfnOutput(this, `ApiEndpoint${suffix}`, {
      value: httpApi.url!,
      exportName: `ApiEndpoint${suffix}`,
    });

    new cdk.CfnOutput(this, `CloudFrontUrl${suffix}`, {
      value: distribution.distributionDomainName,
      exportName: `CloudFrontUrl${suffix}`,
    });

    new cdk.CfnOutput(this, `CloudFrontDistributionId${suffix}`, {
      value: distribution.distributionId,
      exportName: `CloudFrontDistributionId${suffix}`,
    });

    new cdk.CfnOutput(this, `FrontendBucketName${suffix}`, {
      value: frontendBucket.bucketName,
      exportName: `FrontendBucketName${suffix}`,
    });
  }
}