import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import {lambdaStack} from './lambda';
 
export class PipelineAppStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props?: cdk.StageProps) {
    super(scope, id, props);
   
    const lambdastack = new lambdaStack(this,'lambdastack');
 
  }
}