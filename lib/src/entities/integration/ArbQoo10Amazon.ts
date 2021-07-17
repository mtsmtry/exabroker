import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn, PrimaryGeneratedColumn, Unique } from "typeorm";
import { AmazonItem } from "../website/AmazonItem";
import { AmazonItemDetail } from "../website/AmazonItemDetail";
import { AmazonItemState } from "../website/AmazonItemState";
import { AmazonOrder } from "../website/AmazonOrder";
import { Qoo10Exhibit } from "../website/Qoo10Exhibit";
import { YahooAuctionExhibit } from "../website/YahooAuctionExhibit";

@Entity()
export class ArbQoo10Amazon {

    @PrimaryGeneratedColumn()
    id: number;

    @Column("char", { length: 9 })
    itemCode: string;
    @OneToOne(type => Qoo10Exhibit)
    @JoinColumn({ name: "goodsNo" })
    exhibit: Qoo10Exhibit;

    @Column("char", { length: 10 })
    asin: string;
    @ManyToOne(type => AmazonItem)
    @JoinColumn({ name: "asin" })
    item: AmazonItem;

    @Column("datetime", { nullable: true })
    amazonCheckedAt: Date | null;
}