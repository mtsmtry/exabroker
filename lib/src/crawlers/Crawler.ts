import { CrawlingLogKind, LogRepository } from "../repositories/LogRepository";
import { AmazonRepository } from "../repositories/AmazonRepository";
import { scrapeBrowseNode, scrapeBrowseNodeItemCount } from "../scrapers/BrowseNodeScraper";
import * as aws from "aws-sdk";
import * as ProxyAgent from "proxy-agent";
import fetch from "node-fetch";
import { Response } from "node-fetch";
import { Proxy, ProxyBonanzaClient } from "../api/ProxyBonanza";

export class Crawler {
    constructor(protected logs: LogRepository, private s3: aws.S3) {
    }

    protected async storeWebContent(kind: CrawlingLogKind, url: string, key: string, proxy?: Proxy): Promise<[string | null, number]> {
        let downloadLatency: number | null = null;
        let uploadLatency: number | null = null;
        let error: string | null = null;
        let body: string | null = null;
        const timeout = 10 * 1000;
        try {
            let response: Response;
            const fetchStart = Date.now();
            if (proxy) {
                const agent = new ProxyAgent(`http://${proxy.login}:${proxy.password}@${proxy.ip}:${proxy.portHttp}`);
                response = await fetch(url, { agent, timeout });
            } else {
                response = await fetch("http://api.scraperapi.com?api_key=68d6de532946616aae283bc9fd0ea7a2&url=" + url, { timeout });
            }
            downloadLatency = Date.now() - fetchStart;

            body = await response.text();
            if (body.length < 10000) {
                if (body.includes("Proxy Authentication Required")) {
                    throw "Proxy Authentication Required";
                } else if (body.includes("To discuss automated access to Amazon data please contact api-services-support@amazon.com")) {
                    throw "Rejected by Amazon due to detected automatic access";
                } else if (body.includes("自動化されたデータにアクセスするには、Amazonデータの自動アクセスについては、api-services-support@amazon.com にお問い合わせください。")) {
                    throw "自動化されたデータにアクセスするには、Amazonデータの自動アクセスについては、api-services-support@amazon.com にお問い合わせください。";
                } else {
                    throw body;
                }
            }
            const bucketName = "exabroker-crawled";

            const putStart = Date.now();
            const result = await this.s3.putObject({ Bucket: bucketName, Key: key, Body: body }).promise();
            if (result.$response.error) {
                throw result.$response.error.message;
            }
            uploadLatency = Date.now() - putStart;
        } catch(ex) {
            console.log(ex);
            error = ex.toString();
        } finally {
            const length = body ? body.length : null;
            const logId = await this.logs.addCrawlingLog(kind, url, proxy, length, downloadLatency, uploadLatency, error);
            return [body, logId];
        }
    }
}