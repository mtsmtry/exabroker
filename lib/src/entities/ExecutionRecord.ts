import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { CreatedAt, UpdatedAt } from "./Utils";

export enum ExecutionType {
    ATOM = "atom",
    SEQUENCE = "sequence",
    BATCH = "batch",
    TRANSACTION = "transaction",
    PROGRESS = "progress"
}

export enum ExecutionStatus {
    RUNNING = "running",
    COMPLETED = "completed",
    FAILED = "failed"
}

export class WebExecutionData {

    @Column("varchar", { nullable: true })
    method: string | null;

    @Column("varchar", { nullable: true })
    url: string| null;

    @Column("simple-json", { nullable: true })
    request: object | null;

    @Column("varchar", { nullable: true })
    document: string | null;
}

export class SequenceExecutionData {

    @Column("int", { nullable: true })
    doneCount: number| null;

    @Column("int", { nullable: true })
    totalCount: number| null;

    @Column("int", { nullable: true })
    successfulCount: number| null;

    @Column("int", { nullable: true })
    failureCount: number| null;
}

@Entity()
export class ExecutionRecord {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    layer: string;

    @Index()
    @Column("enum", { enum: ExecutionStatus })
    status: ExecutionStatus;

    @Column("enum", { enum: ExecutionType })
    type: ExecutionType;

    @Column(type => WebExecutionData)
    web: WebExecutionData;

    @Column(type => SequenceExecutionData)
    sequence: SequenceExecutionData;

    @Column("text", { nullable: true })
    exception: string | null;
    
    @ManyToOne(type => ExecutionRecord, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "parentExecutionId" })
    parentExecution: ExecutionRecord | null;
    @Column("int", { nullable: true })
    parentExecutionId: number | null;

    @Index()
    @Column()
    startedAt: Date;

    @Index()
    @Column("datetime", { nullable: true })
    endedAt: Date | null;

    @CreatedAt()
    createdAt: Date;

    @UpdatedAt()
    updatedAt: Date;
}