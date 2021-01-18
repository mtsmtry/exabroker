import { createExecutionContainer } from "../src/Index";

const worker = createExecutionContainer();

async function main() {
    await worker.init();
    await worker.run();
}

main();