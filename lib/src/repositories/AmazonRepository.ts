import { EntityManager, Repository } from "typeorm";
import { AmazonItem } from "../entities/AmazonItem";
import { AmazonItemDetail } from "../entities/AmazonItemDetail";
import { BrowseNode } from "../entities/BrowseNode";

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
            await this.browseNodes.update(nodeId, { latestPage: page });
        } else {
            await this.browseNodes.update(nodeId, { completed: true });
        }

        console.log(`completed:node=${nodeId},page=${page},hasItem=${hasItem}`);
    }

    async upsertAmazonItems(items: AmazonItem[]) {
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
    }

    async getCrawlingBrowseNodes(count: number): Promise<BrowseNode[]> {
        const currentLevelBrowseNode = await this.browseNodes
            .createQueryBuilder()
            .where({ completed: false })
            .andWhere("level >= 1")
            .orderBy("level", "ASC")
            .limit(1)
            .getOne();
        if (!currentLevelBrowseNode) {
            return [];
        }
        const currentLevel = currentLevelBrowseNode.level;

        return await this.browseNodes
            .createQueryBuilder()
            .where({ completed: false, level: currentLevel })
            .orderBy("latestPage", "ASC")
            .limit(count)
            .getMany();
    }
}