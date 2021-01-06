import { Connection } from "typeorm";
import { createDatabaseConnection } from "../../Factory";
import { AmazonRepository } from "../../repositories/AmazonRepository";
import { YahooRepository } from "../../repositories/YahooRepository";
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

export class DBExecution<T, TRep> extends ExecutionAtom<T> {
    constructor(rep: TRep,  exec: (rep: TRep) => Promise<T>) {
        async function run() {
            const result = await exec(rep);
            return { result };
        }
        super("DBExecution", "", run());
    }

    static amazon<T>(exec: (rep: AmazonRepository) => Promise<T>) {
        return new DBExecution(amazonRep, exec);
    }

    static yahoo<T>(exec: (rep: YahooRepository) => Promise<T>) {
        return new DBExecution(yahooRep, exec);
    }
}