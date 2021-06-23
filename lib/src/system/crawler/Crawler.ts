import { Collection } from "../collection/Collection";
import * as aws from "aws-sdk";
import fetch from "node-fetch";
import { CrawlingRepository } from "../../repositories/CrawlingRepository";
import { getRepositories } from "../Database";
import { Document } from "../Document";
import { CrawlingObject } from "../../crawlers/IndexCrawler";

const bucketName = "exabroker-crawled";
const timeout = 10000;

export interface PageCrawling<T> {
    getUrl(val: T): string;
    getNextCrawlings(val: T, itemCount: number): CrawlingObject[];
    collection: Collection<T>;
}

export class Crawler<T> {

    static page<T>(src: PageCrawling<T>) {
        return new CrawlerPage(src);
    }

    static branch<T>() {
        return new CrawlerBranch<T>();
    }

    async crawl(taskId: number, target: T) {
        const reps = await getRepositories();
        return this.crawlImpl(taskId, target, reps.crawling);
    }

    async crawlImpl(taskId: number, target: T, rep: CrawlingRepository): Promise<any> {
        return null;
    }
}

export class CrawlerPage<T> extends Crawler<T> {

    constructor(private config: PageCrawling<T>) {
        super();
    }

    async crawlImpl(taskId: number, target: T, rep: CrawlingRepository) {
        const url = this.config.getUrl(target);

        let downloadLatency: number | null = null;
        let uploadLatency: number | null = null;
        let processLatency: number | null = null;
        let error: string | null = null;
        let body: string | null = null;
        let collectionCount: number | null = null;
        let collectionResult: any = null;
        const timeout = 60 * 1000; // Scraperapi
        try {
            // Download
            const downloadStart = Date.now();
            const response = await fetch("http://api.scraperapi.com?api_key=68d6de532946616aae283bc9fd0ea7a2&url=" + encodeURIComponent(url), { timeout });
            downloadLatency = Date.now() - downloadStart;
            body = await response.text();

            if (body.length < 5000) {
                throw body;
            }

            // Upload
            /*const putStart = Date.now();
            const reps = await getRepositories();
            const result = await reps.s3.putObject({ Bucket: bucketName, Key: key, Body: body }).promise();
            if (result.$response.error) {
                throw result.$response.error.message;
            }
            uploadLatency = Date.now() - putStart;*/

            // Collection
            const doc = new Document(body);
            collectionResult = (await this.config.collection.collectItems(doc, target, url)).result;

            // Process
            const processStart = Date.now();
            collectionCount = this.config.collection.getItemCount(doc, target);
            processLatency = Date.now() - processStart;
            const nexts = this.config.getNextCrawlings(target, collectionCount);
            await rep.createTasks(nexts);

        } catch (ex) {
            console.log(ex);
            error = ex;
        } finally {
            const textCount = body ? body.length : null;
            await rep.completeTask(taskId, {
                target: target as any, url, proxy: "scraperapi", 
                textCount, downloadLatency, uploadLatency, processLatency, collectionCount, error
            });
        }

        return collectionResult;
    }
}

export class CrawlerBranch<T> extends Crawler<T> {
    cases: { crawler: Crawler<any>, get: (val: T) => any | null }[] = [];

    case<T2>(crawler: Crawler<T2>, get: (val: T) => T2 | null) {
        this.cases.push({ crawler, get });
        return this;
    }

    async crawlImpl(taskId: number, target: T, rep: CrawlingRepository) {
        for (let i = 0; i < this.cases.length; i++) {
            const x = this.cases[i];
            const obj = x.get(target);
            if (obj) {
                return x.crawler.crawl(taskId, obj);
            }
        }
        await rep.completeTask(taskId, {
            target: target as any,
            url: "",
            proxy: null,
            textCount: null,
            downloadLatency: null,
            uploadLatency: null,
            processLatency: null,
            collectionCount: null,
            error: "Not matched all cases"
        });
        return null;
    }
}