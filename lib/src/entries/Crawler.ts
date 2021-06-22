import { promise } from "selenium-webdriver";
import { CrawlingObject, indexCrawler } from "../crawlers/IndexCrawler";
import { loadBrowseNode } from "../data/BrowseNodeLoader";
import * as scraperapi from "../executions/Scraperapi";
import { CrawlingRepository } from "../repositories/CrawlingRepository";
import { getRepositories } from "../system/Database";
import { Document } from "../system/Document";
import { sleep } from "../Utils";

const arraySplit = <T = object>(array: T[], n: number): T[][] =>
  array.reduce((acc: T[][], c, i: number) => (i % n ? acc : [...acc, ...[array.slice(i, i + n)]]), []);

async function run() {
    console.log("start");
    const reps = await getRepositories();
    const crawlingRep = reps.crawling;
    await crawlingRep.stopAllRunningTasks();

    // ここで各カテゴリの1ページ目をクロールするを作成する
    const nodes = loadBrowseNode();
    const crawlingObjects = nodes.filter(node => node.children.length == 0).map(node => {
        return {
            site: "Amazon",
            page: {
                kind: "BrowseNode",
                nodeId: node.nodeId,
                page: 1
            }
        } as CrawlingObject;
    });

    const batchs = arraySplit(crawlingObjects, 200);
    for(let batch of batchs) {
        await crawlingRep.createTasks(batch);
        console.log(`createTasks: ${batch.length}`)
    }

    // クロールする
    while(true) {
        let conCount = 0;
        while(true) {
            const account = await scraperapi.getAccount().execute();
            console.log(account);
            if (account.requestCount >= account.requestLimit) {
                return;
            }
            conCount = account.concurrencyLimit - account.concurrentRequests;
            if (conCount > 0) {
                break;
            }
        }

        let tasks = await crawlingRep.getTasks(conCount);
        const promises = tasks.map(async task => {
            await indexCrawler.crawl(task.id, task.target);
        });
        await Promise.all(promises);
    }
}

run();