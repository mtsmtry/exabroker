import { CodePipeline } from "aws-sdk";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { CreatedAt } from "../Utils";
import { AmazonItem } from "../website/AmazonItem";

@Entity()
export class YahooAmazonExhibitFailure {
    
    @PrimaryGeneratedColumn()
    id: number;

    @Column("char", { length: 10 })
    asin: string;
    @ManyToOne(type => AmazonItem)
    @JoinColumn({ name: "asin" })
    item: AmazonItem;
}