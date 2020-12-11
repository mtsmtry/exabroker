import { BaseEntity, Column, Entity, PrimaryColumn } from "typeorm";
import { UpdatedAt } from "./Utils";

@Entity()
export class AmazonItem {
    @PrimaryColumn("char", { length: 10 })
    asin: string;

    @Column()
    title: string;

    @Column("int")
    price: number;

    @Column("date", { nullable: true })
    deliverBy: Date | null;

    @Column("int", { nullable: true })
    reviewCount: number | null;

    @Column("float", { nullable: true })
    rating: number | null;

    @Column("int", { nullable: true })
    stockCount: number | null;

    @Column("char", { length: 10 })
    fromNodeId: string;

    @Column()
    fromNodePage: number;

    @UpdatedAt()
    updatedAt: Date;
}