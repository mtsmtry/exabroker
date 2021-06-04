import { exhibit } from "../executions/apps/Exhibit";
import { order } from "../executions/apps/Order";
import { support } from "../executions/apps/Support";
import { ExecutionRepository } from "../repositories/ExecutionRepository";
import { getRepositories } from "../system/Database";
import { Worker } from "./Worker";

export class ExecutionContainer extends Worker {
    executionRep: ExecutionRepository;

    async init() {
        const reps = await getRepositories();
        this.executionRep = reps.execution;
    }

    async run() {
        const tasks = await this.executionRep.getTasks();
        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            if (task.method == "exhibit") {
                await exhibit().execute();
            } else if (task.method == "support") {
                await support().execute();
            } else {
                throw `Method '${task.method}' is not found`;
            }
            await this.executionRep.completeTask(task.id);
        }
    }
}