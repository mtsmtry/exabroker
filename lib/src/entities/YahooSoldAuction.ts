import { CodePipeline } from "aws-sdk";
import { Column, Entity, Index, PrimaryColumn } from "typeorm";
import { CreatedAt } from "./Utils";

export enum SoldAuctionState {
    NONE = "none",
    INFORMED = "informed",
    PAID = "paid",
    SHIPPED = "shipped",
    RECEIVED = "received",
    CANCELED = "canceled",
    BUNDLE_REQUEST = "bundle_request"
}

export interface BuyerAddress {
    shipFee: number;
    name: string;
    phoneNumber: string;
    postalCode1: string;
    postalCode2: string;
    region: string;
    address: string;
}

export interface AuctionMessage {
    isMe: boolean;
    date: Date;
    body: string;
}

export interface AuctionState {
    date: Date;
    body: string;
}

@Entity()
export class YahooSoldAuction {
    
    @PrimaryColumn("char", { length: 10 })
    aid: string;

    @Column()
    username: string;

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
    @Column("enum", { enum: SoldAuctionState })
    state: SoldAuctionState;

    @Column("simple-json")
    stateHistory: AuctionState[];

    @Column("simple-json", { nullable: true })
    buyerAddress: BuyerAddress | null;

    @Column("simple-json")
    messages: AuctionMessage[];
}