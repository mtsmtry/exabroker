import { exhibiter } from "../executions/apps/Exhibiter";
import { getRepositories } from "../system/Database";
import { Worker } from "./Worker";

export class ExecutionContainer extends Worker {

    async init() {
        await getRepositories();
    }

    async run() {
        await exhibiter().execute();
    }
}