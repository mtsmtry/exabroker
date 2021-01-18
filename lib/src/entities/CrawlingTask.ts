import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { CrawlingObject } from "../crawlers/IndexCrawler";
import { CreatedAt } from "./Utils";

export enum CrawlingTaskStatus {
    PENDING = "pending",
    RUNNING = "running"
}

@Entity()
export class CrawlingTask {

    @PrimaryGeneratedColumn()
    id: number;

    @Column("simple-json")
    target: CrawlingObject;

    @Column("enum", { enum: CrawlingTaskStatus, default: CrawlingTaskStatus.PENDING })
    status: CrawlingTaskStatus;

    @CreatedAt()
    createdAt: Date;

    @Column({ default: 0 })
    failureCount: number;

    @Column("int", { nullable: true })
    process: number | null;
}