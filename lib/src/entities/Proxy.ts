import { Column, Entity, PrimaryColumn } from "typeorm";
import { CreatedAt, UpdatedAt } from "./Utils";

@Entity()
class Proxy {

    @PrimaryColumn()
    ipAddress: string;

    @CreatedAt()
    createdAt: string;
}