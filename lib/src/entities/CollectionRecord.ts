import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { CreatedAt } from "./Utils";

export enum CollectionResult {
    COMPLETED = "completed",
    FAILED = "failed"
}

@Entity()
export class CollectionRecord {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    s3Key: string;

    @Column()
    itemCount: number;

    @Column()
    successCount: number;

    @Column("simple-json")
    propertyCounts: { [prop: string]: number };
    
    @Column("text", { nullable: true })
    error: string | null;
    //@Column({ type: "enum", enum: CollectionResult, asExpression: "IF(itemCount > 0 AND successCount = 0, 'failed', 'completed')" })
    //result: CollectionResult;

    @CreatedAt()
    timestamp: Date;
}