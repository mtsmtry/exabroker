import { createCollectionHandler } from "../src/Index";

async function main() {
    const handler = createCollectionHandler();
    await handler.init();
    await (handler as any).run("exabroker-crawled", "browseNodes/89279051-39");
}

main();