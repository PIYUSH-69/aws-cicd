import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { CodePipeline, CodePipelineSource, ManualApprovalStep, ShellStep } from 'aws-cdk-lib/pipelines';
import { PipelineAppStage } from './aws_pipeline-app-stack';
 
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class AwsPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const pipeline = new CodePipeline(this, 'demopipeline2', {
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.connection(
          'PIYUSH-69/aws-cicd',
          'main',{
            connectionArn: 'arn:aws:codeconnections:ap-south-1:706877673330:connection/e3a0b34f-39dc-4a14-9c9a-757a643f3a3b'
          }  
        ),
        
        commands: ['npm ci', 'npm run build', 'npx cdk synth'],
      }),
    });

    
    const testingstage = pipeline.addStage(
      new PipelineAppStage(this , "test", {
          env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
      })
    )

    testingstage.addPost(new ManualApprovalStep('approval'))

     pipeline.addStage(
      new PipelineAppStage(this , "prod", {
          env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
      })
    )

  }
}
