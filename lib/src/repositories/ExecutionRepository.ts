import { DeepPartial, EntityManager, LessThan, MoreThan, Repository } from "typeorm";
import { ExecutionRecord, ExecutionStatus, ExecutionType, WebExecutionData, SequenceExecutionData } from "../entities/system/ExecutionRecord";
import { randomPositiveInteger, toTimestamp } from "../Utils";
import * as aws from "aws-sdk";
import { getException } from "./Utils";
import { getRepositories } from "../system/Database";
import { ECSCredentials } from "aws-sdk";

export class AdditionalExecutionData {
    web: WebExecutionData;
    sequence: SequenceExecutionData;
}

export interface ExecutionSubmission {
    type: ExecutionType;
    layer: string;
    name: string;
    startedAt: Date;
    endedAt: Date;
    exception?: string | object;
    additional?: DeepPartial<AdditionalExecutionData>;
    successful: boolean;
}

const NO_LOG = false;

function getRandomInt(min, max): number {
    return Math.floor(Math.random() * (max + 1 - min)) + min;
}

function genId() {
    return (new Date()).getTime() * 1000 + getRandomInt(0, 999);
}

export class ExecutionRepository {
    records: Repository<ExecutionRecord>;

    constructor(mng: EntityManager, private firestore: FirebaseFirestore.Firestore) {
        this.records = mng.getRepository(ExecutionRecord);
    }

    private async createRecord(exec: DeepPartial<ExecutionRecord>) {
        const ids = await this.createRecords([exec]);
        return ids[0];
    }

    private toObject(exec: DeepPartial<ExecutionRecord>): object {
        const result = {};
        function toHeadUpper(str: string) {
            return str.slice(0, 1).toUpperCase() + str.slice(1);
        }
        Object.keys(exec).forEach(key => {
            if (key == "web") {
                Object.keys(exec.web || {}).forEach(subKey => {
                    result["web" + toHeadUpper(subKey)] = (exec.web as any)[subKey];
                });
            } else if (key == "sequence") {
                Object.keys(exec.sequence || {}).forEach(subKey => {
                    result["sequence" + toHeadUpper(subKey)] = (exec.sequence as any)[subKey];
                });
            } else {
                result[key] = exec[key];
            }
        });
        return result;
    }

    private async createRecords(execs: DeepPartial<ExecutionRecord>[]) {
        if (NO_LOG) return [];
       // const rdbs = execs.map(x => this.records.create(x));
       // const rdbExecs = await this.records.save(rdbs);
        const batch = this.firestore.batch();
        execs.forEach((exec, i) => {
            const id = genId();
            const path = this.firestore.collection("execution_records2").doc(id.toString());
            exec.id = id;
            batch.create(path, this.toObject(exec));
        });
        await batch.commit();
        return execs.map(x => x.id) as number[];
    }

    private async updateRecord(id: number, exec: DeepPartial<ExecutionRecord>) {
        if (NO_LOG) return;
        await Promise.all([
        //    await this.records.update(id, exec),
           await this.firestore.collection("execution_records2").doc(id.toString()).update(this.toObject(exec))
        ]);
    }

    private async saveDocument(add: DeepPartial<AdditionalExecutionData>) {
        if (NO_LOG) return add;
        if (add?.web?.document) {
            const key = `ex${toTimestamp(new Date())}${randomPositiveInteger()}`;
            const reps = await getRepositories();
            await reps.s3.putObject({ Bucket: "exabroker", Key: "traces/" + key, Body: add?.web?.document }).promise();
            add.web.document = key;
            return add;
        } else {
            return add;
        }
    }

    async startExecution(parentId: number | null, type: ExecutionType, layer: string, name: string, additional: DeepPartial<AdditionalExecutionData> = {}) {
        if (NO_LOG) return 0;
        additional = await this.saveDocument(additional);
        return await this.createRecord({
            layer,
            name,
            type,
            status: ExecutionStatus.RUNNING,
            parentExecutionId: parentId,
            startedAt: new Date(),
            ...additional
        });
    }

    async failedExecution(id: number, exception: string | object | null = null, additional: DeepPartial<AdditionalExecutionData> = {}) {
        if (NO_LOG) return;
        additional = await this.saveDocument(additional);
        await this.updateRecord(id, {
            status: ExecutionStatus.FAILED,
            endedAt: new Date(),
            exception: getException(exception),
            ...additional
        });
    }

    async completedExecution(id: number, additional: DeepPartial<AdditionalExecutionData> = {}) {
        if (NO_LOG) return;
        additional = await this.saveDocument(additional);
        await this.updateRecord(id, {
            status: ExecutionStatus.COMPLETED,
            endedAt: new Date(),
            ...additional
        });
    }

    async submitExecutions(parentId: number | null, submissions: ExecutionSubmission[]) {
        if (NO_LOG) return [];
        const adds = await Promise.all(submissions.map(async x => x.additional ? await this.saveDocument(x.additional) : {}));
        const execs = submissions.map((x, i) => ({
            layer: x.layer,
            name: x.name,
            startedAt: x.startedAt,
            endedAt: x.endedAt,
            type: x.type,
            exception: getException(x.exception),
            ...adds[i],
            status: x.successful ? ExecutionStatus.COMPLETED : ExecutionStatus.FAILED,
            parentExecutionId: parentId,
        }));
        console.log(execs);
        return await this.createRecords(execs);
    }

    async updateExecution(id: number, additional: DeepPartial<AdditionalExecutionData> = {}) {
        if (NO_LOG) return;
        additional = await this.saveDocument(additional);
        await this.updateRecord(id, additional)
    }
}