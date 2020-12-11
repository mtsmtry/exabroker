import "reflect-metadata";
import * as lib from "exabroker-lib";
import * as lambda from "aws-lambda";

let scraper: lib.AmazonScraper;

(async () => {
    scraper = await lib.createAmazonScraper();
})();

export async function handler(event: lambda.S3CreateEvent, context: lambda.Context) {
    const bucketName = event.Records[0].s3.bucket.name;
    const objectKey = event.Records[0].s3.object.key;

    await scraper.scrapeS3Object(bucketName, objectKey);

    return {
        statusCode: 200,
        body: "Success",
    };
};