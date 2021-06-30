

import { CodePipeline } from "aws-sdk";
import { CreatedAt, UpdatedAt } from "../Utils";
import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn, PrimaryGeneratedColumn, Unique } from "typeorm";
import { AmazonItem } from "../website/AmazonItem";
import { AmazonItemDetail } from "../website/AmazonItemDetail";
import { AmazonItemState } from "../website/AmazonItemState";
import { AmazonOrder } from "../website/AmazonOrder";
import { YahooAuctionExhibit } from "../website/YahooAuctionExhibit";

@Entity()
export class YahooAuctionHistory {
    
    @PrimaryColumn("char", { length: 10 })
    asin: string;
    @OneToOne(type => AmazonItem)
    @JoinColumn({ name: "asin" })
    item: AmazonItem;

    @Column()
    dealCount: number;

    @UpdatedAt()
    timestamp: Date;
}