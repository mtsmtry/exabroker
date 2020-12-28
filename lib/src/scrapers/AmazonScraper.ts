import { Document } from "../web/WebClient";
import { AmazonRepository } from "../repositories/AmazonRepository";
import { scrapeAmazonItemDetail } from "./AmazonItemDetailScraper";
import { scrapeBrowseNode } from "./BrowseNodeScraper";
import * as aws from "aws-sdk";

export class AmazonScraper {
    constructor(private repository: AmazonRepository, private s3: aws.S3) {
    }

    async scrapeS3Object(bucketName: string, objectKey: string) {
        const object = await this.s3.getObject({ Bucket: bucketName, Key: objectKey }).promise();
        const body = object.Body as Buffer;
        return await this.scrape(body.toString(), objectKey);
    }

    private async scrape(html: string, key: string) {
        const [kind, name] = key.split("/");
        const doc = new Document(html);
    
        switch (kind) {
            case "browseNodes":
                const [nodeId, pageText] = name.split("-");
                const page = parseInt(pageText);
                const items = await scrapeBrowseNode(doc, nodeId, page);
                await this.repository.upsertAmazonItems(items);
                return items;
            case "items":
                const detail = await scrapeAmazonItemDetail(doc, name);
                if (detail) {
                    console.log(detail);
                    await this.repository.upsertAmazonItemDetail(detail);
                }
                return detail;
        }
    }
}