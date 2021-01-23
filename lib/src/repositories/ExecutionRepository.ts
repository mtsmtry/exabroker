import { DeepPartial, EntityManager, MoreThan, Repository } from "typeorm";
import { CrawlingSchedule } from "../entities/CrawlingSchedule";
import { ExecutionRecord, ExecutionStatus, ExecutionType, WebExecutionData, SequenceExecutionData } from "../entities/ExecutionRecord";
import { ExecutionTask, ExecutionTaskStatus } from "../entities/ExecutionTask"
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

export class ExecutionRepository {
    records: Repository<ExecutionRecord>;
    tasks: Repository<ExecutionTask>;
    schedules: Repository<CrawlingSchedule>;

    constructor(mng: EntityManager, private firestore: FirebaseFirestore.Firestore) {
        this.records = mng.getRepository(ExecutionRecord);
        this.tasks = mng.getRepository(ExecutionTask);
        this.schedules = mng.getRepository(CrawlingSchedule); 
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
        const rdbs = execs.map(x => this.records.create(x));
        const rdbExecs = await this.records.save(rdbs);
        const batch = this.firestore.batch();
        execs.forEach((exec, i) => {
            const path = this.firestore.collection("execution_records").doc(rdbExecs[i].id.toString());
            exec.id = rdbExecs[i].id;
            batch.create(path, this.toObject(exec));
        });
        await batch.commit();
        return rdbExecs.map(x => x.id);
    }

    private async updateRecord(id: number, exec: DeepPartial<ExecutionRecord>) {
        await Promise.all([
            await this.records.update(id, exec),
            await this.firestore.collection("execution_records").doc(id.toString()).update(this.toObject(exec))
        ]);
    }

    private async saveDocument(add: DeepPartial<AdditionalExecutionData>) {
        if (add?.web?.document) {
            const key = `ex${toTimestamp(new Date())}${randomPositiveInteger()}`;
            const reps = await getRepositories();
            await reps.s3.putObject({ Bucket: "exabroker-crawled", Key: "traces/" + key, Body: add?.web?.document }).promise();
            add.web.document = key;
            return add;
        } else {
            return add;
        }
    }

    async startExecution(parentId: number | null, type: ExecutionType, layer: string, name: string, additional: DeepPartial<AdditionalExecutionData> = {}) {
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
        additional = await this.saveDocument(additional);
        await this.updateRecord(id, {
            status: ExecutionStatus.FAILED,
            endedAt: new Date(),
            exception: getException(exception),
            ...additional
        });
    }

    async completedExecution(id: number, additional: DeepPartial<AdditionalExecutionData> = {}) {
        additional = await this.saveDocument(additional);
        await this.updateRecord(id, {
            status: ExecutionStatus.COMPLETED,
            endedAt: new Date(),
            ...additional
        });
    }

    async submitExecutions(parentId: number | null, submissions: ExecutionSubmission[]) {
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
        additional = await this.saveDocument(additional);
        await this.updateRecord(id, additional)
    }

    async createTaskOnSchedule() {
        while(true) {
            const schedules = await this.schedules.createQueryBuilder()
                .where({ pendedUntil: MoreThan(new Date()) })
                .limit(100)
                .getMany();
            if (schedules.length == 0) {
                break;
            }

            const tasks = schedules.map(x => this.tasks.create({ target: x.startupTarget }));
            await this.tasks.save(tasks);
            await this.schedules.update(schedules.map(x => x.id), { lastInvokedAt: new Date() });
        }
    }

    async getTasks(count: number) {
        const process = randomPositiveInteger();

        await this.tasks
            .createQueryBuilder()
            .update()
            .set({ status: ExecutionTaskStatus.RUNNING, process })
            .where({ status: ExecutionTaskStatus.PENDING })
            .orderBy("id", "ASC")
            .limit(count)
            .execute();

        return await this.tasks
            .createQueryBuilder()
            .where({ status: ExecutionTaskStatus.RUNNING, process })
            .getMany();
    }

    async existsTask() {
        const count = await this.tasks.count();
        return count > 0;
    }

    async stopAllRunningTasks() {
        await this.tasks.createQueryBuilder()
            .update()
            .set({ status: ExecutionTaskStatus.PENDING })
            .where({ status: ExecutionTaskStatus.RUNNING })
            .execute();
    }
}