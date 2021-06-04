import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { AuctionDealStatus, YahooAuctionDeal } from "./YahooAuctionDeal";

export interface YahooAuctionStateDto {
    date: Date;
    body: string;
    state: AuctionState | null;
}

export enum AuctionState {
    INFORMED = "informed",
    PAID = "paid",
    SHIPPED = "shipped",
    RECEIVED = "received"
}

@Entity()
export class YahooAuctionState {

    @PrimaryGeneratedColumn()
    id: number;

    @Column("char", { length: 10 })
    aid: string;
    @ManyToOne(type => YahooAuctionDeal, deal => deal.states)
    @JoinColumn({ name: "aid" })
    deal: YahooAuctionDeal;

    @Column()
    date: Date;

    @Column("text")
    body: string;

    @Column("enum", { enum: AuctionState, nullable: true })
    state: AuctionState | null;
}