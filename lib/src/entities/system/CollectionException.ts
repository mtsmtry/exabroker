import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { CollectionRecord } from "./CollectionRecord";
import { CreatedAt } from "../Utils";

@Entity()
export class CollectionException {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    url: string;

    @CreatedAt()
    timestamp: Date;

    @Column()
    function: string;

    @ManyToOne(type => CollectionRecord, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "parentExecutionId" })
    record: CollectionRecord | null;
    @Column("int", { nullable: true })
    recordId: number | null;

    @Column("text")
    message: string;
}