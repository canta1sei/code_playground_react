#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { InfraStack } from '../lib/infra-stack';

const app = new cdk.App();

// コンテキストから環境名を取得 (例: cdk deploy -c env=dev)
const envName = app.node.tryGetContext('env');
if (!envName) {
  throw new Error('Context variable "env" must be specified. (e.g., "cdk deploy -c env=dev")');
}

if (envName !== 'dev' && envName !== 'prod') {
    throw new Error('Context variable "env" must be either "dev" or "prod".');
}

// 環境に応じたpropsを決定
const stackProps = {
  envName: envName,
  // envNameが 'prod' の場合はリソースを保持、それ以外 (dev) は削除
  removalPolicy: envName === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
  // AWSアカウントとリージョンを明示的に指定することを推奨
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
};

// スタック名に環境名を含めて、ユニークにする
new InfraStack(app, `InfraStack-${envName}`, stackProps);
