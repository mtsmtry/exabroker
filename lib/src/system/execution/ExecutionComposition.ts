import { Execution, ExecutionResult, ExecutionLog } from "./Execution";
import { ExecutionRepository } from "../../repositories/ExecutionRepository";
import { ExecutionType } from "../../entities/Execution";

export enum CompositionType {
    PARALLEL, SERIES
}

export enum EvaluationType {
    AS_MUCH_AS_POSSIBLE, NONE_OR_ALL
}

export enum LogType {
    ON_FAILURE_ONLY, IMMEDIATE
}

async function submitChildren(rep: ExecutionRepository, executionId: number, children: ExecutionResult<any>[]) {
    const ids = await rep.submitExecutions(executionId, children.map(x => x.submission));
    const promises = children.map(async (x, i) => {
        if (x.childrenNoSubmit.length > 0) {
            await submitChildren(rep, ids[i], x.childrenNoSubmit);
        }
    });
    await Promise.all(promises);
}

class ExecutionComposition<T1, T2> extends Execution<T2> {
    protected children: ((val: any) => Execution<any>)[];

    constructor(
        layer: string,
        name: string,
        private value: T1,
        private submit: (results: any) => T2,
        private compositionType: CompositionType, 
        private evaluationType: EvaluationType,
        private childrenLogType: LogType) {
        super(layer, name);
        this.children = [];
    }

    private get executionType() {
        if (this.compositionType == CompositionType.PARALLEL) {
            if (this.evaluationType == EvaluationType.NONE_OR_ALL) {
                return ExecutionType.BATCH;
            } else {
                return ExecutionType.SEQUENCE;
            }
        } else {
            if (this.evaluationType == EvaluationType.NONE_OR_ALL) {
                return ExecutionType.TRANSACTION;
            } else {
                return ExecutionType.PROGRESS;
            }
        }
    }

    private async executeParallel(executionId: number, rep?: ExecutionRepository): Promise<ExecutionResult<T2>> {
        let successfulCount = 0, failureCount = 0;
        let childResultsNoSubmit: ExecutionResult<any>[] = []; 
        
        // Create promices
        const promices = this.children.map(async child => {
            // Execute child
            const log = this.childrenLogType == LogType.ON_FAILURE_ONLY || !rep ? undefined : { rep, parentId: executionId };
            const result = await child(this.value).execute(log);

            // Count
            if (result.submission.successful) {
                successfulCount++;
            } else {
                failureCount++;
            }

            // Log child
            if (rep) {
                const addtional = { 
                    sequence: { 
                        doneCount: successfulCount + failureCount,
                        successfulCount,
                        failureCount
                    } 
                }
                await rep.updateExecution(executionId, addtional);
            }

            if (!rep || this.childrenLogType == LogType.ON_FAILURE_ONLY) {
                childResultsNoSubmit.push(result);
            }

            return result;
        });

        // Execute children
        const startedAt = new Date();
        const results = await Promise.all(promices);
        const endedAt = new Date();

        const successful = failureCount == 0 || this.evaluationType == EvaluationType.AS_MUCH_AS_POSSIBLE;

        // Log
        if (rep) {
            if (successful) {
                await rep.completedExecution(executionId);
            } else {
                await rep.failedExecution(executionId);

                if (this.childrenLogType == LogType.ON_FAILURE_ONLY && childResultsNoSubmit.length > 0) {
                    await submitChildren(rep, executionId, childResultsNoSubmit);
                    childResultsNoSubmit = [];
                }
            } 
        }

        return {
            childrenNoSubmit: childResultsNoSubmit,
            submission: {
                type: this.executionType,
                name: this.name,
                startedAt,
                endedAt,
                successful
            },
            result: this.submit(results.filter(x => x.submission.successful).map(x => x.result) as any)
        };
    }

    private async executeSeries(executionId: number, rep?: ExecutionRepository): Promise<ExecutionResult<T2>> {
        let childResultsNoSubmit: ExecutionResult<any>[] = []; 

        // Execute children
        const startedAt = new Date();
        let stack: any = this.value;
        let successful = true;
        for (let i = 0; i < this.children.length; i++) {
            // Execute child
            const log = this.childrenLogType == LogType.ON_FAILURE_ONLY || !rep ? undefined : { rep, parentId: executionId };
            const result = await this.children[i](stack).execute(log);

            // Log child
            if (rep) {
                await rep.updateExecution(executionId, { sequence: { doneCount: i + 1 } })
            }

            // Add array
            if (!rep || this.childrenLogType == LogType.ON_FAILURE_ONLY) {
                childResultsNoSubmit.push(result);
            }

            // Error
            const successful = result.submission.successful;
            if (!successful && rep) {
                await rep.failedExecution(executionId);

                if (this.childrenLogType == LogType.ON_FAILURE_ONLY && childResultsNoSubmit.length > 0) {
                    await submitChildren(rep, executionId, childResultsNoSubmit);
                    childResultsNoSubmit = [];
                }
            }
        }
        const endedAt = new Date();

        // Log
        if (successful && rep) {
            await rep.completedExecution(executionId);
        }

        return {
            childrenNoSubmit: childResultsNoSubmit,
            submission: {
                type: this.executionType,
                name: this.name,
                startedAt,
                endedAt,
                successful
            },
            result: successful ? this.submit(stack) as any : undefined
        };
    }

    async execute(log?: ExecutionLog): Promise<ExecutionResult<T2>> {
        let executionId = -1;
        if (log) {
            const addtional = this.evaluationType == EvaluationType.NONE_OR_ALL ? 
            { 
                sequence: { 
                    totalCount: this.children.length, 
                    doneCount: 0
                }
            } : { 
                sequence: { 
                    totalCount: this.children.length, 
                    doneCount: 0,
                    successfulCount: 0,
                    failureCount: 0
                }
            };
            executionId = await log.rep.startExecution(log.parentId, this.executionType, this.name, addtional);
        }

        if (this.compositionType == CompositionType.PARALLEL) {
            return await this.executeParallel(executionId, log?.rep);
        } else {
            return await this.executeSeries(executionId, log?.rep);
        }
    }
}

export class BatchExecution<T1, T2 = {}> extends ExecutionComposition<T1, T2> {
    constructor(layer: string, name: string, value: T1) {
        function submit(results: any[]) {
            return results.reduce((m, x) => Object.assign(m, x), {});
        }
        super(layer, name, value, submit, CompositionType.PARALLEL, EvaluationType.NONE_OR_ALL, LogType.IMMEDIATE);
    }

    and<T3>(exec: (val: T1) => Execution<T3>): BatchExecution<T1, T2 & T3> {
        this.children.push(exec);
        return this as any;
    }
}

export class SequenceExecution<T1, T2> extends ExecutionComposition<T1[], T2[]> {
    constructor(layer: string, name: string, private values: T1[]) {
        super(layer, name, values, x => x, CompositionType.PARALLEL, EvaluationType.AS_MUCH_AS_POSSIBLE, LogType.IMMEDIATE);
    }

    run(exec: (val: T1) => Execution<T2>): Execution<T2[]> {
        this.children = this.values.map(x => _ => exec(x));
        return this as any;
    }
}

export class TransactionExecution<T1, T2> extends ExecutionComposition<T1, T2> {
    constructor(layer: string, name: string, value: T1) {
        super(layer, name, value, x => x, CompositionType.SERIES, EvaluationType.NONE_OR_ALL, LogType.IMMEDIATE);
    }

    then<T3>(exec: (val: T2) => Execution<T3>): TransactionExecution<T1, T3> {
        this.children.push(exec);
        return this as any;
    }
}

export class ProgressExecution<T1, T2> extends ExecutionComposition<T1, T2> {
    constructor(layer: string, name: string, value: T1) {
        super(layer, name, value, x => x, CompositionType.SERIES, EvaluationType.AS_MUCH_AS_POSSIBLE, LogType.IMMEDIATE);
    }

    then<T3>(exec: (val: T2) => Execution<T3>): TransactionExecution<T1, T3> {
        this.children.push(exec);
        return this as any;
    }
}
