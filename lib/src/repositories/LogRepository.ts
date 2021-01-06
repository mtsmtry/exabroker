import { EntityManager, Repository } from "typeorm";
import { Proxy } from "../executions/ProxyBonanza";
import { AmazonItem } from "../entities/AmazonItem";
import { AmazonItemDetail } from "../entities/AmazonItemDetail";
import { BrowseNode, CrawlingStatus } from "../entities/BrowseNode";
import { CrawlingLog, CrawlingResult } from "../entities/CrawlingLog";
import * as ip from "ip";

export enum CrawlingLogKind {
    BROWSE_NODE = "BrowseNode", AMAZON_ITEM = "AmazonItem"
}

export class LogRepository {
    logs: Repository<CrawlingLog>;
    hostIp: string;

    constructor(mng: EntityManager) {
        this.logs = mng.getRepository(CrawlingLog);
        this.hostIp = ip.address();
    }

    async addCrawlingLog(kind: CrawlingLogKind, url: string, proxy: Proxy | undefined, textCount: number | null, downloadLatency: number| null, uploadLatency: number| null, error: string | null) {
        const log = this.logs.create({
            kind, 
            url, 
            size: textCount ? textCount * 4 : null, 
            downloadLatency, 
            uploadLatency, 
            hostIp: this.hostIp,
            proxyIp: proxy?.ip || "", 
            proxyRegion: proxy?.detail?.proxyserver.georegion.name || "",
            proxyCountry: proxy?.detail?.proxyserver.georegion.country.name || "",
            result: error ? CrawlingResult.FAILED : CrawlingResult.COMPLETED,
            error
        });
        const result2 = await this.logs.insert(log);
        return result2.identifiers[0].id as number;
    }

    async setAddtionalData(id: number, extractCount: number | null, processLatency: number | null) {
        await this.logs.update(id, { extractCount, processLatency });
    }

    async setError(id: number, error: string | null) {
        await this.logs.update(id, { result: CrawlingResult.FAILED, error })
    }
}