import { CodePipeline } from "aws-sdk";
import { Column, Entity, PrimaryColumn } from "typeorm";
import { CreatedAt } from "./Utils";

@Entity()
export class YahooAuction {
    @PrimaryColumn("char", { length: 10 })
    aid: string;

    @Column()
    username: string;

    @Column()
    title: string;

    @Column()
    price: number;

    @CreatedAt()
    startDate: Date;

    @Column()
    endDate: Date;

    @Column()
    category: number;
}