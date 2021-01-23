import { DeepPartial, EntityManager, MoreThanOrEqual, Not, Repository } from "typeorm";
import { AmazonItem } from "../entities/AmazonItem";
import { AmazonItemDetail } from "../entities/AmazonItemDetail";
import { BrowseNode } from "../entities/BrowseNode";
import { YahooAuctionExhibit } from "../entities/YahooAuctionExhibit";
import { amazonItemDetailCollection, AMAZON_ITEM_DETAIL_VERSION } from "../collections/AmazonItemDetailCollection";
import { Document } from "../system/Document";
import * as aws from "aws-sdk";

function random(min: number, max: number) {
    return Math.floor( Math.random() * (max + 1 - min) ) + min;
}

export class AmazonRepository {
    amazonItems: Repository<AmazonItem>;
    amazonItemDetails: Repository<AmazonItemDetail>;
    browseNodes: Repository<BrowseNode>;

    constructor(mng: EntityManager, private s3: aws.S3) {
        this.amazonItems = mng.getRepository(AmazonItem);
        this.amazonItemDetails = mng.getRepository(AmazonItemDetail);
        this.browseNodes = mng.getRepository(BrowseNode);
    }

    async getBrowseNodes(leastLevel: number) {
        const nodes = await this.browseNodes.createQueryBuilder()
            .select([ "nodeId" ])
            .where({ level: MoreThanOrEqual(leastLevel) })
            .getRawMany();
        return nodes.map(x => x.nodeId as string);
    }

    async upsertAmazonItems(items: AmazonItem[]) {
        console.log(`completed:items=${items.length}`);
        items.forEach(item => {
            item.title = item.title.slice(0, 255);
            item.updatedAt = new Date();
        });

        const columns = this.amazonItems.metadata.columns
            .map(x => x.propertyName)
            .filter(x => x != "isCrawledDetail");
            
        await this.amazonItems
            .createQueryBuilder()
            .insert()
            .orUpdate({ overwrite: columns })
            .values(items)
            .execute();
    }

    async upsertAmazonItemDetail(detail: DeepPartial<AmazonItemDetail>) {
        const columns = this.amazonItemDetails.metadata.columns
            .map(x => x.propertyName)
            .filter(x => detail[x] !== undefined);
        await this.amazonItemDetails
            .createQueryBuilder()
            .insert()
            .orUpdate({ overwrite: columns })
            .values(detail)
            .execute();
    }

    async deleteItem(asin: string) {
        await this.amazonItems.delete(asin);
    }
    
    async getExhibitableASINs(count: number) {
        const ngWords = ["Amazon", "輸入", "Blu-ray", "DVD"];
        let conds = "item.updatedAt > DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY)";
   //     conds += " AND exhibit.aid IS NULL";
        conds += " AND LENGTH(item.title) != CHARACTER_LENGTH(item.title)"
        conds += " AND LENGTH(item.title) > 100";
        conds += " AND item.price < 10000"
        conds += " AND " + ngWords.map(x => `item.title NOT LIKE '%${x}%'`).join(" AND ");
        const items = await this.amazonItems.createQueryBuilder("item")
            .select(["item.asin"])
            //.innerJoin(AmazonItem, "item", "detail.asin = item.asin")
        //    .leftJoin(YahooAuctionExhibit, "exhibit", "item.asin = exhibit.asin")
            .where(conds)
            .orderBy("item.reviewCount", "DESC")
            .limit(count)
            .getRawMany();
        console.log(`Items:${items}`);
        return items.map(x => x.item_asin as string);
    }

    async getItemDetail(asin: string) {
        return await this.amazonItemDetails.findOne(asin);
    }

    async getItem(asin: string) {
        return await this.amazonItems.findOne(asin);
    }

    async getNoCrawledDatailASINs(asins: string[]) {
        const items = await this.amazonItemDetails.createQueryBuilder("item")
            .where("asin IN (:...asins)", { asins })
            .select([ "asin" ])
            .getRawMany();
        const crawledASINs = items.map(x => x.item_asin as string);
        return asins.filter(x => !crawledASINs.includes(x));
    }
}