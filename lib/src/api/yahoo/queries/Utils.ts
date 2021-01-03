import { GetRequestData, WebGet, WebTransaction } from "../../../execution/WebExecution";
import * as path from "path";
import { Document } from "../../../web/WebClient";

export function createWebGet<T1, T2>(make: (val: T1) => GetRequestData, submit: (doc: Document, val: T1) => T2) {
    const stack = new Error().stack as string;
    const name = path.basename(stack.split('at ')[2].trim()).split(':')[0];
    return new WebGet<T1, T2>("YahooDriver", name, make, submit);
}

export function createWebTransaction<T>() {
    const stack = new Error().stack as string;
    const name = path.basename(stack.split('at ')[2].trim()).split(':')[0];
    return new WebTransaction<T, T>("YahooDriver", name);
}