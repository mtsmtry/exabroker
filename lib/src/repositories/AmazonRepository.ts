import { EntityManager, Not, Repository } from "typeorm";
import { AmazonItem } from "../entities/AmazonItem";
import { AmazonItemDetail } from "../entities/AmazonItemDetail";
import { BrowseNode, CrawlingStatus } from "../entities/BrowseNode";

function random(min: number, max: number) {
    return Math.floor( Math.random() * (max + 1 - min) ) + min;
}

export class AmazonRepository {
    amazonItems: Repository<AmazonItem>;
    amazonItemDetails: Repository<AmazonItemDetail>;
    browseNodes: Repository<BrowseNode>;

    constructor(mng: EntityManager) {
        this.amazonItems = mng.getRepository(AmazonItem);
        this.amazonItemDetails = mng.getRepository(AmazonItemDetail);
        this.browseNodes = mng.getRepository(BrowseNode);
    }

    async completeBrowseNodeCrawling(nodeId: string, page: number, hasItem: boolean) {
        if (hasItem) {
            await this.browseNodes.update(nodeId, { status: CrawlingStatus.PENDING, latestPage: page });
        } else {
            await this.browseNodes.update(nodeId, { status: CrawlingStatus.COMPLETED });
        }
        console.log(`completed:node=${nodeId},page=${page},hasItem=${hasItem}`);
    }

    async failedBrowseNodeCrawling(nodeId: string, page: number) {
        await this.browseNodes.update(nodeId, { status: CrawlingStatus.PENDING });
        console.log(`failed:node=${nodeId},page=${page}`);
    }

    async upsertAmazonItems(items: AmazonItem[]) {
        console.log(`completed:items=${items.length}`);
        items.forEach(item => {
            item.title = item.title.slice(0, 255);
        });

        const columns = this.amazonItems.metadata.columns.map(x => x.propertyName);
        await this.amazonItems
            .createQueryBuilder()
            .insert()
            .orUpdate({ overwrite: columns })
            .values(items)
            .execute();
    }

    async upsertAmazonItemDetail(detail: AmazonItemDetail) {
        const columns = this.amazonItemDetails.metadata.columns.map(x => x.propertyName);
        await this.amazonItemDetails
            .createQueryBuilder()
            .insert()
            .orUpdate({ overwrite: columns })
            .values(detail)
            .execute();
    }

    async getCrawlingBrowseNodes(count: number): Promise<BrowseNode[]> {
        const currentLevelBrowseNode = await this.browseNodes
            .createQueryBuilder()
            .where({ status: CrawlingStatus.PENDING })
            .andWhere("level >= 1")
            .orderBy("level", "ASC")
            .limit(1)
            .getOne();
        if (!currentLevelBrowseNode) {
            console.log("currentLevelBrowseNode is null!");
            return [];
        }
        const currentLevel = currentLevelBrowseNode.level;
        const process = random(0, 100000000);

        await this.browseNodes
            .createQueryBuilder()
            .update()
            .set({ status: CrawlingStatus.RUNNING, process })
            .where({ status: CrawlingStatus.PENDING, level: currentLevel })
            .orderBy("latestPage", "ASC")
            .limit(count)
            .execute();

        return await this.browseNodes
            .createQueryBuilder()
            .where({ status: CrawlingStatus.RUNNING, process })
            .getMany();
    }

    async checkAllCompleted(): Promise<boolean> {
        const count = await this.browseNodes
            .createQueryBuilder()
            .where({ status: Not(CrawlingStatus.COMPLETED) })
            .andWhere("level >= 1")
            .getCount();
        return count == 0;
    }

    async cancelAllRunningBrowseNodeCrawling() {
        await this.browseNodes.createQueryBuilder()
            .update()
            .set({ status: CrawlingStatus.PENDING })
            .where({ status: CrawlingStatus.RUNNING })
            .execute();
    }

    async resetAllBrowseNodeCrawling() {
        await this.browseNodes.createQueryBuilder()
            .update()
            .set({ status: CrawlingStatus.PENDING, latestPage: 0 })
            .execute();
    }

    async getCrawlingASINs(count: number): Promise<string[]> {
        const items = await this.amazonItems.createQueryBuilder("item")
            .leftJoin(AmazonItemDetail, "details", "item.asin = details.asin")
            .where("details IS NULL")
            .orderBy("item.reviewCount", "DESC")
            .limit(count)
            .getMany();
        return items.map(x => x.asin);
    }
}