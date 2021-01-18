import { EntityManager, Repository } from "typeorm";
import { Proxy } from "../executions/ProxyBonanza";
import { AmazonItem } from "../entities/AmazonItem";
import { AmazonItemDetail } from "../entities/AmazonItemDetail";
import { BrowseNode } from "../entities/BrowseNode";
import { CollectionRecord } from "../entities/CollectionRecord";
import { CollectionException } from "../entities/CollectionException";
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
        s3Key: string,
        itemCount: number,
        successCount: number,
        propertyCounts: { [prop: string]: number },
        error: object | null
    }) {
        let record = this.records.create({
            s3Key: dto.s3Key,
            itemCount: dto.itemCount,
            successCount: dto.successCount,
            propertyCounts: dto.propertyCounts,
            error: getException(dto.error)
        });
        record = await this.records.save(record);
        return record.id;
    }

    async createExceptions(recordId: number, s3Key: string, dtos: CollectionExceptionDto[]) {
        const exceptions = dtos.map(x => this.exceptions.create({
            recordId,
            s3Key,
            function: x.function,
            message: x.message
        }));;
        await this.exceptions.save(exceptions);
    }
}