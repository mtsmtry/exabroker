import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn } from "typeorm";
import { CreatedAt } from "../Utils";
import { AmazonItemState } from "../website/AmazonItemState";
import { ArbYahooAmazon } from "./ArbYahooAmazon";

export enum SyncMethod {
    INITIAL = "initial",
    CHANGE_PRICE = "change_price",
    CANCEL = "cancel"
}

@Entity()
export class ArbYahooAmazonSync {

    @PrimaryColumn()
    id: number;
    @OneToOne(type => ArbYahooAmazon)
    @JoinColumn({ name: "id" })
    arb: ArbYahooAmazon;

    @Column()
    amazonItemStateId: number;
    @ManyToOne(type => AmazonItemState)
    @JoinColumn({ name: "amazonItemStateId" })
    amazonItemState: AmazonItemState;

    @Column("enum", { enum: SyncMethod })
    method: SyncMethod;

    @Column("int", { nullable: true })
    oldPrice: number | null;

    @Column("int", { nullable: true })
    newPrice: number | null;

    @CreatedAt()
    timestamp: Date;
}