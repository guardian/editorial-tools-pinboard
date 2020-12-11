import {
  CfnMapping,
  CfnOutput,
  CfnParameter,
  Construct,
  Duration,
  Fn,
  Stack,
  StackProps,
  Tags,
} from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as S3 from "@aws-cdk/aws-s3";
import * as iam from "@aws-cdk/aws-iam";
import * as apigateway from "@aws-cdk/aws-apigateway";
import * as appsync from "@aws-cdk/aws-appsync";
import * as db from "@aws-cdk/aws-dynamodb";
import * as acm from "@aws-cdk/aws-certificatemanager";
import { join } from "path";
import { BillingMode } from "@aws-cdk/aws-dynamodb";

export class PinBoardStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const thisStack = this;

    const APP = "pinboard";

    // if changing should also change .nvmrc (at the root of repo)
    const LAMBDA_NODE_VERSION = lambda.Runtime.NODEJS_12_X;

    const STACK = new CfnParameter(thisStack, "Stack", {
      type: "String",
      description: "Stack",
    }).valueAsString;

    const STAGE = new CfnParameter(thisStack, "Stage", {
      type: "String",
      description: "Stage",
    }).valueAsString;

    Tags.of(thisStack).add("App", APP);
    Tags.of(thisStack).add("Stage", STAGE);
    Tags.of(thisStack).add("Stack", STACK);

    const deployBucket = S3.Bucket.fromBucketName(
      thisStack,
      "workflow-dist",
      "workflow-dist"
    );

    const lambdaExecutePolicyStatement = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["execute-api:Invoke"],
      resources: ["arn:aws:execute-api:eu-west-1:*"], //TODO tighten up if possible
    });
    lambdaExecutePolicyStatement.addAnyPrincipal();

    const lambdaExecutePolicy = new iam.PolicyDocument({
      statements: [lambdaExecutePolicyStatement],
    });

    const workflowBridgeLambdaBasename = "pinboard-workflow-bridge-lambda";

    const pinboardWorkflowBridgeLambda = new lambda.Function(
      thisStack,
      workflowBridgeLambdaBasename,
      {
        runtime: LAMBDA_NODE_VERSION,
        memorySize: 128,
        timeout: Duration.seconds(5),
        handler: "index.handler",
        environment: {
          STAGE,
          STACK,
          APP,
        },
        functionName: `${workflowBridgeLambdaBasename}-${STAGE}`,
        code: lambda.Code.fromBucket(
          deployBucket,
          `${STACK}/${STAGE}/${workflowBridgeLambdaBasename}/${workflowBridgeLambdaBasename}.zip`
        ),
      }
    );

    const pinboardAppsyncApiBaseName = "pinboard-appsync-api";
    const pinboardAppsyncApi = new appsync.GraphqlApi(
      thisStack,
      pinboardAppsyncApiBaseName,
      {
        name: `${pinboardAppsyncApiBaseName}-${STAGE}`,
        schema: appsync.Schema.fromAsset(
          join(__dirname, "../shared/graphql/schema.graphql")
        ),
        authorizationConfig: {
          defaultAuthorization: {
            authorizationType: appsync.AuthorizationType.API_KEY,
          },
        },
        xrayEnabled: true,
      }
    );

    const pinboardItemTableName = "pinboard-appsync-item-table";

    const pinboardAppsyncItemTable = new db.Table(
      thisStack,
      pinboardItemTableName,
      {
        billingMode: BillingMode.PAY_PER_REQUEST,
        partitionKey: {
          name: "id",
          type: db.AttributeType.STRING,
        },
        sortKey: {
          name: "timestamp",
          type: db.AttributeType.NUMBER,
        },
      }
    );

    const pinboardWorkflowBridgeLambdaDataSource = pinboardAppsyncApi.addLambdaDataSource(
      `${workflowBridgeLambdaBasename.split("-").join("_")}_datasource`,
      pinboardWorkflowBridgeLambda
    );

    const pinboardItemDataSource = pinboardAppsyncApi.addDynamoDbDataSource(
      `${pinboardItemTableName.split("-").join("_")}_datasource`,
      pinboardAppsyncItemTable
    );

    pinboardItemDataSource.createResolver({
      typeName: "Query",
      fieldName: "listItems",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "Scan",
          "filter": #if($context.args.filter) $util.transform.toDynamoDBFilterExpression($ctx.args.filter) #else null #end,
        }
      `),
      // TODO: move back into mapping template above when we convert to a Query operation, when we support multiple pinboards
      // "limit": $util.defaultIfNull($ctx.args.limit, 20),
      // "nextToken": $util.toJson($util.defaultIfNullOrEmpty($ctx.args.nextToken, null)),
      responseMappingTemplate: appsync.MappingTemplate.fromString(
        "$util.toJson($context.result)"
      ),
    });

    pinboardItemDataSource.createResolver({
      typeName: "Query",
      fieldName: "getItem",
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbGetItem(
        "id",
        "id"
      ),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    });

    pinboardItemDataSource.createResolver({
      typeName: "Mutation",
      fieldName: "createItem",
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbPutItem(
        appsync.PrimaryKey.partition("id").auto(),
        appsync.Values.projecting("input")
          .attribute("timestamp")
          .is("$util.time.nowEpochSeconds()")
      ),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    });

    // TODO: add resolvers for updates and deletes

    // this allows the lambda to query/create AppSync config/secrets
    const bootstrappingLambdaAppSyncPolicyStatement = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["appsync:*"],
      resources: ["arn:aws:appsync:eu-west-1:*"], //TODO tighten up if possible
    });

    const bootstrappingLambdaPermissionsFilePolicyStatement = new iam.PolicyStatement(
      {
        effect: iam.Effect.ALLOW,
        actions: ["s3:GetObject"],
        resources: [`arn:aws:s3:::permissions-cache/${STAGE}/*`],
      }
    );

    const bootstrappingLambdaBasename = "pinboard-bootstrapping-lambda";
    const bootstrappingLambdaApiBaseName = `${bootstrappingLambdaBasename}-api`;

    const bootstrappingLambdaFunction = new lambda.Function(
      thisStack,
      bootstrappingLambdaBasename,
      {
        runtime: LAMBDA_NODE_VERSION,
        memorySize: 128,
        timeout: Duration.seconds(5),
        handler: "index.handler",
        environment: {
          STAGE,
          STACK,
          APP,
        },
        functionName: `${bootstrappingLambdaBasename}-${STAGE}`,
        code: lambda.Code.fromBucket(
          deployBucket,
          `${STACK}/${STAGE}/${bootstrappingLambdaApiBaseName}/${bootstrappingLambdaApiBaseName}.zip`
        ),
        initialPolicy: [
          bootstrappingLambdaAppSyncPolicyStatement,
          bootstrappingLambdaPermissionsFilePolicyStatement,
        ],
      }
    );

    const bootstrappingApiGateway = new apigateway.LambdaRestApi(
      thisStack,
      bootstrappingLambdaApiBaseName,
      {
        restApiName: `${bootstrappingLambdaApiBaseName}-${STAGE}`,
        handler: bootstrappingLambdaFunction,
        endpointTypes: [apigateway.EndpointType.REGIONAL],
        policy: lambdaExecutePolicy,
        defaultMethodOptions: {
          apiKeyRequired: false,
        },
        deployOptions: {
          stageName: "api",
        },
      }
    );

    const MAPPING_KEY = "mapping";
    const DOMAIN_NAME_KEY = "DomainName";
    new CfnMapping(thisStack, MAPPING_KEY, {
      [MAPPING_KEY]: {
        [DOMAIN_NAME_KEY]: {
          CODE: "pinboard.code.dev-gutools.co.uk",
          PROD: "pinboard.gutools.co.uk",
        },
      },
    });

    const domainName = Fn.findInMap(MAPPING_KEY, DOMAIN_NAME_KEY, STAGE);

    const bootstrappingApiCertificate = new acm.Certificate(
      thisStack,
      `${bootstrappingLambdaApiBaseName}-certificate`,
      {
        domainName,
        validationMethod: acm.ValidationMethod.DNS,
      }
    );

    const bootstrappingApiDomainName = new apigateway.DomainName(
      thisStack,
      `${bootstrappingLambdaApiBaseName}-domain-name`,
      {
        domainName,
        certificate: bootstrappingApiCertificate,
        endpointType: apigateway.EndpointType.REGIONAL,
      }
    );

    bootstrappingApiDomainName.addBasePathMapping(bootstrappingApiGateway, {
      basePath: "",
    });

    new CfnOutput(thisStack, `${bootstrappingLambdaApiBaseName}-hostname`, {
      description: `${bootstrappingLambdaApiBaseName}-hostname`,
      value: `${bootstrappingApiDomainName.domainNameAliasDomainName}`,
    });
  }
}
