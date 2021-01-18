import { BaseEntity, Column, Entity, PrimaryColumn } from "typeorm";
import { UpdatedAt } from "./Utils";

@Entity()
export class BrowseNode {
    @PrimaryColumn("char", { length: 10 })
    nodeId: string;

    @Column("varchar", { length: 100 })
    name: string;

    @Column()
    level: number;

    @UpdatedAt()
    updatedAt: Date;
}