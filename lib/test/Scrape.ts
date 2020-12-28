import * as aws from "aws-sdk";
import { Connection, createConnection } from "typeorm";
import { AmazonCrawler } from "../src/crawlers/AmazonCrawler";
import { YahooAccount } from "../src/entities/YahooAccount";
import { createAmazonScraper, createDatabaseConnection } from "../src/Index";
import { AmazonRepository } from "../src/repositories/AmazonRepository";
import { LogRepository } from "../src/repositories/LogRepository";
import { AmazonScraper } from "../src/scrapers/AmazonScraper";


async function main() {
    const scraper = await createAmazonScraper();
    await scraper.scrapeS3Object("exabroker-crawled", "items/B081GRTB4M");
}

main();