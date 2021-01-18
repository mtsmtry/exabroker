import { createCrawlingContainer } from "../src/Index";
import { getRepositories } from "../src/system/Database";

async function main() {
    const worker = createCrawlingContainer();
    await worker.init();
    await worker.run();
}

main();
