import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { YahooAuctionDeal } from "./YahooAuctionDeal";

export interface YahooAuctionBuyerDto {
    shipFee: number;
    fullName: string;
    phoneNumber: string;
    postalCode1: string;
    postalCode2: string;
    region: string;
    address: string;
}

@Entity()
export class YahooAuctionBuyer {

    @PrimaryColumn("char", { length: 10 })
    aid: string;
    @OneToOne(type => YahooAuctionDeal, deal => deal.buyer)
    @JoinColumn({ name: "aid" })
    deal: YahooAuctionDeal;

    @Column()
    shipFee: number;

    @Column()
    fullName: string;

    @Column()
    phoneNumber: string;

    @Column()
    postalCode1: string;

    @Column()
    postalCode2: string;

    @Column()
    region: string;

    @Column()
    address: string;
}
