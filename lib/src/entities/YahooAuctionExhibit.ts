import { CodePipeline } from "aws-sdk";
import { Column, Entity, PrimaryColumn } from "typeorm";
import { CreatedAt } from "./Utils";

@Entity()
export class YahooAuctionExhibit {
    
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

    @Column("char", { length: 10, nullable: true })
    asin: string | null;
}