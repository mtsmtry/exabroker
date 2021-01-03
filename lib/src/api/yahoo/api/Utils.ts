import * as path from "path";
import { TransactionExecution } from "../../../execution/Execution";

export function createTransaction<T>() {
    const stack = new Error().stack as string;
    const name = path.basename(stack.split('at ')[2].trim()).split(':')[0];
    return new TransactionExecution<T, T>("Yahoo", name);
}