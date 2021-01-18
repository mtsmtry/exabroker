import { BaseEntity, Column, Entity, Index, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { CrawlingObject } from "../crawlers/IndexCrawler";
import { CreatedAt, UpdatedAt } from "./Utils";

export enum CrawlingResult {
    COMPLETED = "completed",
    FAILED = "failed"
}

@Entity()
export class CrawlingRecord {
    @PrimaryGeneratedColumn()
    id: number;

    @Column("simple-json")
    target: CrawlingObject;

    @Column("varchar", { length: 100 })
    url: string;

    @Column("int", { nullable: true })
    size: number | null;

    @Column("int", { nullable: true })
    downloadLatency: number | null;

    @Column("int", { nullable: true })
    uploadLatency: number | null;

    @Column("int", { nullable: true })
    processLatency: number | null;

    @Column("int", { nullable: true })
    collectionCount: number | null;

    @Column("varchar", { length: 16 })
    hostIp: string;

    @Column("varchar", { nullable: true })
    proxy: string | null;

    @Column("enum", { enum: CrawlingResult, default: CrawlingResult.COMPLETED })
    result: CrawlingResult;

    @Column("text", { nullable: true })
    error: string | null;

    @Index()
    @CreatedAt()
    timestamp: Date;
}