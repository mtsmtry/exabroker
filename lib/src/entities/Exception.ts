import { Entry } from "selenium-webdriver/lib/logging";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { CreatedAt } from "./Utils";

export enum ExceptionCategory {
    DATABASE = "database"
}

@Entity()
export class Exception {

    @PrimaryGeneratedColumn()
    id: number;

    @Column("text")
    message: string;

    @Column("enum", { enum: ExceptionCategory })
    category: ExceptionCategory;

    @CreatedAt()
    timestamp: Date;
}