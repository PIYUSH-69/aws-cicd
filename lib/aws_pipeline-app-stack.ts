import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { DashboardInfraStack } from './dashboard_infra-stack';
 
export class PipelineAppStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props?: cdk.StageProps) {
    super(scope, id, props);
   
    
    const stageName = id;  // "test" or "prod"


 new DashboardInfraStack(this, `dashboardstack-${stageName}`, {stageName,
      env: props?.env,
 });

  }
}