import * as lib from "exabroker-lib";
import * as cluster from "cluster";

const SUB_PROCESS_COUNT = 0;

if (cluster.isMaster) {
    (async () => {
        const crawler = await lib.createAmazonCrawler();
        await crawler.initCrawling();
        for (var i = 0; i < SUB_PROCESS_COUNT; i++) {
            cluster.fork();
        }
        console.log("Initialized");
        await crawler.crawl();
        console.log("Finished");
    })();
} else {
    (async () => {
        const crawler = await lib.createAmazonCrawler();
        console.log("Initialized");
        await crawler.crawl();
        console.log("Finished");
    })();
}