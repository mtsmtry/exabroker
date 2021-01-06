import * as aws from "aws-sdk";
import { Connection, createConnection } from "typeorm";
import { AmazonCrawler } from "../src/crawlers/AmazonCrawler";
import { YahooAccount } from "../src/entities/YahooAccount";
import { createAmazonScraper, createDatabaseConnection } from "../src/Index";
import { AmazonRepository } from "../src/repositories/AmazonRepository";
import { LogRepository } from "../src/repositories/LogRepository";
import { AmazonScraper } from "../src/scrapers/AmazonScraper";
import { scrapeBrowseNode } from "../src/scrapers/BrowseNodeScraper";
import { WebClient } from "../src/web/WebClient";

async function main() {
    const client = new WebClient();
    const doc = await client.get("https://www.amazon.co.jp/s?rh=n%3A3093225051&page=2");
    const items = await scrapeBrowseNode(doc, "", 2);
    console.log(items);
}

main();