import { EntityManager, LessThan, MoreThan, Repository } from "typeorm";
import { Proxy } from "../executions/ProxyBonanza";
import { AmazonItem } from "../entities/website/AmazonItem";
import { AmazonItemDetail } from "../entities/website/AmazonItemDetail";
import { BrowseNode } from "../entities/BrowseNode";
import { CrawlingRecord, CrawlingResult } from "../entities/system/CrawlingRecord";
import * as ip from "ip";
import { CrawlingObject } from "../crawlers/IndexCrawler";
import { CrawlingTask, CrawlingTaskStatus } from "../entities/system/CrawlingTask";
import { randomPositiveInteger } from "../Utils";
import { getException } from "./Utils";

export class CrawlingRepository {
    records: Repository<CrawlingRecord>;
    tasks: Repository<CrawlingTask>;
    hostIp: string;

    constructor(mng: EntityManager) {
        this.records = mng.getRepository(CrawlingRecord);
        this.tasks = mng.getRepository(CrawlingTask);
        this.hostIp = ip.address();
    }

    async completeTask(taskId: number, dto: {
        target: CrawlingObject,
        url: string,
        proxy: string | null,
        textCount: number | null,
        downloadLatency: number | null,
        uploadLatency: number | null,
        processLatency: number | null,
        collectionCount: number | null,
        error: object | string | null
    }) {
        if (dto.error) {
            await this.tasks.update(taskId, { status: CrawlingTaskStatus.PENDING });
        } else {
            await this.tasks.delete(taskId);
        }

        const log = this.records.create({
            target: dto.target,
            url: dto.url,
            size: dto.textCount ? dto.textCount * 4 : null,
            downloadLatency: dto.downloadLatency,
            uploadLatency: dto.uploadLatency,
            processLatency: dto.processLatency,
            collectionCount: dto.collectionCount,
            hostIp: this.hostIp,
            proxy: dto.proxy,
            result: dto.error ? CrawlingResult.FAILED : CrawlingResult.COMPLETED,
            error: getException(dto.error)
        });
        await this.records.save(log);
    }

    async createTasks(targets: CrawlingObject[]) {
        const tasks = targets.map(x => this.tasks.create({ target: x }));
        await this.tasks.save(tasks);
    }

    async getTasks(count: number) {
        const process = randomPositiveInteger();

        await this.tasks
            .createQueryBuilder()
            .update()
            .set({ status: CrawlingTaskStatus.RUNNING, process })
            .where({ status: CrawlingTaskStatus.PENDING })
            .orderBy("id", "ASC")
            .limit(count)
            .execute();

        return await this.tasks
            .createQueryBuilder()
            .where({ status: CrawlingTaskStatus.RUNNING, process })
            .getMany();
    }

    async existsTask() {
        const taskCount = await this.tasks.count();
        return taskCount > 0;
    }

    async stopAllRunningTasks() {
        await this.tasks.createQueryBuilder()
            .update()
            .set({ status: CrawlingTaskStatus.PENDING })
            .where({ status: CrawlingTaskStatus.RUNNING })
            .execute();
    }
}