import { DeepPartial } from "typeorm";
import { ExecutionType } from "../../entities/system/ExecutionRecord";
import { AdditionalExecutionData, ExecutionRepository, ExecutionSubmission } from "../../repositories/ExecutionRepository";
import { getRepositories } from "../Database";

export interface ExecutionLog {
    rep: ExecutionRepository;
    parentId: number | null;
}

export interface ExecutionResult<T> {
    childrenNotLogged: ExecutionResult<any>[];
    logged: boolean;
    submission: ExecutionSubmission;
    result?: T;
}

export class Execution<T> {
    constructor(public readonly layer: string, public readonly name: string) {
    }

    async execute(): Promise<T> {
        const reps = await getRepositories();
        const result = await this.executeImpl(0, { rep: reps.execution, parentId: null });
        if (!result.submission.successful) {
            throw "Execution failed";
        }
        return result.result as any;
    }

    async executeImpl(depth: number, log: ExecutionLog): Promise<ExecutionResult<T>> {
        return undefined as any;
    }

    map<T2>(convert: (val: T) => T2): Execution<T2> {
        return Execution.transaction("System", "MappedExecution")
            .then(_ => this)
            .then(val => Execution.resolve(convert(val)));
    }

    static atom<T>(layer: string, name: string, run: () => Promise<ExecutionAtomResult<T>>, logType: LogType = LogType.IMMEDIATE) {
        return new ExecutionAtom<T>(layer, name, run, logType);
    }

    static throw() {
        return new ExecutionAtom<any>("", "", async () => { throw "Error" }, LogType.IMMEDIATE);
    }

    static batch(layer: string = "Inner", name: string = "Lambda") {
        return new BatchExecution<{}, {}>(layer, name, {});
    }

    static sequence<T, T2>(values: T[], concurrencyLimit?: number, layer: string = "Inner", name: string = "Lambda") {
        return new SequenceExecution<T, T2>(layer, name, values, concurrencyLimit);
    }

    static transaction(layer: string = "Inner", name: string = "Lambda") {
        return new TransactionExecution<void, void>(layer, name, (() => {})());
    }

    static progress<T>(value: T, layer: string = "Inner", name: string = "Lambda") {
        return new ProgressExecution<T, T>(layer, name, value);
    }

    static loop<T>(value: T, layer: string = "Inner", name: string = "Lambda") {
        return new LoopExecution<T>(layer, name, value);
    }

    static cancel() {
        async function run(): Promise<ExecutionAtomResult<undefined>> {
            return { result: undefined }
        }
        return new ExecutionAtom("Execution", "CancelExecution", run, LogType.ON_FAILURE_ONLY);
    }

    static resolve<T>(value: T) {
        async function run(): Promise<ExecutionAtomResult<T>> {
            return { result: value }
        }
        return new ExecutionAtom("Execution", "Resolve", run, LogType.ON_FAILURE_ONLY);
    }

    mustBeNotNull() {
        return this.map(val => {
            if (val === null) {
                throw "value is null";
            }
            if (val === undefined) {
                throw "value is undefined";
            }
            return val as Exclude<T, null | undefined>;
        });
    }
}

export interface ExecutionAtomResult<T> {
    executionData?: DeepPartial<AdditionalExecutionData>;
    exception?: string | object;
    result?: T;
}

export class ExecutionAtom<T> extends Execution<T> {
    constructor(
        layer: string,
        name: string,
        private run: () => Promise<ExecutionAtomResult<T>>,
        private logType: LogType) {
        super(layer, name);
    }

    async executeImpl(depth: number, log: ExecutionLog): Promise<ExecutionResult<T>> {
        // Start log
        let executionId = -1;
        if (this.logType == LogType.IMMEDIATE) {
            executionId = await log.rep.startExecution(log.parentId, ExecutionType.ATOM, this.layer, this.name);
        }

        // Execute
        const startedAt = new Date();
        let result: ExecutionAtomResult<T> | null, exception: any, successful: boolean;
        try {
            const res = await this.run()
                .then(result => ({ result, exception: null, successful: true }))
                .catch(exception => ({ result: null, exception, successful: false }));
            result = res.result;
            exception = res.exception;
            successful = res.successful;
        } catch (ex) {
            result = null;
            exception = ex;
            successful = false;
        }

        const endedAt = new Date();

        if (successful) {
            if (result?.exception) {
                exception = result?.exception;
                successful = false;
            }
        }

        const submission: ExecutionSubmission = {
            type: ExecutionType.ATOM,
            layer: this.layer,
            name: this.name,
            additional: result?.executionData,
            startedAt,
            endedAt,
            successful,
            exception
        };

        // Log
        let logged = false;
        if (this.logType == LogType.IMMEDIATE) {
            logged = true;
            if (successful) {
                await log.rep.completedExecution(executionId, result?.executionData);
            } else {
                await log.rep.failedExecution(executionId, exception, result?.executionData);
            }
        } else if (!successful) {
            logged = true;
            await log.rep.submitExecutions(log.parentId, [submission]);
        }

        return {
            childrenNotLogged: [],
            logged,
            submission,
            result: result?.result
        };
    }
}

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
        if (x.childrenNotLogged.length > 0) {
            await submitChildren(rep, ids[i], x.childrenNotLogged);
        }
    });
    await Promise.all(promises);
}

function getFailureResult(ex: any): ExecutionResult<any> {
    return {
        childrenNotLogged: [],
        logged: true,
        submission: {
            type: ExecutionType.ATOM,
            layer: "System",
            name: "Failure",
            startedAt: new Date(),
            endedAt: new Date(),
            successful: false,
            exception: ex
        }
    };
};

class ExecutionComposition<T1, T2> extends Execution<T2> {
    protected children: ((val: any) => Execution<any>)[];

    constructor(
        layer: string,
        name: string,
        private value: T1,
        private submit: (results: any) => T2,
        protected compositionType: CompositionType,
        protected evaluationType: EvaluationType,
        protected concurrencyLimit?: number) {
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

    private async executeParallel(executionId: number, depth: number, rep: ExecutionRepository): Promise<ExecutionResult<T2>> {
        let successfulCount = 0, failureCount = 0;
        let childResultsNoSubmit: ExecutionResult<any>[] = [];
        let exception: any = null;
        // Create promices
        let i = 0;
        let promices = this.children.map(child => async () => {
            // Execute child
            let result: ExecutionResult<any>;
            try {
                const log = { rep, parentId: executionId };
                const childExec = child(this.value);
                i++;
                console.log(`${"  ".repeat(depth)}[${i}/${this.children.length}]  Start ${childExec.layer}.${childExec.name}:${JSON.stringify(this.value)?.slice(0, 200)}`);
                result = await childExec.executeImpl(depth + 1, log);
                console.log(`${"  ".repeat(depth)}[${i}/${this.children.length}]  End ${childExec.layer}.${childExec.name}:${JSON.stringify(result.result)?.slice(0, 200) || result.submission.exception}`);
            } catch (ex) {
                exception = ex;
                result = getFailureResult(ex);
            }
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

            if (!result.logged) {
                childResultsNoSubmit.push(result);
            }

            return result;
        });

        // Execute children
        const startedAt = new Date();
        let results: ExecutionResult<any>[] = [];
        if (this.concurrencyLimit) {
            while (promices.length > 0) {
                const promiseSet = promices.slice(0, this.concurrencyLimit);
                promices = promices.slice(this.concurrencyLimit);
                const resultSet = await Promise.all(promiseSet.map(x => x()));
                results = results.concat(resultSet);
            }
        } else {
            results = await Promise.all(promices.map(x => x()));
        }
        const endedAt = new Date();

        const successful = failureCount == 0 || this.evaluationType == EvaluationType.AS_MUCH_AS_POSSIBLE;

        // Log
        if (successful) {
            await rep.completedExecution(executionId);
        } else {
            await rep.failedExecution(executionId, exception);

            if (childResultsNoSubmit.length > 0) {
                await submitChildren(rep, executionId, childResultsNoSubmit);
                childResultsNoSubmit = [];
            }
        }

        return {
            childrenNotLogged: childResultsNoSubmit,
            logged: true,
            submission: {
                type: this.executionType,
                layer: this.layer,
                name: this.name,
                startedAt,
                endedAt,
                successful
            },
            result: this.submit(results.filter(x => x.submission.successful).map(x => x.result) as any)
        };
    }

    private async executeSeries(executionId: number, depth: number, rep: ExecutionRepository): Promise<ExecutionResult<T2>> {
        let childResultsNoSubmit: ExecutionResult<any>[] = [];

        // Execute children
        const startedAt = new Date();
        let stack: any = this.value;
        let successful = true;
        let exception: any = null;

        for (let i = 0; i < this.children.length; i++) {
            // Execute child
            let result: ExecutionResult<any>;
            try {
                const log = { rep, parentId: executionId };
                const child = this.children[i](stack);
                console.log(`${"  ".repeat(depth)}[${i + 1}/${this.children.length}] Start ${child.layer}.${child.name}:${JSON.stringify(stack)?.slice(0, 200)}`);
                result = await child.executeImpl(depth + 1, log);
                stack = result.result;
                console.log(`${"  ".repeat(depth)}[${i + 1}/${this.children.length}] End ${child.layer}.${child.name}:${JSON.stringify(stack)?.slice(0, 200) || result.submission.exception}`);
            } catch (ex) {
                exception = ex;
                result = getFailureResult(ex);
            }
            // Log child
            if (rep) {
                await rep.updateExecution(executionId, { sequence: { doneCount: i + 1 } })
            }

            // Add array
            if (!result.logged) {
                childResultsNoSubmit.push(result);
            }

            // Error
            if (!result.submission.successful) {
                successful = false;
                break;
            }
        }
        const endedAt = new Date();

        // Log
        if (rep) {
            if (successful) {
                await rep.completedExecution(executionId);
            } else {
                await rep.failedExecution(executionId, exception);

                if (childResultsNoSubmit.length > 0) {
                    await submitChildren(rep, executionId, childResultsNoSubmit);
                    childResultsNoSubmit = [];
                }
            }
        }

        return {
            childrenNotLogged: childResultsNoSubmit,
            logged: true,
            submission: {
                type: this.executionType,
                layer: this.layer,
                name: this.name,
                startedAt,
                endedAt,
                successful
            },
            result: successful ? this.submit(stack) as any : undefined
        };
    }

    async executeImpl(depth: number, log: ExecutionLog): Promise<ExecutionResult<T2>> {
        let executionId = -1;
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
        executionId = await log.rep.startExecution(log.parentId, this.executionType, this.layer, this.name, addtional);

        if (this.compositionType == CompositionType.PARALLEL) {
            return await this.executeParallel(executionId, depth, log?.rep);
        } else {
            return await this.executeSeries(executionId, depth, log?.rep);
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
    constructor(layer: string, name: string, private values: T1[], concurrencyLimit?: number) {
        super(layer, name, values, x => x, CompositionType.PARALLEL, EvaluationType.AS_MUCH_AS_POSSIBLE, concurrencyLimit);
    }

    element(exec: (val: T1) => Execution<T2>): Execution<T2[]> {
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

    next<T3>(exec: (val: T2) => Execution<T3>): ProgressExecution<T1, T3> {
        this.children.push(exec);
        return this as any;
    }
}

export class LoopExecution<T> extends Execution<T> {
    makeExec: (val: T) => Execution<{ result: T, continue: boolean }>;
    value: T;

    constructor(layer: string, name: string, value: T) {
        super(layer, name);
        this.value = value;
    }

    routine(makeExec: (val: T) => Execution<{ result: T, continue: boolean }>) {
        this.makeExec = makeExec;
        return this;
    }

    async executeImpl(depth: number, log: ExecutionLog): Promise<ExecutionResult<T>> {
        let executionId = await log.rep.startExecution(log.parentId, ExecutionType.LOOP, this.layer, this.name, {
            sequence: {
                totalCount: 0,
                doneCount: 0,
                successfulCount: 0,
                failureCount: 0
            }
        });

        let childResultsNoSubmit: ExecutionResult<any>[] = [];

        // Execute children
        const startedAt = new Date();
        let stack: any = this.value;
        let successful = true;
        let exception: any = null;

        for (let i = 0; ; i++) {
            // Execute child
            let result: ExecutionResult<{ result: T, continue: boolean }>;
            try {
                const exec = this.makeExec(stack);
                console.log(`${"  ".repeat(depth)}[${i + 1}/LOOP] Start ${exec.layer}.${exec.name}:${JSON.stringify(stack)?.slice(0, 200)}`);
                result = await exec.executeImpl(depth + 1, { rep: log.rep, parentId: executionId });
                stack = result.result?.result;
                console.log(`${"  ".repeat(depth)}[${i + 1}/LOOP] End ${exec.layer}.${exec.name}:${JSON.stringify(stack)?.slice(0, 200) || result.submission.exception}`);
            } catch (ex) {
                exception = ex;
                result = getFailureResult(ex);
            }
            // Log child
            if (log.rep) {
                await log.rep.updateExecution(executionId, {
                    sequence: {
                        totalCount: i + 1,
                        doneCount: i + 1,
                        successfulCount: result.submission.successful ? i + 1 : i,
                        failureCount: result.submission.successful ? 1 : 0
                    }
                })
            }

            // Add array
            if (!result.logged) {
                childResultsNoSubmit.push(result);
            }

            // Error
            if (!result.submission.successful) {
                successful = false;
                break;
            }

            if (result.result?.continue === false) {
                break;
            }
        }
        const endedAt = new Date();

        // Log
        if (successful) {
            await log.rep.completedExecution(executionId);
        } else {
            await log.rep.failedExecution(executionId, exception);

            if (childResultsNoSubmit.length > 0) {
                await submitChildren(log.rep, executionId, childResultsNoSubmit);
                childResultsNoSubmit = [];
            }
        }

        return {
            childrenNotLogged: childResultsNoSubmit,
            logged: true,
            submission: {
                type: ExecutionType.LOOP,
                layer: this.layer,
                name: this.name,
                startedAt,
                endedAt,
                successful
            },
            result: successful ? stack : undefined
        };
    }
}