import { DeepPartial } from "typeorm";
import { ExecutionType } from "../../entities/Execution";
import { AdditionalExecutionData, ExecutionRepository, ExecutionSubmission } from "../../repositories/ExecutionRepository";
import { BatchExecution, ProgressExecution, SequenceExecution, TransactionExecution } from "./ExecutionComposition";

export interface ExecutionLog {
    rep: ExecutionRepository;
    parentId: number;
}

export interface ExecutionResult<T> {
    childrenNoSubmit: ExecutionResult<any>[];
    submission: ExecutionSubmission;
    result?: T;
}

export class Execution<T> {
    constructor(public readonly layer: string, public readonly name: string) {
    }

    async execute(log?: ExecutionLog): Promise<ExecutionResult<T>> {
        return undefined as any;
    }

    map<T2>(convert: (val: T) => T2): Execution<T2> {
        return new MappedExecution(this, convert);
    }

    static batch<T>(value: T, layer: string = "Inner", name: string = "Lambda") {
        return new BatchExecution<T>(layer, name, value);
    }

    static sequence<T>(values: T[], layer: string = "Inner", name: string = "Lambda") {
        return new SequenceExecution<T, []>(layer, name, values);
    }

    static transaction<T, T2 = T>(value: T, layer: string = "Inner", name: string = "Lambda") {
        return new TransactionExecution<T, T2>(layer, name, value);
    }
    
    static progress<T>(value: T, layer: string = "Inner", name: string = "Lambda") {
        return new ProgressExecution<T, T>(layer, name, value);
    }

    static cancel() {
        async function run(): Promise<ExecutionAtomResult<undefined>> {
            return { result: undefined }
        }
        return new ExecutionAtom("Execution", "CancelExecution", run());
    }

    static resolve<T>(value: T) {
        async function run(): Promise<ExecutionAtomResult<T>> {
            return { result: value }
        }
        return new ExecutionAtom("Execution", "Resolve", run());
    }
}

class MappedExecution<T> extends Execution<T> {
    constructor(private execution: Execution<any>, private convert: (val: any) => T) {
        super(execution.layer, execution.name);
    }

    async execute(log?: ExecutionLog): Promise<ExecutionResult<T>> {
        const result = await this.execute(log);
        result.result = this.convert(result.result);
        return result;
    }
}

export interface ExecutionAtomResult<T> {
    executionData?: DeepPartial<AdditionalExecutionData>;
    result: T;
}

export class ExecutionAtom<T> extends Execution<T> {
    constructor(
        layer: string,
        name: string,
        private run: Promise<ExecutionAtomResult<T>>) {
        super(layer, name);
    }

    async execute(log?: ExecutionLog): Promise<ExecutionResult<T>> {

        // Start log
        let executionId = -1;
        if (log) {
            executionId = await log.rep.startExecution(log.parentId, ExecutionType.ATOM, this.name);
        }

        // Execute
        const startedAt = new Date();
        let successful = true;
        let exception: string | undefined = undefined;
        let result: ExecutionAtomResult<T> | undefined = undefined;
        try {
            result = await this.run;
        } catch(ex) {
            successful = false;
            exception = ex.toString() as string;
        }
        const endedAt = new Date();

        // Log
        if (log) {
            if (successful) {
                await log.rep.completedExecution(executionId, result?.executionData);
            } else {
                await log.rep.failedExecution(executionId, result?.executionData);
            }
        }

        return {
            childrenNoSubmit: [],
            submission: {
                type: ExecutionType.ATOM,
                name: this.name,
                additional: result?.executionData,
                startedAt,
                endedAt,
                successful,
                exception
            },
            result: result?.result
        };
    }
}

export function execution<T>(layer: string, name: string, run: Promise<ExecutionAtomResult<T>>) {
    return new ExecutionAtom(layer, name, run)
}