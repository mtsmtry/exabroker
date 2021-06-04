import { CodePipeline } from "aws-sdk";
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryColumn } from "typeorm";
import { CreatedAt } from "../Utils";
import { YahooAccount } from "./YahooAccount";
import { YahooAuctionBuyer, YahooAuctionBuyerDto } from "./YahooAuctionBuyer";
import { YahooAuctionExhibit } from "./YahooAuctionExhibit";
import { YahooAuctionMessage, YahooAuctionMessageDto } from "./YahooAuctionMessage";
import { YahooAuctionState, YahooAuctionStateDto } from "./YahooAuctionState";

export enum AuctionDealStatus {
    NONE = "none",
    INFORMED = "informed",
    PAID = "paid",
    SHIPPED = "shipped",
    RECEIVED = "received",
    CANCELED = "canceled",
    BUNDLE_REQUEST = "bundle_request"
}

export interface YahooAuctionDealDto {
    aid: string;
    username: string;
    title: string;
    price: number;
    endDate: Date;
    buyerId: string;
    status: AuctionDealStatus;
    states: YahooAuctionStateDto[];
    buyer: YahooAuctionBuyerDto | null;
    messages: YahooAuctionMessageDto[];
}

@Entity()
export class YahooAuctionDeal {
    
    @PrimaryColumn("char", { length: 10 })
    aid: string;
    @OneToOne(type => YahooAuctionExhibit)
    @JoinColumn({ name: "exhibit" })
    exhibit: YahooAuctionExhibit;

    @Column()
    username: string;
    @ManyToOne(type => YahooAccount)
    @JoinColumn({ name: "username" })
    account: YahooAccount;

    @Column()
    title: string;

    @Column()
    price: number;

    @Index()
    @Column()
    endDate: Date;

    @Column()
    buyerId: string;

    @Index()
    @Column("enum", { enum: AuctionDealStatus })
    status: AuctionDealStatus;

    @OneToMany(type => YahooAuctionState, state => state.deal)
    states: YahooAuctionState[];

    @OneToOne(type => YahooAuctionBuyer, buyer => buyer.deal)
    buyer: YahooAuctionBuyer | null;

    @OneToMany(type => YahooAuctionMessage, msg => msg.deal)
    messages: YahooAuctionMessage[];
}