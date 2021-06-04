import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn, PrimaryGeneratedColumn, Unique } from "typeorm";
import { AmazonItem } from "../website/AmazonItem";
import { AmazonItemDetail } from "../website/AmazonItemDetail";
import { AmazonItemState } from "../website/AmazonItemState";
import { AmazonOrder } from "../website/AmazonOrder";
import { YahooAuctionExhibit } from "../website/YahooAuctionExhibit";

@Entity()
export class ArbYahooAmazon {

    @PrimaryGeneratedColumn()
    id: number;

    @Column("char", { length: 10 })
    aid: string;
    @OneToOne(type => YahooAuctionExhibit)
    @JoinColumn({ name: "aid" })
    exhibit: YahooAuctionExhibit;

    @Column("char", { length: 10 })
    asin: string;
    @ManyToOne(type => AmazonItem)
    @JoinColumn({ name: "asin" })
    item: AmazonItem;

    @Column("datetime", { nullable: true })
    amazonCheckedAt: Date | null;
}