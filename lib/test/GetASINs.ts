import { AmazonRepository, createDatabaseConnection } from "../src/Index";

async function main() {
    const conn = await createDatabaseConnection();
    const rep = new AmazonRepository(conn.manager);
    const asins = await rep.getExhibitableASINs(100);
    console.log(asins);
}

main();