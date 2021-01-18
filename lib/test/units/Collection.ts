import fetch from "node-fetch";
import { Connection } from "typeorm";
import { CollectionException } from "../../src/entities/CollectionException";
import { ExecutionRecord, ExecutionStatus } from "../../src/entities/ExecutionRecord";
import { Collection } from "../../src/system/collection/Collection";
import { getRepositories } from "../../src/system/Database";
import { Document } from "../../src/system/Document";
import { Execution } from "../../src/system/execution/Execution";
import { WebExecution } from "../../src/system/execution/WebExecution";
import { randomPositiveInteger } from "../../src/Utils";
import * as libxmljs from "libxmljs";

const html = `
    <div class="title">TheTitle</div>
    <div>
        <div class="item">ItemA</div>
        <div class="item">ItemB</div>
    </div>
`;
const doc = new Document(html);

describe("Collection", () => {
    let conn: Connection;
    beforeAll(async () => {
        const reps = await getRepositories();
        conn = reps.connection;
    });

    it("Save on single", async () => {
        let items: { name: string }[] = [];
        const coll = Collection.document()
            .multiple(doc => doc.find(".//div[@class='item']"))
            .property(elm => ({ name: elm.text }))
            .saveMany(vals => Execution.atom("Test", "Test", async () => {
                items = vals;
                return { result: null };
            }));
        await coll.collectItems(doc, "tests/index");
        expect(items.length).toEqual(2);
        expect(items[0].name).toEqual("ItemA");
        expect(items[1].name).toEqual("ItemB");
    });

    it("Throw in property on single", async () => { 
        const s3Key = `tests/${randomPositiveInteger()}`;
        const error = `error: ${randomPositiveInteger()}`;

        const coll = Collection.document()
            .single()
            .property(doc => { throw error })
            .propertyRequired(doc => { throw error })
            .saveOne(_ => Execution.resolve(null));
        await coll.collectItems(doc, s3Key);

        const exps = await conn.getRepository(CollectionException).find({ s3Key });
        expect(exps.length).toEqual(2);
        expect(exps[0].message).toEqual(error);
        expect(exps[1].message).toEqual(error);
    });

    it("Throw in property on multiple", async () => { 
        const s3Key = `tests/${randomPositiveInteger()}`;
        const error = `error: ${randomPositiveInteger()}`;
        
        const coll = Collection.document()
            .multiple(doc => doc.find(".//div[@class='item']"))
            .property(doc => { throw error })
            .propertyRequired(doc => { throw error })
            .saveMany(_ => Execution.resolve(null));
        await coll.collectItems(doc, s3Key);

        const exps = await conn.getRepository(CollectionException).find({ s3Key });
        expect(exps.length).toEqual(4);
        expect(exps[0].message).toEqual(error);
        expect(exps[1].message).toEqual(error);
        expect(exps[2].message).toEqual(error);
        expect(exps[3].message).toEqual(error);
    });
});