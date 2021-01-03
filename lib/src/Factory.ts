import * as aws from "aws-sdk";
import { Connection, createConnection } from "typeorm";
import { AmazonCrawler } from "./crawlers/AmazonCrawler";
import { YahooAccount } from "./entities/YahooAccount";
import { AmazonRepository } from "./repositories/AmazonRepository";
import { LogRepository } from "./repositories/LogRepository";
import { AmazonScraper } from "./scrapers/AmazonScraper";

export async function createDatabaseConnection(options: object={}) {
    aws.config.loadFromPath('./aws-config.json');
    aws.config.httpOptions = { timeout: 30 * 1000 };
    let connectOption: any = null;
    console.log(__dirname);
    try {
        connectOption = require(`../../ormconfig.json`);
        connectOption.entities = [__dirname + "/entities/**/*.js"];
    } catch(ex) {
        connectOption = require(`../ormconfig.json`);
        connectOption.entities = [__dirname + "/../dist/src/entities/**/*.js"];
    }
    Object.assign(connectOption, options);
    console.log(connectOption.entities);
    const conn = await createConnection(connectOption);
    while(true) {
        try {
            console.log("connecting...");
            await conn.manager.getRepository(YahooAccount).findOne("test");
            return conn;
        } catch(ex) {
            console.log(ex);
            const error = ex.toString() as string;
            if (!error.includes("Communications link failure")) {
                throw ex;
            }
        }
    }
}

export async function createAmazonCrawler() {
    const conn = await createDatabaseConnection();
    const s3 = new aws.S3();
    const rep = new AmazonRepository(conn.manager);
    const logs = new LogRepository(conn.manager);
    return new AmazonCrawler(logs, rep, s3);
}

export async function createAmazonScraper() {
    const conn = await createDatabaseConnection();
    const s3 = new aws.S3();
    const rep = new AmazonRepository(conn.manager);
    return new AmazonScraper(rep, s3);
}