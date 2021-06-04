import fetch from "node-fetch";
import { Connection } from "typeorm";
import { CollectionException } from "../../src/entities/system/CollectionException";
import { ExecutionRecord, ExecutionStatus } from "../../src/entities/system/ExecutionRecord";
import { Collection } from "../../src/system/collection/Collection";
import { getRepositories } from "../../src/system/Database";
import { Document } from "../../src/system/Document";
import { Execution } from "../../src/system/execution/Execution";
import { WebExecution } from "../../src/system/execution/WebExecution";
import { randomPositiveInteger } from "../../src/Utils";
import * as libxmljs from "libxmljs";

describe("Execution", () => {
    let conn: Connection;
    beforeAll(async () => {
        const reps = await getRepositories();
        conn = reps.connection;
    });

    it("Atom", async () => {
        const name = `Test${randomPositiveInteger()}`;
        const exec = Execution.atom("Test", name, () => Promise.resolve({ result: "Atom" }));
        const result = await exec.execute();
        expect(result).toEqual("Atom");

        const record = await conn.getRepository(ExecutionRecord).findOne({ name });
        expect(record?.layer).toEqual("Test");
        expect(record?.status).toEqual(ExecutionStatus.COMPLETED);
    });

    it("Atom throw", async () => {
        const name = `Test${randomPositiveInteger()}`;
        const error = `error: ${randomPositiveInteger()}`;
        const exec = Execution.atom("Test", name, () => Promise.reject(error));
        await expect(exec.execute()).rejects.not.toEqual(null);

        const record = await conn.getRepository(ExecutionRecord).findOne({ name });
        expect(record?.layer).toEqual("Test");
        expect(record?.status).toEqual(ExecutionStatus.FAILED);
        expect(record?.exception).toContain(error);
    });

    it("Transaction", async () => {
        const transactionName = `TestTransaction${randomPositiveInteger()}`;
        const atom1Name = `Test${randomPositiveInteger()}`;
        const atom2Name = `Test${randomPositiveInteger()}`;
        const exec = Execution.transaction("Test", transactionName)
            .then(val => Execution.atom("Test", atom1Name, async () => {
                return { result: 1 + 1 };
            }))
            .then(val => Execution.atom("Test", atom2Name, async () => {
                return { result: val + 1 };
            }));
        const result = await exec.execute();

        expect(result).toEqual(3);

        const transactionRecord = await conn.getRepository(ExecutionRecord).findOne({ name: transactionName });
        expect(transactionRecord?.status).toEqual(ExecutionStatus.COMPLETED);
        
        if (transactionRecord) {
            const atomRecords = await conn.getRepository(ExecutionRecord).find({ parentExecutionId: transactionRecord.id });
            expect(atomRecords.length).toEqual(2);
            expect(atomRecords[0].status).toEqual(ExecutionStatus.COMPLETED);
            expect(atomRecords[0].name).toEqual(atom1Name);
            expect(atomRecords[1].status).toEqual(ExecutionStatus.COMPLETED);
            expect(atomRecords[1].name).toEqual(atom2Name);
        }
    });

    it("Transaction throw", async () => {
        const transactionName = `TestTransactionThrow${randomPositiveInteger()}`;
        const error = `error: ${randomPositiveInteger()}`
        const exec = Execution.transaction("Test", transactionName)
            .then(val => Execution.atom("Test", "Test1", async () => {
                return { result: 1 + 1 };
            }))
            .then(val => Execution.atom("Test", "Test2", () => Promise.reject(error)))
            .then(val => Execution.atom("Test", "Test3", async () => {
                return { result: 0 };
            }))
        await expect(exec.execute().catch(e => { console.log(e); return Promise.reject(e); })).rejects.not.toEqual(null);
        const transactionRecord = await conn.getRepository(ExecutionRecord).findOne({ name: transactionName });
        expect(transactionRecord?.status).toEqual(ExecutionStatus.FAILED);
        
        if (transactionRecord) {
            const atomRecords = await conn.getRepository(ExecutionRecord).find({ parentExecutionId: transactionRecord.id });
            expect(atomRecords.length).toEqual(2);
            expect(atomRecords[0].status).toEqual(ExecutionStatus.COMPLETED);
            expect(atomRecords[1].status).toEqual(ExecutionStatus.FAILED);
            expect(atomRecords[1].exception).toContain(error);
        }
    });

    it("Wikipedia libxmljs", async () => {
        const res = await fetch("https://ja.wikipedia.org/wiki/TypeScript");
        const doc = libxmljs.parseHtml(await res.text());
        const elm = doc.find("//*[@id='firstHeading']")[0];
        expect(elm).not.toBeUndefined();
        console.log(elm);
        if (elm) {
            expect(elm.text()).toEqual("TypeScript");
        }
    });

    it("Wikipedia Document", async () => {
        const res = await fetch("https://ja.wikipedia.org/wiki/TypeScript");
        const doc = new Document(await res.text());
        expect(doc.getNeeded("//*[@id='firstHeading']").text).toEqual("TypeScript");
    });

    it("WebTransaction", async () => {
        const transactionName = `TestWebTransaction${randomPositiveInteger()}`;
        const exec = WebExecution.webTransaction(transactionName, "Test", transactionName)
            .thenGet("Test", val => ({
                url: "https://ja.wikipedia.org/wiki/TypeScript"
            }), doc => ({
                title: doc.getNeeded("//*[@id='firstHeading']").text
            }))
            .thenGet("Test", val => ({
                url: `https://ja.wikipedia.org/wiki/${val.title}`
            }), doc => ({
                title: doc.getNeeded("//*[@id='firstHeading']").text
            }));
        const result = await exec.execute();
        expect(result.title).toEqual("TypeScript");

        const transactionRecord = await conn.getRepository(ExecutionRecord).findOne({ name: transactionName });
        expect(transactionRecord?.status).toEqual(ExecutionStatus.COMPLETED);

        if (transactionRecord) {
            const atomRecords = await conn.getRepository(ExecutionRecord).find({ parentExecutionId: transactionRecord.id });
            expect(atomRecords.length).toEqual(0);
        }
    });

    it("WebTransaction throw", async () => {
        const transactionName = `TestWebTransactionThrow${randomPositiveInteger()}`;
        const exec = WebExecution.webTransaction(transactionName, "Test", transactionName)
            .thenGet("Test", val => ({
                url: "https://ja.wikipedia.org/wiki/TypeScript"
            }), doc => ({
                title: doc.getNeeded("//*[@id='firstHeading']").text
            }))
            .thenGet("Test", val => ({
                url: "https://vreuiwbfrwebforfrbwebfoer.com"
            }), doc => ({
                title: doc.getNeeded("//*[@id='firstHeading']").text
            }));
        await expect(exec.execute().catch(e => { console.log(e); return Promise.reject(e); }))
            .rejects.not.toEqual(null);

        const transactionRecord = await conn.getRepository(ExecutionRecord).findOne({ name: transactionName });
        expect(transactionRecord?.status).toEqual(ExecutionStatus.FAILED);

        if (transactionRecord) {
            const atomRecords = await conn.getRepository(ExecutionRecord).find({ parentExecutionId: transactionRecord.id });
            expect(atomRecords.length).toEqual(2);
            expect(atomRecords[0].status).toEqual(ExecutionStatus.COMPLETED);
            expect(atomRecords[0].web.url).toEqual("https://ja.wikipedia.org/wiki/TypeScript");
            expect(atomRecords[1].status).toEqual(ExecutionStatus.FAILED);
        }
    });
})