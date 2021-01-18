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
        const columns = this.amazonItemDetails.metadata.columns.map(x => x.propertyName);
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
        const items = await this.amazonItemDetails.createQueryBuilder("detail")
            .select(["item.asin"])
            .innerJoin(AmazonItem, "item", "detail.asin = item.asin")
            .leftJoin(YahooAuctionExhibit, "exhibit", "detail.asin = exhibit.asin")
            .where(`item.updatedAt > DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY) 
               
                AND exhibit.aid IS NULL 
                AND detail.title NOT LIKE '%Amazon%'
                AND detail.title NOT LIKE '%輸入%'`)
            .orderBy("detail.reviewCount", "DESC")
            .limit(count)
            .getRawMany();
        return items.map(x => x.item_asin as string);
    }

    async getItemDetail(asin: string) {
        let detail = await this.amazonItemDetails.findOne(asin);
        if (!detail) {
            return undefined;
        }

        const item = await this.amazonItems.findOne(asin);
        if (!item) {
            return undefined;
        }
        detail.item = item;

        return detail;
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