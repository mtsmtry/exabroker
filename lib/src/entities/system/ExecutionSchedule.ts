import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { CreatedAt } from "../Utils";

export enum ExecutionTaskStatus {
    PENDING = "pending",
    RUNNING = "running"
}

@Entity()
export class ExecutionSchedule {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    method: string;

    @Column()
    timeSpan: number; // Minutes

    @Column({ default: () => `'${new Date(0).toISOString().slice(0, 19).replace('T', ' ')}'`  })
    lastInvokedAt: Date;

    @CreatedAt()
    createdAt: Date;

    @Column({ type: "datetime", asExpression: "DATE_ADD(lastInvokedAt, INTERVAL timeSpan MINUTE)" })
    pendedUntil: Date;

    @Column("enum", { enum: ExecutionTaskStatus, default: ExecutionTaskStatus.PENDING })
    status: ExecutionTaskStatus;
}