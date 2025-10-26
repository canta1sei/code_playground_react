#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { InfraStack } from '../lib/infra-stack';
import { CertificateStack } from '../lib/certificate-stack';

const app = new cdk.App();

// --- 環境共通の設定 ---
const awsAccount = process.env.CDK_DEFAULT_ACCOUNT;
const mainRegion = 'ap-northeast-1'; // メインリージョンを東京に設定
const domainName = 'tdf-arena.com';
const hostedZoneId = 'Z07566193RAUOSUIHU9W5';

// 1. 証明書スタックを us-east-1 に作成
const certificateStack = new CertificateStack(app, 'TdfArenaCertificateStack', {
  env: {
    account: awsAccount,
    region: 'us-east-1', // CloudFrontの証明書はus-east-1にある必要がある
  },
  domainName: domainName,
  hostedZoneId: hostedZoneId,
  crossRegionReferences: true, // リージョンをまたいで参照を有効化
});

// --- 本番環境 (prod) ---
// メインのInfraStackを東京リージョンに作成
new InfraStack(app, `InfraStack-prod`, {
  env: {
    account: awsAccount,
    region: mainRegion,
  },
  envName: 'prod',
  certificate: certificateStack.certificate, // CertificateStackから証明書を受け取る
  crossRegionReferences: true, // リージョンをまたいで参照を有効化
});

// --- 開発環境 (dev) ---
new InfraStack(app, `InfraStack-dev`, {
  env: {
    account: awsAccount,
    region: mainRegion,
  },
  envName: 'dev',
  certificate: certificateStack.certificate, // CertificateStackから証明書を受け取る
  crossRegionReferences: true, // リージョンをまたいで参照を有効化
});