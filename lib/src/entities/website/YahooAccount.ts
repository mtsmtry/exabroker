import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn } from "typeorm";
import { CreatedAt } from "../Utils";

@Entity()
export class YahooAccount {

    @PrimaryColumn()
    username: string;

    @Column()
    password: string;

    @CreatedAt()
    createdAt: Date;

    @Column("simple-json", { nullable: true })
    cookies: { [name: string]: string } | null;

    @Column("datetime", { nullable: true })
    loggedinAt: Date | null;

    // Status
    @Column("bool", { nullable: true })
    isPremium: boolean | null;

    @Column("bool", { nullable: true })
    isExhibitable: boolean | null;

    @Column("int", { nullable: true })
    rating: number | null;

    @Column("int", { nullable: true })
    balance: number | null;

    @Column("datetime", { nullable: true })
    statusUpdatedAt: Date | null;

    @Column("bool", { default: true })
    enable: boolean;
}