import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { YahooAuctionDeal } from "./YahooAuctionDeal";

export interface YahooAuctionMessageDto {
    isMe: boolean;
    date: Date;
    body: string;
}

@Entity()
export class YahooAuctionMessage {

    @PrimaryGeneratedColumn()
    id: number;

    @Column("char", { length: 10 })
    aid: string;
    @ManyToOne(type => YahooAuctionDeal, deal => deal.messages)
    @JoinColumn({ name: "aid" })
    deal: YahooAuctionDeal;

    @Column()
    isMe: boolean;

    @Column()
    date: Date;

    @Column("text")
    body: string;

    @Column({ default: false })
    isResponded: boolean;
}