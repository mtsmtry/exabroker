import { BaseEntity, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { AmazonItem } from "./AmazonItem";
import { CreatedAt, UpdatedAt } from "./Utils";

type Dict = { [x: string]: string };

@Entity()
export class AmazonItemDetail {
    @PrimaryColumn("char", { length: 10 })
    asin: string;
    @JoinColumn({ name: "asin" })
    item: AmazonItem;

    @Column("int", { nullable: true })
    price_block: number | null;

    @Column("int", { nullable: true })
    price_swatches: number | null;

    @Column()
    title: string;

    @Column("simple-json", { nullable: true })
    features_productOverview: Dict | null;

    @Column("simple-json", { nullable: true })
    features_detailBullets: Dict | null;

    @Column({ type: "simple-json", nullable: true, asExpression: "coalesce(features_detailBullets, features_productOverview)", generatedType: "VIRTUAL" })
    features: Dict | null; 

    @Column("simple-json")
    featureBullets: string[];

    @Column("simple-json", { nullable: true })
    details: Dict | null;

    @Column("text", { nullable: true })
    productDescription: string | null;

    @Column("text", { nullable: true })
    makerDescription: string | null;

    @Column("text", { nullable: true })
    shortDescription: string | null;

    @Index()
    @Column("int", { nullable: true })
    reviewCount: number | null;

    @Index()
    @Column("int", { nullable: true })
    askCount: number | null;

    @Index()
    @Column("float", { nullable: true })
    rating: number | null;

    @Column("varchar", { nullable: true })
    availability: string | null;

    @Column("varchar", { nullable: true })
    seller_buybox: string | null;

    @Column("varchar", { nullable: true })
    shipper_buybox: string | null;

    @Column("varchar", { nullable: true })
    seller_info: string | null;

    @Column("varchar", { nullable: true })
    shipper_info: string | null;

    @Column("simple-json", { nullable: true })
    images: string[] | null;

    @Index()
    @Column({ type: "varchar", nullable: true, asExpression: "coalesce(seller_buybox, seller_info)", generatedType: "VIRTUAL" })
    seller: string | null;

    @Index()
    @Column({ type: "varchar", nullable: true, asExpression: "coalesce(shipper_buybox, shipper_info)", generatedType: "VIRTUAL" })
    shipper: string | null;

    @UpdatedAt()
    updatedAt: Date;

    @Column("int", { default: 1 })
    version: number;
}