import { CrawlingObject } from "../crawlers/IndexCrawler";
import { AmazonRepository } from "../repositories/AmazonRepository";
import { CrawlingRepository } from "../repositories/CrawlingRepository";
import { getRepositories } from "../system/Database";
import { Worker } from "./Worker";

function getCrawlingObject(nodeId: string): CrawlingObject {
    return {
        site: "Amazon",
        page: {
            kind: "BrowseNode",
            nodeId,
            page: 1
        }
    };
}

export class CrawlingScheduler extends Worker {
    crawlingRep: CrawlingRepository;
    amazonRep: AmazonRepository;

    async init() {
        const reps = await getRepositories();
        this.crawlingRep = reps.crawling;
        this.amazonRep = reps.amazon;
    }

    async run() {
        await this.crawlingRep.removeAllSchedules();
        const nodes = await this.amazonRep.getBrowseNodes(1);
        console.log(nodes);
        const objs = nodes.map(getCrawlingObject);
        await this.crawlingRep.createSchedules(objs, 60 * 24);
    }
}