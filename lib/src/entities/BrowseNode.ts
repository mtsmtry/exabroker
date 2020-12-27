import { BaseEntity, Column, Entity, PrimaryColumn } from "typeorm";
import { UpdatedAt } from "./Utils";

export enum CrawlingStatus {
    PENDING = "pending",
    RUNNING = "running",
    COMPLETED = "completed" 
}

@Entity()
export class BrowseNode {
    @PrimaryColumn("char", { length: 10 })
    nodeId: string;

    @Column("varchar", { length: 100 })
    name: string;

    @Column()
    level: number;

    @Column()
    latestPage: number;

    @Column({
        type: "enum",
        enum: CrawlingStatus
    })
    status: CrawlingStatus;

    @Column("int", { nullable: true })
    process: number | null;

    @UpdatedAt()
    updatedAt: Date;
}