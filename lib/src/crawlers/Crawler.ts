import { CrawlingLogKind, LogRepository } from "../repositories/LogRepository";
import { AmazonRepository } from "../repositories/AmazonRepository";
import { scrapeBrowseNode, scrapeBrowseNodeItemCount } from "../scrapers/BrowseNodeScraper";
import * as aws from "aws-sdk";
import * as ProxyAgent from "proxy-agent";
import fetch from "node-fetch";
import { Proxy, ProxyBonanzaClient } from "../api/ProxyBonanza";

export class Crawler {
    constructor(protected logs: LogRepository, private s3: aws.S3) {
    }

    protected async storeWebContent(kind: CrawlingLogKind, url: string, key: string, proxy: Proxy): Promise<[string | null, number]> {
        let downloadLatency: number | null = null;
        let uploadLatency: number | null = null;
        let error: string | null = null;
        let body: string | null = null;
        try {
            const agent = new ProxyAgent(`http://${proxy.login}:${proxy.password}@${proxy.ip}:${proxy.portHttp}`);

            const fetchStart = Date.now();
            const headers = { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36",
                "Cookie": "session-id=358-4357935-0744144; skin=noskin; ubid-acbjp=357-9222803-8284310; session-token=wLI5PuHAO+4cqHkuxCUVK8LYbXqVItwMuIz9nKz17PR45hRm2P10b4d7Fv9NauAGYn3oCItOpwDRuhzKJkA+GwTN4+cf74NvMdjB+ijPWsj5N6KYCwKZjzC0AGPTQlkFwpUAOGJ6OUAbwxd7Sx+ZXjGXXUVtSW1OD/QwOI9tqCA2/Irc9R+0xHEZ3ykiv5dx+Go3rp2ogd7OeSF8TSdt8XUHP5W9rqEYAt46zHIaUnVo2r5Sm6PyUmxQZeCnT1Tz; csm-hit=tb:s-SA39RD0DGRZMKT95M08Y|1609069268747&t:1609069268964&adb:adblk_no; session-id-time=2082787201l; i18n-prefs=JPY" };
            const response = await fetch(url, { agent, timeout: 10 * 1000, headers });
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