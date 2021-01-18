import { createDatabaseConnection } from "../src/system/Database";

createDatabaseConnection({
    logging: "all",
    synchronize: true
});