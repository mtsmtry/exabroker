import { Connection } from "typeorm";
import { createDatabaseConnection } from "../Factory";
import { AmazonRepository } from "../repositories/AmazonRepository";
import { YahooRepository } from "../repositories/YahooRepository";
import { ExecutionAtom } from "./Execution";

let conn: Connection = null as any;
async function init() {
    if (!conn) {
        conn = await createDatabaseConnection();
    }
}
init();

const amazonRep = new AmazonRepository(conn.manager);
const yahooRep = new YahooRepository(conn.manager);

export class DBAmazonExecution<T1, T2> extends ExecutionAtom<T1, T2> {
    constructor(exec: (rep: AmazonRepository, val: T1) => Promise<T2>) {
        async function run(val: T1) {
            const result = await exec(amazonRep, val);
            return { result };
        }
        super("DBAmazonExecution", "", run);
    }
}

export class DBYahooExecution<T1, T2> extends ExecutionAtom<T1, T2> {
    constructor(exec: (rep: YahooRepository, val: T1) => Promise<T2>) {
        async function run(val: T1) {
            const result = await exec(yahooRep, val);
            return { result };
        }
        super("DBYahooExecution", "", run);
    }
}