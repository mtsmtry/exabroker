import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn } from "typeorm";
import { ArbYahooAmazonSold } from "./ArbYahooAmazonSold";
import { AmazonItemState } from "../website/AmazonItemState";

export enum CancelAuctionMessageStatus {
    BEFORE_PAYMENT = "before_payment",
    AFTER_PAYMENT = "after_payment"
}

export enum CancelReason {
    EXPENSIVE = "expensive",
    OUT_OF_STOCK = "out_of_stock",
    IS_ADDON = "is_addon"
}

export class ArbYahooAmazonCanceledDto {
    arbId: number;
    amazonItemStateId: number;
    cancelReason: CancelReason;
}

@Entity()
export class ArbYahooAmazonCanceled {

    @PrimaryColumn()
    id: number;
    @OneToOne(type => ArbYahooAmazonSold)
    @JoinColumn({ name: "id" })
    sold: ArbYahooAmazonSold;

    @Column()
    amazonItemStateId: number;
    @ManyToOne(type => AmazonItemState)
    @JoinColumn({ name: "amazonItemStateId" })
    amazonItemState: AmazonItemState;
    
    @Column()
    cancelReason: CancelReason;

    @Column("enum", { enum: CancelAuctionMessageStatus, nullable: true })
    messageStatus: CancelAuctionMessageStatus | null;

    @Column("tinyint", { default: false })
    repaid: boolean;
}

//165	expensive	NULL	1
//1755	expensive	NULL	24