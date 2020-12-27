import { createDatabaseConnection } from "../src/Factory";

createDatabaseConnection({
    logging: "all",
    synchronize: true
});