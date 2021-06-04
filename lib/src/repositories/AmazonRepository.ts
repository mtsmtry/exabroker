import { DeepPartial, EntityManager, MoreThanOrEqual, Not, Repository } from "typeorm";
import { AmazonItem } from "../entities/website/AmazonItem";
import { AmazonItemDetail } from "../entities/website/AmazonItemDetail";
import { BrowseNode } from "../entities/BrowseNode";
import { YahooAuctionExhibit } from "../entities/website/YahooAuctionExhibit";
import { amazonItemDetailCollection, AMAZON_ITEM_DETAIL_VERSION } from "../collections/AmazonItemDetailCollection";
import { Document } from "../system/Document";
import * as aws from "aws-sdk";
import { AmazonAccount } from "../entities/website/AmazonAccount";
import { AmazonOrder, DeliveryAddress, DeliveryPlace, OrderStatus } from "../entities/website/AmazonOrder";
import { AmazonItemState } from "../entities/website/AmazonItemState";

function random(min: number, max: number) {
    return Math.floor( Math.random() * (max + 1 - min) ) + min;
}

export class AmazonRepository {
    amazonItems: Repository<AmazonItem>;
    amazonItemDetails: Repository<AmazonItemDetail>;
    browseNodes: Repository<BrowseNode>;
    accounts: Repository<AmazonAccount>;
    orders: Repository<AmazonOrder>;
    itemStates: Repository<AmazonItemState>;

    constructor(mng: EntityManager, private s3: aws.S3) {
        this.amazonItems = mng.getRepository(AmazonItem);
        this.amazonItemDetails = mng.getRepository(AmazonItemDetail);
        this.browseNodes = mng.getRepository(BrowseNode);
        this.accounts = mng.getRepository(AmazonAccount);
        this.orders = mng.getRepository(AmazonOrder);
        this.itemStates = mng.getRepository(AmazonItemState);
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

    async createAccount(email: string, password: string) {
        const account = this.accounts.create({
            email, password
        });
        await this.accounts.save(account);
    }

    async saveCookies(email: string, cookies: { [name: string]: string }) {
        await this.accounts.update(email, { cookies, loggedinAt: new Date });
    }

    async getAccount(email: string) {
        return await this.accounts.createQueryBuilder("x")
            .where({ email })
            .getOne();
    }

    async createOrder(dto: {
        orderId: string,
        asin: string,
        account: string,
        price: number,
        deliveryAddress: DeliveryAddress,
        deliveryAddressText: string,
        deliveryDay: Date,
        deliveryLatestDay: Date | null,
        deliveryDayText: string
    }) {
        const order = this.orders.create({ ...dto, status: OrderStatus.NONE });
        await this.orders.save(order);
    }

    async updateOrderDetail(orderId: string, dto: {
        status: OrderStatus,
        deliveryCompany: string | null,
        deliveryTrackingId: string | null,
        deliveryPlace: DeliveryPlace | null,
        deliveryPhotoUrl: string | null
    }) {
        await this.orders.update(orderId, dto);
    }

    async getOrdersNotReceived(account: string) {
        return await this.orders.createQueryBuilder()
            .where({ account, status: Not(OrderStatus.RECEIVED) })
            .getMany();
    }

    async getOrder(orderId: string) {
        return await this.orders.findOne({ orderId });
    }

    async createItemState(asin: string, price: number | null, hasStock: boolean, isAddon: boolean) {
        const state = this.itemStates.create({ asin, price, hasStock, isAddon });
        return await this.itemStates.save(state);
    }
}