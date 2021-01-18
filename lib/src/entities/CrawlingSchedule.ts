import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { CrawlingObject } from "../crawlers/IndexCrawler";
import { CreatedAt } from "./Utils";

@Entity()
export class CrawlingSchedule {

    @PrimaryGeneratedColumn()
    id: number;

    @Column("simple-json")
    startupTarget: CrawlingObject;

    @Column()
    timeSpan: number; // Minutes

    @Column({ default: () => `'${new Date(0).toISOString().slice(0, 19).replace('T', ' ')}'` })
    lastInvokedAt: Date;

    @CreatedAt()
    createdAt: Date;

    @Index()
    @Column({ type: "date", asExpression: "DATE_ADD(lastInvokedAt, INTERVAL timeSpan MINUTE)" })
    pendedUntil: Date;
}