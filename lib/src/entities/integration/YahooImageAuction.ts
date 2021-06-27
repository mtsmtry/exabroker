import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn, PrimaryGeneratedColumn, Unique } from "typeorm";
import { AmazonItem } from "../website/AmazonItem";
import { AmazonItemDetail } from "../website/AmazonItemDetail";
import { AmazonItemState } from "../website/AmazonItemState";
import { AmazonOrder } from "../website/AmazonOrder";
import { YahooAuctionExhibit } from "../website/YahooAuctionExhibit";
import { YahooAuctionDeal } from "../website/YahooAuctionDeal";

@Entity()
export class YahooImageAuction {

    @PrimaryGeneratedColumn()
    id: number;

    @Column("char", { length: 10 })
    aid: string;

    @OneToOne(type => YahooAuctionExhibit)
    @JoinColumn({ name: "aid" })
    exhibit: YahooAuctionExhibit;

    @OneToOne(type => YahooAuctionDeal)
    @JoinColumn({ name: "aid"})
    deal: YahooAuctionDeal;
}
