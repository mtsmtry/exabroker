import * as aws from "aws-sdk";
import { Connection, createConnection } from "typeorm";
import { AmazonRepository } from "./repositories/AmazonRepository";
import { AmazonScraper } from "./scrapers/AmazonScraper";

async function createDatabseConnection() {
    aws.config.loadFromPath('./aws-config.json');
    const connectOption = require(`../ormconfig.json`);
    return await createConnection(connectOption);
}

export async function createAmazonScraper() {
    const conn = await createDatabseConnection();
    const s3 = new aws.S3();
    const rep = new AmazonRepository(conn.manager);
    return new AmazonScraper(rep, s3);
}