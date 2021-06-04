import { Handler } from "./Handler";
import * as lambda from "aws-lambda";
import { indexCollection } from "../collections/IndexCollection";
import * as aws from "aws-sdk";
import { Document } from "../system/Document";
import { getRepositories } from "../system/Database";

export class CollectionHandler extends Handler {
    s3: aws.S3;

    async init() {
        const reps = await getRepositories();
        this.s3 = reps.s3;
    }

    async run(bucketName: string, objectKey: string) {
        console.log(`getObject:${bucketName} ${objectKey}`);
        const object = await this.s3.getObject({ Bucket: bucketName, Key: objectKey }).promise();
        const body = object.Body as Buffer;
        const doc = new Document(body.toString());
        await indexCollection.collectItems(doc, objectKey, objectKey);
    }

    async handle(event: lambda.S3CreateEvent, context: lambda.Context) {
        const bucketName = event.Records[0].s3.bucket.name;
        const objectKey = event.Records[0].s3.object.key;

        await this.run(bucketName, objectKey);

        return {
            statusCode: 200,
            body: "Success",
        };
    }
}