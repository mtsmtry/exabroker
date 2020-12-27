import { AmazonRepository } from "../repositories/AmazonRepository";
import { scrapeBrowseNode, scrapeBrowseNodeItemCount } from "../scrapers/BrowseNodeScraper";
import * as aws from "aws-sdk";
import * as ProxyAgent from "proxy-agent";
import fetch from "node-fetch";
import { Document } from "../web/WebClient";
import { Proxy, ProxyBonanzaClient } from "../api/ProxyBonanza";
import { Crawler } from "./Crawler";
import { CrawlingLogKind, LogRepository } from "../repositories/LogRepository";
import { CrawlingResult } from "../entities/CrawlingLog";
import { CrawlingStatus } from "../entities/BrowseNode";

function splitArray<T>(arr: T[], n: number){
    const arrList: T[][] = [];
    let i = 0;
    while(i < arr.length){
        arrList.push(arr.splice(i, i + n));
    }
    return arrList;
  }

export class AmazonCrawler extends Crawler {
    proxyClient: ProxyBonanzaClient;

    constructor(
        logs: LogRepository, 
        private repository: AmazonRepository,
        s3: aws.S3) {
        super(logs, s3);
        this.proxyClient = new ProxyBonanzaClient();
    }

    private async crawlBrowseNode(nodeId: string, page: number, proxy: Proxy) {
        const url = `https://www.amazon.co.jp/b/?node=${nodeId}&page=${page}`;
        const [html, logId] = await this.storeWebContent(CrawlingLogKind.BROWSE_NODE, url, `browseNodes/${nodeId}-${page}`, proxy);
        if (html) { 
            try {
                const start = Date.now();
                const doc = new Document(html);
                const items = await scrapeBrowseNodeItemCount(doc);
                await this.logs.setAddtionalData(logId, items, Date.now() - start);
                return items > 0;
            } catch(ex) {
                console.log(ex);
                await this.logs.setError(logId, ex.toString());
            }
        } 
        return null;
    }

    private async crawlAmazonItemDetail(asin: string, proxy: Proxy) {
        const url = `https://www.amazon.co.jp/dp/${asin}`;
        const [_, logId] = await this.storeWebContent(CrawlingLogKind.AMAZON_ITEM, url, `items/${asin}`, proxy);
    }

    async initCrawling() {
        await this.repository.cancelAllRunningBrowseNodeCrawling();
    }

    async crawlBrowseNodes() {
        const proxies = await this.proxyClient.getProxies();
        while(true) {
            const nodes = await this.repository.getCrawlingBrowseNodes(100);
            console.log("getCrawlingBrowseNodes:" + nodes.length);
            if (nodes.length == 0) {
                if (await this.repository.checkAllCompleted()) {
                    console.log("All completed!");
                    await this.repository.resetAllBrowseNodeCrawling();
                    console.log("Reset crawling!");
                }
            } else {
                let completeCount = 0;
                const promises = nodes.map(async (node, i) => {
                    const proxy = proxies[i % proxies.length];
                    const hasItem = await this.crawlBrowseNode(node.nodeId, node.latestPage + 1, proxy);
                    completeCount++;
                    if (hasItem !== null) {
                        await this.repository.completeBrowseNodeCrawling(node.nodeId, node.latestPage + 1, hasItem);
                        console.log(`${completeCount}/${nodes.length}: completed`);
                    } else {
                        await this.repository.failedBrowseNodeCrawling(node.nodeId, node.latestPage + 1);
                        console.log(`${completeCount}/${nodes.length}: failed`);
                    }
                });
                await Promise.all(promises);
                console.log("Promise.all finished!");
            }
        }
    }

    async crawlItemDetails2() {
        const proxy: Proxy = {
            ip: "gate.smartproxy.com",
            login: "sp599caca7",
            password: "rr0712",
            portHttp: 7000,
            detail: null
        };
        while(true) {
            const asins = await this.repository.getCrawlingASINs(10);
            if (asins.length == 0) {
                console.log("All completed!");
                return;
            }
            console.log("getCrawlingASINs:" + asins.length);
            let completeCount = 0;
            const promises = asins.map(async (asin) => {
                await this.crawlAmazonItemDetail(asin, proxy);
                completeCount++;
                console.log(`${completeCount}/${asins.length}: completed`);
            });
            await Promise.all(promises);
            console.log("Promise.all finished!");
        }
    }

    async crawlItemDetails5() {
        const proxies = await this.proxyClient.getProxies();
        while(true) {
            const asins = await this.repository.getCrawlingASINs(proxies.length);
            if (asins.length == 0) {
                console.log("All completed!");
                return;
            }
            console.log("getCrawlingASINs:" + asins.length);
            let completeCount = 0;
            const promises = asins.map(async (asin, i) => {
                const proxy = proxies[i];
                await this.crawlAmazonItemDetail(asin, proxy);
                completeCount++;
                console.log(`${completeCount}/${asins.length}: completed`);
            });
            await Promise.all(promises);
            console.log("Promise.all finished!");
        }
    }

    async crawlItemDetails() {
        const N = 10;
        const proxies = await this.proxyClient.getProxies();
        const proxySets = splitArray(proxies, N);
        while(true) {
            for(let i = 0; i < proxySets.length; i++) {
                const proxySet = proxySets[i];
                const asins = await this.repository.getCrawlingASINs(proxySet.length);
                if (asins.length == 0) {
                    console.log("All completed!");
                    return;
                }
                console.log("getCrawlingASINs:" + asins.length);
                let completeCount = 0;
                const promises = asins.map(async (asin, j) => {
                    const proxy = proxySet[j];
                    await this.crawlAmazonItemDetail(asin, proxy);
                    completeCount++;
                    console.log(`${completeCount}/${asins.length}: completed`);
                });
                await Promise.all(promises);
                console.log("Promise.all finished!");
            }
        }
    }

    async crawl() {
        await this.crawlItemDetails();
    }
}