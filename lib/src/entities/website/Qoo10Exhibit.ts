import { CodePipeline } from "aws-sdk";
import { Column, Entity, PrimaryColumn } from "typeorm";
import { CreatedAt } from "../Utils";

@Entity()
export class Qoo10Exhibit {
    
    @PrimaryColumn("char", { length: 9 })
    itemCode: string;

    @Column()
    userId: string;

    @Column()
    title: string;

    @Column()
    price: number;

    @CreatedAt()
    exhibitedAt: Date;

    @Column("datetime", { nullable: true })
    deletedAt: Date | null;
}