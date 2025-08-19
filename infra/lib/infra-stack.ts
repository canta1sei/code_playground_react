import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigw from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as path from 'path';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB テーブル
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

    // ビンゴカード生成用のLambda関数
    const bingoCardGeneratorLambda = new NodejsFunction(this, 'BingoCardGeneratorLambda', {
      entry: path.join(__dirname, '../../lambda/bingo-card-generator.ts'),
      depsLockFilePath: path.join(__dirname, '../../lambda/package-lock.json'),
      handler: 'handler',
      environment: {
        BINGO_SONGS_TABLE_NAME: bingoSongsTable.tableName,
      },
    });

    // Lambda関数にBingoSongsTableへの読み取り権限を付与
    bingoSongsTable.grantReadData(bingoCardGeneratorLambda);

    // --- フロントエンドリソース (CORS設定のためにAPI Gatewayより先に定義する必要があります) ---

    // フロントエンド用S3バケット (プライベート)
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Origin Access Control (OAC) を作成して、CloudFrontがS3バケットにアクセスできるようにします。
    // こちらが新しい推奨の書き方です。
    

    // CloudFront ディストリビューション
    const distribution = new cloudfront.Distribution(this, 'CloudFrontDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(frontendBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        // 推奨: ブラウザ向けのセキュリティヘッダーを追加
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
      },
      defaultRootObject: 'index.html',
      // SPA（Single Page Application）向けの設定
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });

    // --- APIリソース ---

    // LambdaをトリガーするためのAPI Gateway
    const httpApi = new apigw.HttpApi(this, 'BingoApi', {
      corsPreflight: {
        allowHeaders: ['Content-Type'],
        allowMethods: [apigw.CorsHttpMethod.GET, apigw.CorsHttpMethod.POST, apigw.CorsHttpMethod.OPTIONS],
        // CloudFrontディストリビューションのドメイン名はデプロイ時にしか確定しないため、
        // CDKの制約上、動的に設定することが難しい場合があります。
        // '*' を許可するか、CloudFrontにカスタムドメインを設定し、そのドメインを直接指定することを推奨します。
        allowOrigins: ['*'],
      },
    });

    httpApi.addRoutes({
      path: '/generate-card',
      methods: [apigw.HttpMethod.POST],
      integration: new HttpLambdaIntegration('BingoCardGeneratorIntegration', bingoCardGeneratorLambda),
    });

    // フロントエンドをS3にデプロイ
    new s3deploy.BucketDeployment(this, 'DeployFrontend', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../frontend/dist'))],
      destinationBucket: frontendBucket,
      distribution: distribution,
      distributionPaths: ['/*'],
    });

    // APIエンドポイントのURLを出力
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: httpApi.url!,
    });

    // CloudFrontのURLを出力
    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: distribution.distributionDomainName,
    });
  }
}
