import { CodePipeline } from "aws-sdk";
import { Column, Entity, PrimaryColumn } from "typeorm";
import { CreatedAt } from "../Utils";

export type AuctionImage = { url: string, width: number, height: number };

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

    @Column("datetime", { nullable: true })
    actuallyEndDate: Date | null;

    @Column()
    category: number;

    @Column("simple-json", { nullable: true })
    images: AuctionImage[] | null;
}