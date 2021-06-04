import * as lib from "exabroker-lib";

async function main() {
    const worker = lib.createExecutionContainer();
    await worker.init();
    await worker.run();
}

main()