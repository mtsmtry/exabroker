import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { AmazonItem } from "../website/AmazonItem";
import { AmazonOrder } from "../website/AmazonOrder";
import { YahooAuctionDeal } from "../website/YahooAuctionDeal";
import { ArbYahooAmazon } from "./ArbYahooAmazon";
import { ArbYahooAmazonCanceled } from "./ArbYahooAmazonCanceled";

export enum MessageStatus {
    INITIAL = "initial",
    SHIPPING = "shipping",
    DELIVER_INFO = "deliver_info",
    COMPLETED_DELIVER_INFO = "completed_deliver_info",
    ABSENCE_DELIVER_INFO = "absence_deliver_info"
}

@Entity()
export class ArbYahooAmazonSold {

    @PrimaryColumn()
    id: number;
    @OneToOne(type => ArbYahooAmazon)
    @JoinColumn({ name: "id" })
    arb: ArbYahooAmazon;

    @Column("char", { length: 10 })
    aid: string;
    @OneToOne(type => YahooAuctionDeal)
    @JoinColumn({ name: "aid" })
    deal: YahooAuctionDeal;

    @Column("varchar", { nullable: true })
    orderId: string | null;
    @OneToOne(type => AmazonOrder)
    @JoinColumn({ name: "orderId" })
    order: AmazonOrder;

    @Column("enum", { enum: MessageStatus, nullable: true })
    messageStatus: MessageStatus | null;

    @Column("tinyint", { default: false })
    leftFeedback: boolean;

    @OneToOne(type => ArbYahooAmazonCanceled, canceled => canceled.sold)
    canceled: ArbYahooAmazonCanceled | null;
}