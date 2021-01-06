import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";



@Entity()
export class Collection {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    itemCount: number;

    @Column("simple-json")
    propertyCounts: { [prop: string]: number };
}