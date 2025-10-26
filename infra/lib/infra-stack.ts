import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigw from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as path from 'path';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';

// スタックに渡すプロパティの型を定義
export interface InfraStackProps extends cdk.StackProps {
  envName: 'dev' | 'prod';
  certificate?: acm.ICertificate; // <- 追加: 証明書を外部から受け取る
}

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: InfraStackProps) {
    super(scope, id, props);

    const { envName, certificate } = props; // <- certificate を受け取る
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

    // --- ここからドメイン関連の設定 ---
    let distribution;
    const apiAllowedOrigins: string[] = [];

    if (envName === 'prod') {
      const domainName = 'tdf-arena.com';
      apiAllowedOrigins.push(`https://${domainName}`);

      const hostedZone = route53.PublicHostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
        zoneName: domainName,
        hostedZoneId: 'Z07566193RAUOSUIHU9W5',
      });

      if (!certificate) {
        throw new Error('Certificate is required for prod environment');
      }

      // CloudFront ディストリビューション (prod)
      distribution = new cloudfront.Distribution(this, `CloudFrontDistribution${suffix}`, {
        defaultBehavior: {
          origin: origins.S3BucketOrigin.withOriginAccessControl(frontendBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
        },
        domainNames: [domainName],
        certificate: certificate, // <- ここで受け取った証明書を利用
        defaultRootObject: 'index.html',
        errorResponses: [
          { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
          { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
        ],
      });

      // Route 53にAレコードを登録
      new route53.ARecord(this, 'ARecord', {
        zone: hostedZone,
        target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
      });
    } else {
      const domainName = 'dev.tdf-arena.com';
      apiAllowedOrigins.push(`https://${domainName}`);

      const hostedZone = route53.PublicHostedZone.fromHostedZoneAttributes(this, 'HostedZone-dev', {
        zoneName: 'tdf-arena.com',
        hostedZoneId: 'Z07566193RAUOSUIHU9W5',
      });

      if (!certificate) {
        throw new Error('Certificate is required for dev environment');
      }

      // CloudFront ディストリビューション (dev)
      distribution = new cloudfront.Distribution(this, `CloudFrontDistribution${suffix}`, {
        defaultBehavior: {
          origin: origins.S3BucketOrigin.withOriginAccessControl(frontendBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
        },
        domainNames: [domainName],
        certificate: certificate,
        defaultRootObject: 'index.html',
        errorResponses: [
          { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
          { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
        ],
      });

      // Route 53にAレコードを登録
      new route53.ARecord(this, 'ARecord-dev', {
        zone: hostedZone,
        recordName: 'dev',
        target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
      });
    }
    // --- ここまでドメイン関連の設定 ---


    // API Gateway
    const httpApi = new apigw.HttpApi(this, `BingoApi${suffix}`, {
      apiName: `BingoApi${suffix}`,
      corsPreflight: {
        allowHeaders: ['Content-Type'],
        allowMethods: [apigw.CorsHttpMethod.GET, apigw.CorsHttpMethod.POST, apigw.CorsHttpMethod.OPTIONS],
        allowOrigins: apiAllowedOrigins,
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


    // アウトプット
    new cdk.CfnOutput(this, `ApiEndpoint${suffix}`, {
      value: httpApi.url!,
      exportName: `ApiEndpoint${suffix}`
    });

    new cdk.CfnOutput(this, `FrontendBucketName${suffix}`, {
      value: frontendBucket.bucketName,
      exportName: `FrontendBucketName${suffix}`
    });

    new cdk.CfnOutput(this, `CloudFrontDistributionId${suffix}`, {
      value: distribution.distributionId,
      exportName: `CloudFrontDistributionId${suffix}`
    });

    new cdk.CfnOutput(this, `CloudFrontUrl${suffix}`, {
      value: distribution.distributionDomainName,
      exportName: `CloudFrontUrl${suffix}`
    });
  }
}
