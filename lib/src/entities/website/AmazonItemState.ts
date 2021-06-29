import { BaseEntity, Column, Entity, In, Index, JoinColumn, JoinTable, ManyToOne, OneToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { AmazonItemDetail } from "./AmazonItemDetail";
import { CreatedAt, UpdatedAt } from "../Utils";
import { AmazonItem } from "./AmazonItem";

@Entity()
export class AmazonItemState {
    @PrimaryGeneratedColumn()
    id: number;

    @Column("char", { length: 10 })
    asin: string;
    @ManyToOne(type => AmazonItem)
    @JoinColumn({ name: "asin" })
    item: AmazonItem;

    @Column("int", { nullable: true })
    price: number | null;

    @Column()
    hasStock: boolean;

    @Column("tinyint", { nullable: true })
    hasEnoughStock: boolean;

    @Column()
    isAddon: boolean;

    @CreatedAt()
    timestamp: Date;
}