import { Column, JoinColumn, ManyToOne, RelationId } from "typeorm";
import { YahooAuctionDeal } from "./website/YahooAuctionDeal";
import { YahooAuctionExhibit } from "./website/YahooAuctionExhibit";


class Explain {

    // カラム'aid'に外部キー制約が設定され、aidに値は代入される
    // aidによってUPDATEやINSERTを行う
    @Column("char", { length: 10 })
    aid: string;
    @ManyToOne(type => YahooAuctionDeal, deal => deal.states, { nullable: false })
    @JoinColumn({ name: "aid" })
    auction: YahooAuctionDeal;

    // カラム'auction2Id'に外部キー制約が設定され、auction2Id.aidに値は代入される
    // auction2Id.aidによってUPDATEやINSERTを行う
    @ManyToOne(type => YahooAuctionDeal, deal => deal.states, { nullable: false })
    @JoinColumn({ name: "aid" })
    auction2: YahooAuctionDeal;

    // カラム'aid2'に外部キー制約が設定され、aid2に値は代入される
    // auction3.aidによってUPDATEやINSERTを行う
    @ManyToOne(type => YahooAuctionDeal, deal => deal.states, { nullable: false })
    @JoinColumn()
    auction3: YahooAuctionDeal;
    @RelationId((deal: YahooAuctionDeal) => deal.states)
    aid2: string;
}