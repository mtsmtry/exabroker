import { Document } from "../html/Html";
import { AmazonRepository } from "../repositories/AmazonRepository";
import { scrapeAmazonItemDetail } from "./AmazonItemDetailScraper";
import { scrapeAmazonBrowseNode } from "./AmazonBrowseNodeScraper";
import * as aws from "aws-sdk";

export class AmazonScraper {
    constructor(private repository: AmazonRepository, private s3: aws.S3) {
    }

    async scrapeS3Object(bucketName: string, objectKey: string) {
        const object = await this.s3.getObject({ Bucket: bucketName, Key: objectKey }).promise();
        if (typeof object.Body == "string") {
            await this.scrape(object.Body, objectKey);
        }
    }

    private async scrape(html: string, key: string) {
        const [kind, name] = key.split("/");
        const doc = new Document(html);
    
        switch (kind) {
            case "browseNodes":
                const [nodeId, pageText] = name.split("-");
                const page = parseInt(pageText);
                const items = await scrapeAmazonBrowseNode(doc, nodeId, page);
                await this.repository.upsertAmazonItems(items);
                break;
            case "items":
                const detail = await scrapeAmazonItemDetail(doc, name);
                if (detail) {
                    await this.repository.upsertAmazonItemDetail(detail);
                }
                break;
        }
    }
}