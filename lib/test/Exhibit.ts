import { Exhibiter } from "../src/api/apps/Exhibiter";
import { createDatabaseConnection } from "../src/Factory";

async function main() {
    const exhibiter = new Exhibiter(await createDatabaseConnection());
    await exhibiter.testDescription();
}

main();