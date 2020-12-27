import { Document } from "../../web/WebClient";

export enum DriverExceptionType {
    OnCheck
}

export class DriverException {
    caller: string;
    constructor(private type: DriverExceptionType, private doc?: Document) {
        //this.caller = arguments.callee.caller.name;
        doc?.save();
    }
}