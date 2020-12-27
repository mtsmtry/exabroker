import { BaseEntity, Column, Entity, Index, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { CreatedAt, UpdatedAt } from "./Utils";

export enum CrawlingResult {
    COMPLETED = "completed",
    FAILED = "failed"
}

@Entity()
export class CrawlingLog {
    @PrimaryGeneratedColumn()
    id: number;

    @Column("varchar", { length: 20 })
    kind: string;

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
    extractCount: number | null;

    @Column("varchar", { length: 16 })
    hostIp: string;

    @Column("varchar")
    proxyIp: string;

    @Column("varchar", { length: 30 })
    proxyRegion: string;

    @Column("varchar", { length: 10 })
    proxyCountry: string;

    @Column("enum", { enum: CrawlingResult, default: CrawlingResult.COMPLETED })
    result: CrawlingResult;

    @Column("text", { nullable: true })
    error: string | null;

    @Index()
    @CreatedAt()
    timestamp: Date;
}