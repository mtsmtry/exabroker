import { AmazonRepository } from "../../repositories/AmazonRepository";
import { CrawlingRepository } from "../../repositories/CrawlingRepository";
import { ExecutionRepository } from "../../repositories/ExecutionRepository";
import { YahooRepository } from "../../repositories/YahooRepository";
import { getRepositories } from "../Database";
import { ExecutionAtom } from "./Execution";

export class DBExecution<T, TRep> extends ExecutionAtom<T> {
    constructor(getRep: () => Promise<TRep>,  exec: (rep: TRep) => Promise<T>) {
        async function run() {
            const rep = await getRep();
            const result = await exec(rep);
            return { result };
        }
        super("DBExecution", "", run);
    }

    static amazon<T>(exec: (rep: AmazonRepository) => Promise<T>) {
        return new DBExecution(async () => (await getRepositories()).amazon, exec);
    }

    static yahoo<T>(exec: (rep: YahooRepository) => Promise<T>) {
        return new DBExecution(async () => (await getRepositories()).yahoo, exec);
    }

    static crawling<T>(exec: (rep: CrawlingRepository) => Promise<T>) {
        return new DBExecution(async () => (await getRepositories()).crawling, exec);
    }

    static execution<T>(exec: (rep: ExecutionRepository) => Promise<T>) {
        return new DBExecution(async () => (await getRepositories()).execution, exec);
    }
}