import "reflect-metadata";
import * as lib from "../src/Index";

(async () => {
    const bucketName = "exabroker-crawled";
    const objectKey = "browseNodes/2130085051-2";
    const scraper = await lib.createAmazonScraper();
    let result = await scraper.scrapeS3Object(bucketName, objectKey);
    console.log(result);

    const objectKey2 = "items/0006546064";
    result = await scraper.scrapeS3Object(bucketName, objectKey2);
    console.log(result);
})();