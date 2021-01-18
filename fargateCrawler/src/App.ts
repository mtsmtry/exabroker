import * as lib from "exabroker-lib";

const worker = lib.createCrawlingContainer();

async function main() {
    await worker.init();
    await worker.run();
}

main();