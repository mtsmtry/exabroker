import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn } from "typeorm";
import { CreatedAt } from "../Utils";

@Entity()
export class Qoo10Account {

    @PrimaryColumn()
    userId: string;

    @Column()
    password: string;

    @CreatedAt()
    createdAt: Date;

    @Column()
    sellerKey: string;
}