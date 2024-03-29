import { EntityManager, Repository } from "typeorm";
import { Proxy } from "../executions/ProxyBonanza";
import { AmazonItem } from "../entities/website/AmazonItem";
import { AmazonItemDetail } from "../entities/website/AmazonItemDetail";
import { BrowseNode } from "../entities/BrowseNode";
import { CollectionRecord } from "../entities/system/CollectionRecord";
import { CollectionException } from "../entities/system/CollectionException";
import { getException } from "./Utils";

export interface CollectionExceptionDto {
    function: string;
    message: string;
}

export class CollectionRepository {
    records: Repository<CollectionRecord>;
    exceptions: Repository<CollectionException>;

    constructor(mng: EntityManager) {
        this.records = mng.getRepository(CollectionRecord);
        this.exceptions = mng.getRepository(CollectionException);
    }

    async createRecord(dto: {
        url: string,
        itemCount: number,
        successCount: number,
        propertyCounts: { [prop: string]: number },
        error: object | null
    }) {
        let record = this.records.create({
            url: dto.url,
            itemCount: dto.itemCount,
            successCount: dto.successCount,
            propertyCounts: dto.propertyCounts,
            error: getException(dto.error)
        });
        record = await this.records.save(record);
        return record.id;
    }

    async createExceptions(recordId: number, url: string, dtos: CollectionExceptionDto[]) {
        const exceptions = dtos.map(x => this.exceptions.create({
            recordId,
            url,
            function: x.function,
            message: x.message
        }));;
        await this.exceptions.save(exceptions);
    }
}