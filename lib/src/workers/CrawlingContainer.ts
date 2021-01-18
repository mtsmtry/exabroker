import { promise } from "selenium-webdriver";
import { indexCrawler } from "../crawlers/IndexCrawler";
import * as scraperapi from "../executions/Scraperapi";
import { CrawlingRepository } from "../repositories/CrawlingRepository";
import { getRepositories } from "../system/Database";
import { sleep } from "../Utils";
import { Worker } from "./Worker";

export class CrawlingContainer extends Worker {
    crawlingRep: CrawlingRepository;

    async init() {
        const reps = await getRepositories();
        this.crawlingRep = reps.crawling;
        await this.crawlingRep.stopAllRunningTasks();
    }

    async run() {
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

            let tasks = await this.crawlingRep.getTasks(conCount);
            if (tasks.length == 0) {
                const count = await this.crawlingRep.createTaskOnSchedule(conCount);
                if (count == 0) {
                    return;
                }
                tasks = await this.crawlingRep.getTasks(conCount);
            }
            const promises = tasks.map(task => indexCrawler.crawl(task.id, task.target));
            await Promise.all(promises);
        }
    }
}