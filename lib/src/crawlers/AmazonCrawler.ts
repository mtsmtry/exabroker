import { AmazonRepository } from "../repositories/AmazonRepository";
import { scrapeAmazonBrowseNode, scrapeAmazonBrowseNodeItemCount } from "../scrapers/AmazonBrowseNodeScraper";
import * as aws from "aws-sdk";
import fetch from "node-fetch";
import { Document } from "../html/Html";

export class AmazonCrawler {
    constructor(private repository: AmazonRepository, private s3: aws.S3) {
    }

    private async storeWebContent(url: string, key: string) {
        const response = await fetch(url);
        const body = response.text();
        const bucketName = process.env.BUCKET_NAME;
        if (!bucketName) {
            throw "BUCKET_NAME is undefined";
        }
        await this.s3.putObject({ Bucket: bucketName, Key: key, Body: body });
        return body;
    }

    private async crawlBrowseNode(nodeId: string, page: number) {
        const url = `https://www.amazon.co.jp/b/?node=${nodeId}&page=${page}`;
        const html = await this.storeWebContent(url, `browseNodes/${nodeId}-${page}`);
        const doc = new Document(html);
        const items = await scrapeAmazonBrowseNodeItemCount(doc);
        return items > 0;
    }

    private async crawlAmazonItemDetail(asin: string) {
        const url = `https://www.amazon.co.jp/dp/${asin}`;
        this.storeWebContent(url, `items/${asin}`);
    }

    async crawlBrowseNodes() {
        while(true) {
            const nodes = await this.repository.getCrawlingBrowseNodes(100);
            if (nodes.length == 0) {
                return null;
            }
            const promises = nodes.map(async node => {
                const hasItem = await this.crawlBrowseNode(node.nodeId, node.latestPage + 1);
                await this.repository.completeBrowseNodeCrawling(node.nodeId, node.latestPage + 1, hasItem);
            });
            await Promise.all(promises);
        }
    }
}