import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn } from "typeorm";
import { CreatedAt } from "../Utils";

@Entity()
export class AmazonAccount {

    @PrimaryColumn()
    email: string;

    @Column()
    password: string;

    @CreatedAt()
    createdAt: Date;

    @Column("simple-json", { nullable: true })
    cookies: { [name: string]: string } | null;

    @Column("datetime", { nullable: true })
    loggedinAt: Date | null;
}