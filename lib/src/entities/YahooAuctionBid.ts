import { CodePipeline } from "aws-sdk";
import { Column, Entity, Index, PrimaryColumn } from "typeorm";
import { CreatedAt } from "./Utils";

export enum BidStatus {
    Pending = "pending",
    Accepted = "accepted",
    Started = "started",
    Paid = "paid",
    Received = "received",
    Feedbacked = "feedbacked"
}

@Entity()
export class YahooAuctionBid {
    
    @PrimaryColumn("char", { length: 10 })
    aid: string;

    @Column()
    username: string;

    @Column()
    sellerId: string;

    @Column()
    title: string;

    @Column()
    price: number;

    @Column("enum", { enum: BidStatus })
    status: BidStatus;

    @CreatedAt()
    bidDate: Date;
}