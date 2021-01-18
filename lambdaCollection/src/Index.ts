import * as lib from "exabroker-lib";
import * as lambda from "aws-lambda";

const collector = lib.createCollectionHandler();

export async function handler(event: lambda.S3CreateEvent, context: lambda.Context) {
    await collector.initWhenNotDone();
    return await collector.handle(event, context);
};