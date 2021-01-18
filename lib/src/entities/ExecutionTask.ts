import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { CrawlingObject } from "../crawlers/IndexCrawler";
import { CreatedAt } from "./Utils";

export enum ExecutionTaskStatus {
    PENDING = "pending",
    RUNNING = "running"
}

@Entity()
export class ExecutionTask {

    @PrimaryGeneratedColumn()
    id: number;

    @Column("simple-json")
    target: CrawlingObject;

    @Column("enum", { enum: ExecutionTaskStatus, default: ExecutionTaskStatus.PENDING })
    status: ExecutionTaskStatus;

    @CreatedAt()
    createdAt: Date;

    @Column({ default: 0 })
    failureCount: number;

    @Column("int", { nullable: true })
    process: number | null;
}