import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
 
 
export class lambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
   
    //lambda stack
    const demolambda = new lambda.Function(this,'demolambda',{
        handler:'index.handler',
        runtime:lambda.Runtime.NODEJS_22_X,
        code: lambda.Code.fromInline('exports.handler = _ => "Hello, CDK";')
    })
 
  }
}
 