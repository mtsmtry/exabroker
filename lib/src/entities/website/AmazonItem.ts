import { BaseEntity, Column, Entity, In, Index, JoinColumn, JoinTable, OneToOne, PrimaryColumn } from "typeorm";
import { AmazonItemDetail } from "./AmazonItemDetail";
import { UpdatedAt } from "../Utils";
import { AmazonItemState } from "./AmazonItemState";

@Entity()
export class AmazonItem {
    @PrimaryColumn("char", { length: 10 })
    asin: string;

    @Column()
    title: string;

    @Index()
    @Column("int")
    price: number;

    @Index()
    @Column("date", { nullable: true })
    deliverBy: Date | null;

    @Index()
    @Column("int", { nullable: true })
    deliverDay: number | null;

    @Column()
    isPrime: boolean;

    @Index()
    @Column("int", { nullable: true })
    reviewCount: number | null;

    @Index()
    @Column("float", { nullable: true })
    rating: number | null;

    @Index()
    @Column("int", { nullable: true })
    stockCount: number | null;

    @Index()
    @Column("char", { length: 10 })
    fromNodeId: string;

    @Column()
    fromNodePage: number;

    @UpdatedAt()
    updatedAt?: Date;

    @Column({ default: false })
    isCrawledDetail?: boolean;

    @Column("tinyint", { nullable: true })
    latestStateId: number | null;
    @OneToOne(type => AmazonItemState, state => state.item)
    @JoinColumn({ name: "latestStateId" })
    latestState: AmazonItemState | null;
}