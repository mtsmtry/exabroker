import { CodePipeline } from "aws-sdk";
import { Column, Entity, Index, PrimaryColumn } from "typeorm";
import { CreatedAt } from "./Utils";

@Entity()
export class YahooAuctionNotice {
    @PrimaryColumn()
    code: string;

    @Column("char", { length: 10 })
    aid: string;

    @Column()
    type: string;

    @Column()
    date: Date;

    @Column()
    username: string;

    @Column()
    message: string;
}