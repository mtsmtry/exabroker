import { DeepPartial, Repository } from "typeorm";
import { Execution, ExecutionStatus, ExecutionType, WebExecutionData, SequenceExecutionData } from "../entities/Execution";

export class AdditionalExecutionData {
    web: WebExecutionData;
    sequence: SequenceExecutionData;
}

export interface ExecutionSubmission {
    type: ExecutionType;
    name: string;
    startedAt: Date;
    endedAt: Date;
    exception?: string;
    additional?: DeepPartial<AdditionalExecutionData>;
    successful: boolean;
}

export class ExecutionRepository {
    executions: Repository<Execution>;

    async startExecution(parentId: number | null, type: ExecutionType, name: string, additional: DeepPartial<AdditionalExecutionData> = {}) {
        let execution = this.executions.create({
            name,
            type,
            status: ExecutionStatus.RUNNING,
            parentExecutionId: parentId,
            startedAt: new Date()
        });
        execution = await this.executions.save(execution);
        return execution.id;
    }

    async failedExecution(id: number, additional: DeepPartial<AdditionalExecutionData> = {}) {
        await this.executions.update(id, {
            status: ExecutionStatus.FAILED,
            endedAt: new Date(),
            ...additional
        });
    }

    async completedExecution(id: number, additional: DeepPartial<AdditionalExecutionData> = {}) {
        await this.executions.update(id, {
            status: ExecutionStatus.COMPLETED,
            endedAt: new Date(),
            ...additional
        });
    }

    async submitExecutions(parentId: number | null, submissions: ExecutionSubmission[]) {
        let ents = submissions.map(x => this.executions.create({
            name: x.name,
            startedAt: x.startedAt,
            endedAt: x.endedAt,
            type: x.type,
            status: x.successful ? ExecutionStatus.COMPLETED : ExecutionStatus.FAILED,
            parentExecutionId: parentId,
        }));
        ents = await this.executions.save(ents);
        return ents.map(x => x.id);
    }

    async updateExecution(id: number, additional: DeepPartial<AdditionalExecutionData> = {}) {
        await this.executions.update(id, additional)
    }
}