import { BaseEntity, Column, Entity, Index, JoinColumn, JoinTable, OneToOne, PrimaryColumn } from "typeorm";
import { AmazonItemDetail } from "./AmazonItemDetail";
import { UpdatedAt } from "./Utils";

@Entity()
export class AmazonItem {
    @PrimaryColumn("char", { length: 10 })
    asin: string;

    @Column()
    title: string;

    @Index()
    @Column("int")
    price: number;

    @Column("date", { nullable: true })
    deliverBy: Date | null;

    @Index()
    @Column("int", { nullable: true })
    reviewCount: number | null;

    @Index()
    @Column("float", { nullable: true })
    rating: number | null;

    @Index()
    @Column("int", { nullable: true })
    stockCount: number | null;

    @Column("char", { length: 10 })
    fromNodeId: string;

    @Column()
    fromNodePage: number;

    @UpdatedAt()
    updatedAt: Date;

    @Column({ default: false })
    isCrawledDetail: boolean;
}