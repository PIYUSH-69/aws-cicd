
import { Stack, StackProps, Duration, Aws, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cw from 'aws-cdk-lib/aws-cloudwatch';



export interface DashboardInfraStackProps extends StackProps {
  stageName: string;
}



export class DashboardInfraStack extends Stack {
  constructor(scope: Construct, id: string, props: DashboardInfraStackProps) {
    super(scope, id, props);

    const stage = props.stageName;

     //  VPC
    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        { name: 'public', subnetType: ec2.SubnetType.PUBLIC },
        { name: 'private', subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      ],
    });

  //ec2
   
const ec2Instance = new ec2.Instance(this, 'WebServer', {
  vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
  instanceType: new ec2.InstanceType('t3.micro'),
  machineImage: ec2.MachineImage.latestAmazonLinux2023(),
  blockDevices: [
    {
      deviceName: '/dev/xvda',
      volume: ec2.BlockDeviceVolume.ebs(8, {
        deleteOnTermination: true,
        encrypted: true,
      }),
    },
  ],
});


    ec2Instance.connections.allowFromAnyIpv4(ec2.Port.tcp(80), 'Allow HTTP');

    // User data (correct AL2023 dnf commands)
    ec2Instance.addUserData(
      'dnf -y update || true',
      'dnf -y install nginx || true',
      'systemctl enable nginx',
      'systemctl start nginx'
    );

   //lambda
    const fn = new lambda.Function(this, 'SampleLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async () => {
          const start = Date.now();
          while (Date.now() - start < 100) {}
          if (Math.random() < 0.05) throw new Error("Random failure");
          return { statusCode: 200, body: "ok" };
        };
      `),
      timeout: Duration.seconds(5),
      description: 'Sample Lambda to produce metrics (invocations, errors, duration)',
    });

  //s3
    const bucket = new s3.Bucket(this, 'AppDataBucket', {
      versioned: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

   //dashboard
   
const dashboard = new cw.Dashboard(this, 'ComputeCostDashboard', {
      dashboardName: `compute-cost-dashboard-${stage}-${Aws.ACCOUNT_ID}-${Aws.REGION}`,
      periodOverride: cw.PeriodOverride.AUTO,
    });


   //ec2 metric
    const ec2CpuMetric = new cw.Metric({
      namespace: 'AWS/EC2',
      metricName: 'CPUUtilization',
      statistic: 'Average',
      period: Duration.minutes(5),
      dimensionsMap: { InstanceId: ec2Instance.instanceId },
    });

    //lambda metric
    const lambdaInvocations = fn.metricInvocations({ period: Duration.minutes(5) });
    const lambdaErrors = fn.metricErrors({ period: Duration.minutes(5) });
    const lambdaDurationP95 = fn.metricDuration({
      statistic: 'p95',
      period: Duration.minutes(5),
    });
//s3 metric
    const s3BucketSizeBytes = new cw.Metric({
      namespace: 'AWS/S3',
      metricName: 'BucketSizeBytes',
      statistic: 'Average',
      period: Duration.hours(24),
      dimensionsMap: {
        BucketName: bucket.bucketName,
        StorageType: 'StandardStorage',
      },
    });

    const s3NumberOfObjects = new cw.Metric({
      namespace: 'AWS/S3',
      metricName: 'NumberOfObjects',
      statistic: 'Average',
      period: Duration.hours(24),
      dimensionsMap: {
        BucketName: bucket.bucketName,
        StorageType: 'AllStorageTypes',
      },
    });

   //billing metric
    const estimatedCharges = new cw.Metric({
      namespace: 'AWS/Billing',
      metricName: 'EstimatedCharges',
      statistic: 'Maximum',
      period: Duration.hours(6),
      region: 'us-east-1',
      dimensionsMap: { Currency: 'USD' },
    });

    
     //  Dashboard Widgets
    dashboard.addWidgets(
      new cw.TextWidget({ markdown: '# 🖥️ EC2 Instance', width: 24, height: 1 }),
      new cw.GraphWidget({
        title: 'EC2 CPU Utilization (%)',
        width: 12,
        left: [ec2CpuMetric],
        leftYAxis: { min: 0, max: 100 },
      }),

      new cw.TextWidget({ markdown: '# λ Lambda Metrics', width: 24, height: 1 }),
      new cw.GraphWidget({
        title: 'Lambda Invocations & Errors',
        width: 12,
        left: [lambdaInvocations],
        right: [lambdaErrors],
      }),
      new cw.GraphWidget({
        title: 'Lambda Duration (p95, ms)',
        width: 12,
        left: [lambdaDurationP95],
      }),

      new cw.TextWidget({ markdown: '# 🪣 S3 Bucket Metrics (Daily)', width: 24, height: 1 }),
      new cw.GraphWidget({
        title: 'S3 Bucket Size (bytes)',
        width: 12,
        left: [s3BucketSizeBytes],
      }),
      new cw.GraphWidget({
        title: 'S3 Number of Objects',
        width: 12,
        left: [s3NumberOfObjects],
      }),

      new cw.TextWidget({ markdown: '# 💰 Estimated AWS Cost (USD)', width: 24, height: 1 }),
      new cw.GraphWidget({
        title: 'Total Estimated Charges (USD)',
        width: 18,
        left: [estimatedCharges],
      }),
      new cw.SingleValueWidget({
        title: 'Current Estimated Charges (USD)',
        width: 6,
        height: 6,
        metrics: [estimatedCharges],
        setPeriodToTimeRange: true,
      }),
    );
  }
}
