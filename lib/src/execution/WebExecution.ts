import * as path from "path";
import * as superagent from "superagent";
import { Document } from "../web/WebClient";
import { ExecutionAtom, ExecutionAtomResult, Execution, translateExecution, TransactionExecution } from "./Execution";

export type Cookie = { [name: string]: string };

export interface GetRequestData {
    url: string;
    params?: object;
    headers?: object;
    cookie?: Cookie;
    useBinary?: boolean;
}

export interface PostRequestData {
    url: string;
    form?: object;
    headers?: object;
    cookie?: Cookie;
    binary?: Buffer;
    useBinary?: boolean;
    attachments?: {
        field: string,
        buffer: Buffer,
        filename?: string,
        contentType?: string
    }[]
}

function writeCookie(cookie: Cookie) {
    return Object.keys(cookie).map(x => `${x}=${cookie[x]}`).join(";");
}

async function requestGet(data: GetRequestData) {
    const req = superagent.get(data.url);
    if (data.params) {
        req.query(data.params)
    }
    if (data.headers) {
        req.set(data.headers);
    }
    if (data.cookie) {
        req.set("Cookie", writeCookie(data.cookie));
    }
    if (data.useBinary) {
        req.buffer(true).parse(superagent.parse.image);
    }
    return await req;
}

async function requestPost(data: PostRequestData) {
    const req = superagent.get(data.url);
    if (data.form) {
        req.type("form").send(data.form);
    }
    if (data.headers) {
        req.set(data.headers);
    }
    if (data.cookie) {
        req.set("Cookie", writeCookie(data.cookie));
    }
    if (data.attachments) {
        data.attachments.forEach(att => {
            req.attach(att.field, att.buffer, { filename: att.filename, contentType: att.contentType });
        });
    }
    if (data.useBinary) {
        req.buffer(true).parse(superagent.parse.image);
    }
    let res: superagent.Response;
    if (data.binary) {
        req.ok(_ => true)
        req.write(data.binary);
        res = await new Promise((resolve: (res: superagent.Response) => void) => req.end((err, res) => resolve(res)));
        if (res.status >= 400) {
            throw res.status;
        }
    } else {
        res = await req;
    }
    return res;
}

class WebExecution<T1, T2> extends ExecutionAtom<T1, T2> {
    constructor(
        layer: string,
        name: string, 
        method: "GET" | "POST",
        make: (val: T1) => GetRequestData | PostRequestData, submit: (doc: Document, val: T1) => T2) {
        async function run(val: T1): Promise<ExecutionAtomResult<T2>> {
            const val2 = await this.execute(val);
            const data = make(val2);

            let response: superagent.Response;
            let request: object = {};
            if (method == "GET") {
                const data2 = data as GetRequestData;
                response = await requestGet(data2);
                request = { params: data2.params, headers: data2.params };
            } else {
                const data2 = data as PostRequestData;
                response = await requestPost(data2);
                request = { params: data2.form, headers: data2.headers };
            }

            const doc = new Document(response);
            const result = submit(doc, val);

            return {
                result,
                executionData: {
                    web: {
                        method,
                        url: data.url,
                        document: doc.text,
                        request
                    }
                }
            }
        }
        super(layer, name, run);
    }
}

export class WebGet<T1, T2> extends WebExecution<T1, T2> {
    constructor(layer: string, name: string, make: (val: T1) => GetRequestData, submit: (doc: Document, val: T1) => T2) {
        super(layer, name, "GET", make, submit);
    }
}

export class WebPost<T1, T2> extends WebExecution<T1, T2> {
    constructor(layer: string, name: string, make: (val: T1) => PostRequestData, submit: (doc: Document, val: T1) => T2) {
        super(layer, name, "POST", make, submit);
    }
}

const id = x => x;

export class WebTransaction<T1, T2> extends TransactionExecution<T1, T2> {
    private getCookie?: (val: T2) => Cookie;

    constructor(layer: string, name: string) {
        super(layer, name);
    }

    setCookie(getCookie: (val: T2) => Cookie) {
        this.getCookie = getCookie;
        return this;
    }

    thenGet<T3>(name: string, make: (val: T2) => GetRequestData, submit: (doc: Document, val: T2) => T3) {
        return this.thenRequest(name, "GET", make, submit);
    }

    thenPost<T3>(name: string, make: (val: T2) => PostRequestData, submit: (doc: Document, val: T2) => T3) {
        return this.thenRequest(name, "POST", make, submit);
    }

    thenExecution<E1A, E1B extends E1A, E2, T3>(execution: Execution<E1A, E2>, make: (val: T2) => E1B = id, submit: (res: E2, val: T2) => T3 = id) {
        return this.then(translateExecution(execution, make, submit)) as WebTransaction<T1, T3>;
    }

    thenExecution2<T3>(execution: Execution<T2, T3>) {
        return this.then(execution) as WebTransaction<T1, T3>;
    }

    private thenRequest<T3>(name: string, method: "GET" | "POST", make: (val: T2) => PostRequestData, submit: (doc: Document, val: T2) => T3) {
        const getCookie = this.getCookie;
        if (getCookie) {
            make = (val: T2) => ({
                ...make(val),
                cookie: getCookie(val)
            }) as any;
            submit = (doc: Document, val: T2) => ({
                ...submit(doc, val),
                cookie: getCookie(val)
            }) as any;
        }
        return this.then(new WebExecution("WebTransaction", name, method, make, submit)) as WebTransaction<T1, T3>;
    }

    resolve<T3>(submit: (val: T2) => { valid: boolean | undefined, result: T3 }) {
        return this.then(new ExecutionAtom("Local", "Resolve", async (val: T2) => {
            const result = submit(val);
            if (!result.valid) {
                throw "Web resolve error";
            }
            return { result: result.result };
        }));
    }
}