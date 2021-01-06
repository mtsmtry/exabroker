import * as path from "path";
import * as superagent from "superagent";
import { Document } from "../../web/WebClient";
import { ExecutionAtom, ExecutionAtomResult, Execution, execution } from "./Execution";
import { TransactionExecution } from "./ExecutionComposition";

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

export class WebExecution<T> extends ExecutionAtom<T> {
    constructor(
        layer: string,
        name: string, 
        method: "GET" | "POST",
        data: GetRequestData | PostRequestData, submit: (doc: Document) => T) {
        async function run(): Promise<ExecutionAtomResult<T>> {
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
            const result = submit(doc);

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
        super(layer, name, run());
    }

    static get<T>(data: GetRequestData, submit: (doc: Document) => T, layer: string = "Inner", name: string = "WebGet") {
        return new WebExecution(layer, name, "GET", data, submit);
    }

    static post<T>(data: PostRequestData, submit: (doc: Document) => T, layer: string = "Inner", name: string = "WebPost") {
        return new WebExecution(layer, name, "POST", data, submit);
    }

    static webTransaction<T>(value: T, layer: string = "Inner", name: string = "Lambda") {
        return new WebTransaction<T, T>(layer, name, value);
    }
}

export class WebTransaction<T1, T2> extends TransactionExecution<T1, T2> {
    private cookie: ((val: T2) => Cookie) | null = null;

    constructor(layer: string, name: string, value: T1) {
        super(layer, name, value);
    }

    setCookie(cookie: ((val: T2) => Cookie) | null) {
        this.cookie = cookie;
        return this;
    }

    thenGet<T3>(name: string, make: (val: T2) => GetRequestData, submit: (doc: Document, val: T2) => T3) {
        return this.thenRequest(name, "GET", make, submit);
    }

    thenPost<T3>(name: string, make: (val: T2) => PostRequestData, submit: (doc: Document, val: T2) => T3) {
        return this.thenRequest(name, "POST", make, submit);
    }

    thenExecution<T3>(exec: (val: T2) => Execution<T3>): WebTransaction<T1, T3> {
        return this.then(exec) as any;
    }

    private thenRequest<T3>(name: string, method: "GET" | "POST", make: (val: T2) => GetRequestData | PostRequestData, submit: (doc: Document, val: T2) => T3) {
        const cookie = this.cookie;
        if (cookie) {
            make = (val: any) => ({
                ...make(val),
                cookie: val.cookie || cookie(val)
            }) as any;
            submit = (doc: Document, val: any) => ({
                ...submit(doc, val),
                cookie: val.cookie || cookie(val)
            }) as any;
        }
        return this.then(val => new WebExecution("WebTransaction", name, method, make(val), doc => submit(doc, val))) as WebTransaction<T1, T3>;
    }

    resolve<T3>(submit: (val: T2) => { valid: boolean | undefined, result: T3 }) {
        async function run(val: T2) {
            const result = submit(val);
            if (!result.valid) {
                throw "Web resolve error";
            }
            return { result: result.result };
        }
        return this.then(val => execution("Local", "Resolve", run(val)));
    }
}