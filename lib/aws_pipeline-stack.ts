import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';
 
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class AwsPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


    const pipeline = new CodePipeline(this, 'demopipeline2', {
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.connection(
          'PIYUSH-69/aws-cicd',
          'main',{
            connectionArn: 'arn:aws:codeconnections:ap-south-1:536697268919:connection/09eff953-3791-4384-a296-80cff544fcd3'
          }  
        ),
        
        commands: ['npm ci', 'npm run build', 'npx cdk synth'],
      }),
    });
  }
}
