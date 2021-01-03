import { DeepPartial } from "typeorm";
import { ExecutionType } from "../entities/Execution";
import { AdditionalExecutionData, ExecutionRepository, ExecutionSubmission } from "../repositories/ExecutionRepository";

interface Log {
    rep: ExecutionRepository;
    parentId: number;
}

interface ExecutionResult<T> {
    childrenNoSubmit: ExecutionResult<any>[];
    submission: ExecutionSubmission;
    result?: T;
}

export type Execution<T1, T2> = ExecutionImpl<T1, T2>;

class ExecutionImpl<T1, T2> {
    constructor(public readonly layer: string, public readonly name: string) {
    }

    async execute(arg: T1, log?: Log): Promise<ExecutionResult<T2>> {
        return undefined as any;
    }
}

export function translateExecution<T1, T2, E1, E2>(execution: Execution<E1, E2>, make: (val: T1) => E1, submit: (res: E2, val: T1) => T2) {
    async function execute(arg: T1, log?: Log) {
        const e1 = make(arg);
        const result = await execution.execute(e1, log);
        return {
            childrenNoSubmit: result.childrenNoSubmit,
            submission: result.submission,
            result: result.result ? submit(result.result, arg) : undefined
        }
    };
    const translated = new ExecutionImpl<T1, T2>(execution.layer, execution.name);
    translated.execute = execute;
    return translated;
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

enum CompositionType {
    PARALLEL, SERIES
}

enum EvaluationType {
    AS_MUCH_AS_POSSIBLE, NONE_OR_ALL
}

enum LogType {
    ON_FAILURE_ONLY, IMMEDIATE
}

class ExecutionComposition<T1, T2> extends ExecutionImpl<T1, T2> {
    constructor(
        layer: string,
        name: string,
        protected makeExecutions: (val: T1) => Execution<any, any>[],
        private submit: (result: any) => T2,
        private compositionType: CompositionType, 
        private evaluationType: EvaluationType,
        private childrenLogType: LogType) {
        super(layer, name);
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

    private async executeParallel(children: Execution<any, any>[], arg: T1, executionId: number, rep?: ExecutionRepository): Promise<ExecutionResult<T2>> {
        let successfulCount = 0, failureCount = 0;
        let childResultsNoSubmit: ExecutionResult<any>[] = []; 
        
        // Create promices
        const promices = children.map(async child => {
            // Execute child
            const log = this.childrenLogType == LogType.ON_FAILURE_ONLY || !rep ? undefined : { rep, parentId: executionId };
            const result = await child.execute(arg, log);

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

        const resultResults = results.filter(x => x.submission.successful).map(x => x.result);

        return {
            childrenNoSubmit: childResultsNoSubmit,
            submission: {
                type: this.executionType,
                name: this.name,
                startedAt,
                endedAt,
                successful
            },
            result: this.submit(resultResults) as any
        };
    }

    private async executeSeries(children: Execution<any, any>[], arg: T1, executionId: number, rep?: ExecutionRepository): Promise<ExecutionResult<T2>> {
        let childResultsNoSubmit: ExecutionResult<any>[] = []; 

        // Execute children
        const startedAt = new Date();
        let stack: any = arg;
        let successful = true;
        for (let i = 0; i < children.length; i++) {
            // Execute child
            const log = this.childrenLogType == LogType.ON_FAILURE_ONLY || !rep ? undefined : { rep, parentId: executionId };
            const result = await children[i].execute(stack, log);

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

    async execute(arg: T1, log?: Log): Promise<ExecutionResult<T2>> {
        const children = this.makeExecutions(arg);

        let executionId = -1;
        if (log) {
            const addtional = this.evaluationType == EvaluationType.NONE_OR_ALL ? 
            { 
                sequence: { 
                    totalCount: children.length, 
                    doneCount: 0
                }
            } : { 
                sequence: { 
                    totalCount: children.length, 
                    doneCount: 0,
                    successfulCount: 0,
                    failureCount: 0
                }
            };
            executionId = await log.rep.startExecution(log.parentId, this.executionType, this.name, addtional);
        }

        if (this.compositionType == CompositionType.PARALLEL) {
            return await this.executeParallel(children, arg, executionId, log?.rep);
        } else {
            return await this.executeSeries(children, arg, executionId, log?.rep);
        }
    }
}

export class BatchExecution<T1, T2 = {}> extends ExecutionComposition<T1, T2> {
    private children: Execution<T1, any>[];

    constructor(layer: string, name: string) {
        function submit(results: any[]) {
            return results.reduce((m, x) => Object.assign(m, x), {});
        }
        super(layer, name, _ => this.children, submit, CompositionType.PARALLEL, EvaluationType.NONE_OR_ALL, LogType.IMMEDIATE);
    }

    and<T3A, T3B extends T3A, T4, T5 extends object>(execution: Execution<T3A, T4>, make: (arg: T1) => T3B, submit: (res: T4) => T5): BatchExecution<T1, T2 & T5> {
        this.children.push(translateExecution(execution, make, submit));
        return this as any;
    }
}

export class SequenceExecution<T1, T2, T3> extends ExecutionComposition<T1, T3[]> {
    constructor(layer: string, name: string, execution: Execution<T2, T3>, make: (val: T1) => T2[]) {
        function makeChildren(val: T1) {
            const vals = make(val);
            return vals.map(x => translateExecution(execution, _ => x, r => r));
        }
        super(layer, name, makeChildren, x => x, CompositionType.PARALLEL, EvaluationType.AS_MUCH_AS_POSSIBLE, LogType.IMMEDIATE);
    }
}

export class TransactionExecution<T1, T2> extends ExecutionComposition<T1, T2> {
    private children: Execution<any, any>[];

    constructor(layer: string, name: string) {
        super(layer, name, _ => this.children, x => x, CompositionType.SERIES, EvaluationType.NONE_OR_ALL, LogType.IMMEDIATE);
    }

    then<T3>(execution: Execution<T2, T3>): TransactionExecution<T1, T3> {
        this.children.push(execution);
        return this as any;
    }

    thenTranslate<E1A, E1B extends E1A, E2, T3>(execution: Execution<E1A, E2>, make: (val: T2) => E1B, submit: (res: E2, val: T2) => T3): TransactionExecution<T1, T3> {
        return this.then(translateExecution(execution, make, submit)) as TransactionExecution<T1, T3>;
    }
}

export class ProgressExecution<T1, T2> extends ExecutionComposition<T1, T2> {
    private children: Execution<any, any>[];

    constructor(layer: string, name: string) {
        super(layer, name, _ => this.children, x => x, CompositionType.SERIES, EvaluationType.AS_MUCH_AS_POSSIBLE, LogType.IMMEDIATE);
    }

    then<T3>(execution: Execution<T2, T3>): ProgressExecution<T1, T3> {
        this.children.push(execution);
        return this as any;
    }
}

export interface ExecutionAtomResult<T> {
    executionData?: DeepPartial<AdditionalExecutionData>;
    result: T;
}

export class ExecutionAtom<T1, T2> extends ExecutionImpl<T1, T2> {
    constructor(
        layer: string,
        name: string,
        private run: (arg: T1) => Promise<ExecutionAtomResult<T2>>) {
        super(layer, name);
    }

    async execute(arg: T1, log?: Log): Promise<ExecutionResult<T2>> {

        // Start log
        let executionId = -1;
        if (log) {
            executionId = await log.rep.startExecution(log.parentId, ExecutionType.ATOM, this.name);
        }

        // Execute
        const startedAt = new Date();
        let successful = true;
        let exception: string | undefined = undefined;
        let result: ExecutionAtomResult<T2> | undefined = undefined;
        try {
            result = await this.run(arg);
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

export function when<T1, E1, E2>(execution: Execution<E1, E2>, condition: (val: T1) => boolean, make: (arg: T1) => E1) {
    async function execute(arg: T1, log?: Log) {
        if (!condition(arg)) {
            return {
                childrenNoSubmit: [],
                submission: {
                    type: ExecutionType.ATOM,
                    name: "Cancel",
                    startedAt: new Date(),
                    endedAt: new Date(),
                    successful: true
                },
                result: undefined
            }
        }
        const e1 = make(arg);
        const result = await execution.execute(e1, log);
        return {
            childrenNoSubmit: result.childrenNoSubmit,
            submission: result.submission,
            result: undefined
        }
    };
    const translated = new ExecutionImpl<T1, void>(execution.layer, execution.name);
    translated.execute = execute;
    return translated;
}