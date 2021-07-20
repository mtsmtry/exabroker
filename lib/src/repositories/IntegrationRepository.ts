import { EntityManager, Repository } from "typeorm";
import { ArbQoo10Amazon } from "../entities/integration/ArbQoo10Amazon";
import { ArbYahooAmazon } from "../entities/integration/ArbYahooAmazon";
import { ArbYahooAmazonCanceled, ArbYahooAmazonCanceledDto, CancelAuctionMessageStatus } from "../entities/integration/ArbYahooAmazonCanceled";
import { ArbYahooAmazonSold, MessageStatus } from "../entities/integration/ArbYahooAmazonSold";
import { ArbYahooAmazonSync, SyncMethod } from "../entities/integration/ArbYahooAmazonSync";
import { YahooAuctionHistory } from "../entities/integration/YahooAmazonHistory";
import { ImageAuctionStatus, YahooImageAuction } from "../entities/integration/YahooImageAuction";
import { AmazonItem } from "../entities/website/AmazonItem";
import { AmazonItemState } from "../entities/website/AmazonItemState";
import { Qoo10Exhibit } from "../entities/website/Qoo10Exhibit";
import { AuctionDealStatus, YahooAuctionDeal } from "../entities/website/YahooAuctionDeal";
import { AuctionImage, YahooAuctionExhibit } from "../entities/website/YahooAuctionExhibit";

export class IntegrationRepository {
    exhibits: Repository<YahooAuctionExhibit>;
    qoo10exhibits: Repository<Qoo10Exhibit>;
    amazonItems: Repository<AmazonItem>;
    yaArbs: Repository<ArbYahooAmazon>;
    yaSoldArbs: Repository<ArbYahooAmazonSold>;
    yaCanceledArbs: Repository<ArbYahooAmazonCanceled>;
    yaSyncArbs: Repository<ArbYahooAmazonSync>;
    qoo10Arbs: Repository<ArbQoo10Amazon>;
    imageAuctions: Repository<YahooImageAuction>;
    auctionDeal: Repository<YahooAuctionDeal>;
    auctionHistory: Repository<YahooAuctionHistory>;

    constructor(mng: EntityManager) {
        this.exhibits = mng.getRepository(YahooAuctionExhibit);
        this.qoo10exhibits = mng.getRepository(Qoo10Exhibit);
        this.amazonItems = mng.getRepository(AmazonItem);
        this.yaArbs = mng.getRepository(ArbYahooAmazon);
        this.yaSoldArbs = mng.getRepository(ArbYahooAmazonSold);
        this.yaCanceledArbs = mng.getRepository(ArbYahooAmazonCanceled);
        this.yaSyncArbs = mng.getRepository(ArbYahooAmazonSync);
        this.qoo10Arbs = mng.getRepository(ArbQoo10Amazon);
        this.imageAuctions = mng.getRepository(YahooImageAuction);
        this.auctionDeal = mng.getRepository(YahooAuctionDeal);
        this.auctionHistory = mng.getRepository(YahooAuctionHistory);
    }

    async upsertAuctionHistory(asin: string, dealCount: number) {
        if (await this.auctionHistory.findOne({ asin })) {
            await this.auctionHistory.update({ asin }, { dealCount });
        } else {
            const history = this.auctionHistory.create({ asin, dealCount });
            await this.auctionHistory.save(history);
        }
    }

    async getAuctionHistory(asin: string) {
        return await this.auctionHistory.findOne({ asin });
    }

    async createImageAuction(aid: string, name: string) {
        const auction = this.imageAuctions.create({
            aid, name
        });
        await this.imageAuctions.save(auction);
    }

    async getIsImageAuctionExhibited(username: string, name: string) {
        // 出品中の画像
        const count = await this.imageAuctions
            .createQueryBuilder('yia')
            .leftJoinAndSelect('yia.exhibit', 'exhibit')
            .where('(exhibit.actuallyEndDate IS NULL AND exhibit.endDate < NOW())')
            .andWhere('exhibit.username = :username', { username })
            .andWhere('yia.name = :name', { name })
            .getCount();
        console.log(`${username} ${name} count: ${count}`);
        return count > 0;
    }

    async getSoldImageAuctions(username: string) {
        // 出品中の画像
        const r = await this.imageAuctions
            .createQueryBuilder('yia')
            .leftJoinAndSelect('yia.exhibit', 'exhibit')
            .where('exhibit.actuallyEndDate IS NOT NULL')
            .andWhere('exhibit.username = :username', { username })
            .getMany();
        console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        console.log(r);
        return r;
    }

    async createArb(aid: string, asin: string, state: AmazonItemState, price: number) {
        const auction = this.yaArbs.create({ aid, asin });
        await this.yaArbs.save(auction);
        await this.createArbSync({
            id: auction.id,
            amazonItemStateId: state.id,
            method: SyncMethod.INITIAL,
            newPrice: price
        });
    }

    async createArbQoo10(itemCode: string, asin: string) {
        const auction = this.qoo10Arbs.create({ itemCode, asin });
        await this.qoo10Arbs.save(auction);
    }

    async setOrderId(aid: string, orderId: string) {
        await this.yaSoldArbs.update({ aid }, { orderId });
    }

    async setMessageStatus(aid: string, messageStatus: MessageStatus | null) {
        await this.yaSoldArbs.update({ aid }, { messageStatus });
    }

    async setImageAuctionStatus(aid: string, status: ImageAuctionStatus | null) {
        await this.imageAuctions.update({ aid }, { status });
    }

    async setCancelMessageStatus(canceled: ArbYahooAmazonCanceled, messageStatus: CancelAuctionMessageStatus | null) {
        await this.yaCanceledArbs.update(canceled.id, { messageStatus });
    }

    async setRepaid(canceled: ArbYahooAmazonCanceled) {
        await this.yaCanceledArbs.update(canceled.id, { repaid: true });
    }

    async setLeftFeedback(aid: string) {
        await this.yaSoldArbs.update({ aid }, { leftFeedback: true });
    }

    async getSoldArbsByUsername(username: string) {
        await this.createAllSoldArb();
        return await this.yaSoldArbs.createQueryBuilder("arb")
            .leftJoinAndSelect("arb.arb", "arb2")
            .leftJoinAndSelect("arb.deal", "deal")
            .leftJoinAndSelect("deal.buyer", "buyer")
            .leftJoinAndSelect("arb.order", "order")
            .leftJoinAndSelect("arb.canceled", "canceled")
            .where("deal.username = :username", { username })
            .getMany();
    }

    async getSoldArbsByStatus(status: AuctionDealStatus) {
        await this.createAllSoldArb();
        return await this.yaSoldArbs.createQueryBuilder("arb")
            .leftJoinAndSelect("arb.arb", "arb2")
            .leftJoinAndSelect("arb.deal", "deal")
            .leftJoinAndSelect("deal.buyer", "buyer")
            .leftJoinAndSelect("arb.order", "order")
            .leftJoinAndSelect("arb.canceled", "canceled")
            .where("deal.status = :status", { status })
            .getMany();
    }

    async getMustOrderArbs() {
        await this.createAllSoldArb();
        return await this.yaSoldArbs.createQueryBuilder("arb")
            .leftJoinAndSelect("arb.arb", "arb2")
            .leftJoinAndSelect("arb.deal", "deal")
            .leftJoinAndSelect("deal.buyer", "buyer")
            .leftJoinAndSelect("arb.order", "order")
            .leftJoinAndSelect("arb.canceled", "canceled")
            .where("arb.orderId IS NULL AND (deal.status = 'paid' OR deal.status = 'shipped')")
            .getMany();
    }

    async existsAuctionExhibit(asin: string) {
        const count = await this.yaArbs.createQueryBuilder("i")
            .innerJoin(YahooAuctionExhibit, "e", "i.aid = e.aid")
            .where({ asin })
            .andWhere("e.endDate > CURRENT_TIMESTAMP AND e.actuallyEndDate IS NULL")
            .getCount();
        return count > 0;
    }

    async existsQoo10Exhibit(asin: string) {
        const count = await this.qoo10Arbs.createQueryBuilder("i")
            .innerJoin(Qoo10Exhibit, "e", "i.itemCode = e.itemCode")
            .where({ asin })
            .andWhere("e.deletedAt IS NULL")
            .getCount();
        return count > 0;
    }

    private async getExhibitASINs() {
        const results = await this.exhibits.createQueryBuilder("e")
            .select(["i.asin"])
            .innerJoin(ArbYahooAmazon, "i", "i.aid = e.aid")
            .where("e.endDate > CURRENT_TIMESTAMP AND e.actuallyEndDate IS NULL")
            .getRawMany();
        return results.map(x => x.i_asin as string);
    }

    private async getQoo10ExhibitASINs() {
        const results = await this.qoo10exhibits.createQueryBuilder("e")
            .select(["i.asin"])
            .innerJoin(ArbQoo10Amazon, "i", "i.itemCode = e.itemCode")
            .where("e.deletedAt IS NULL")
            .getRawMany();
        return results.map(x => x.i_asin as string);
    }

    async getExhibitableASINs2(count: number) {
        const exhibitAsins = await this.getExhibitASINs();

        const ngWords = ["Amazon", "輸入", "Blu-ray", "DVD"];
        let conds = "true";
        conds += " AND stockCount > 0";
       // conds += " AND " + ngWords.map(x => `item.title NOT LIKE '%${x}%'`).join(" AND ");
        const items = await this.amazonItems.createQueryBuilder("item")
            .select(["item.asin"])
            .where(conds)
            .orderBy("item.reviewCount", "DESC")
            .limit(exhibitAsins.length + count)
            .getRawMany();
        const rankedAsins = items.map(x => x.item_asin as string);

        return rankedAsins.filter(asin => !exhibitAsins.includes(asin)).slice(0, count);
    }

    async hasNoYahooAuctionHistoryAmazonItems(count: number) {
        const items = await this.amazonItems.createQueryBuilder("item")
            .select(["item.asin", "item.title"])
            .leftJoin(YahooAuctionHistory, "h", "h.asin = item.asin")
            .where("h.dealCount IS NULL")
            .orderBy("item.reviewCount", "DESC")
            .limit(count)
            .getRawMany();
        return items.map(x => ({ asin: x.item_asin as string, title: x.item_title as string }));
    }

    async getExhibitableASINs(count: number) {
        const exhibitAsins = await this.getExhibitASINs();

        const ngWords = ["Amazon", "輸入", "Blu-ray", "DVD"];
        let conds = "true";
        //  conds += " AND item.updatedAt > DATE_SUB(CURRENT_DATE, INTERVAL 3 DAY)";
        conds += " AND LENGTH(item.title) != CHARACTER_LENGTH(item.title)"
        conds += " AND LENGTH(item.title) > 100";
        conds += " AND item.price > 500";
        conds += " AND item.price < 1000";
        conds += " AND " + ngWords.map(x => `item.title NOT LIKE '%${x}%'`).join(" AND ");
        // 2週間以内の記録で在庫がある
        conds += " AND ((s.hasEnoughStock = 1 AND s.isAddon = 0) OR s.id IS NULL OR s.timestamp < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 14 DAY))";
        // 過去1週間以内に出品を試みていない
        conds += " AND (s.timestamp IS NULL OR s.timestamp < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 DAY))"
        conds += " AND h.dealCount > 0";
        const items = await this.amazonItems.createQueryBuilder("item")
            .select(["item.asin"])
            .leftJoin(AmazonItemState, "s", "s.id = item.latestStateId")
            .leftJoin(YahooAuctionHistory, "h", "h.asin = item.asin")
            .where(conds)
            .orderBy("item.reviewCount", "DESC")
            .limit(exhibitAsins.length + count)
            .getRawMany();
        const rankedAsins = items.map(x => x.item_asin as string);

        return rankedAsins.filter(asin => !exhibitAsins.includes(asin)).slice(0, count);
    }

    async getExhibitableASINs3(count: number) {
        const exhibitAsins = await this.getExhibitASINs();

        const ngWords = ["Amazon", "輸入", "Blu-ray", "DVD"];
        let conds = "true";
        //  conds += " AND item.updatedAt > DATE_SUB(CURRENT_DATE, INTERVAL 3 DAY)";
        conds += " AND LENGTH(item.title) != CHARACTER_LENGTH(item.title)"
        conds += " AND LENGTH(item.title) > 100";
        conds += " AND item.price > 700";
        conds += " AND item.price < 6000";
        conds += " AND " + ngWords.map(x => `item.title NOT LIKE '%${x}%'`).join(" AND ");
        // 2週間以内の記録で在庫がある
        conds += " AND ((s.hasEnoughStock = 1 AND s.isAddon = 0) OR s.id IS NULL OR s.timestamp < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 14 DAY))";
        // 過去1週間以内に出品を試みていない
        conds += " AND (s.timestamp IS NULL OR s.timestamp < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 7 DAY))"
        conds += " AND h.dealCount > 0";
        const items = await this.amazonItems.createQueryBuilder("item")
            .select(["item.asin"])
            .leftJoin(AmazonItemState, "s", "s.id = item.latestStateId")
            .leftJoin(YahooAuctionHistory, "h", "h.asin = item.asin")
            .where(conds)
            .orderBy("item.reviewCount", "DESC")
            .limit(exhibitAsins.length + count)
            .getRawMany();
        const rankedAsins = items.map(x => x.item_asin as string);

        return rankedAsins.filter(asin => !exhibitAsins.includes(asin)).slice(0, count);
    }

    async getQoo10ExhibitableASINs(count: number) {
        const exhibitAsins = await this.getExhibitASINs();

        const ngWords = ["Amazon", "輸入", "Blu-ray", "DVD"];
        let conds = "true";
        //  conds += " AND item.updatedAt > DATE_SUB(CURRENT_DATE, INTERVAL 3 DAY)";
        conds += " AND LENGTH(item.title) != CHARACTER_LENGTH(item.title)"
        conds += " AND LENGTH(item.title) > 100";
        conds += " AND item.price > 700";
        conds += " AND item.price < 6000";
        conds += " AND " + ngWords.map(x => `item.title NOT LIKE '%${x}%'`).join(" AND ");
        // 2週間以内の記録で在庫がある
        conds += " AND ((s.hasEnoughStock = 1 AND s.isAddon = 0) OR s.id IS NULL OR s.timestamp < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 14 DAY))";
        // 過去1週間以内に出品を試みていない
        conds += " AND (s.timestamp IS NULL OR s.timestamp < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 7 DAY))"
    //  conds += " AND h.dealCount > 0";
        const items = await this.amazonItems.createQueryBuilder("item")
            .select(["item.asin"])
            .leftJoin(AmazonItemState, "s", "s.id = item.latestStateId")
    //      .leftJoin(YahooAuctionHistory, "h", "h.asin = item.asin")
            .where(conds)
            .orderBy("item.reviewCount", "DESC")
            .limit(exhibitAsins.length + count)
            .getRawMany();
        const rankedAsins = items.map(x => x.item_asin as string);

        return rankedAsins.filter(asin => !exhibitAsins.includes(asin)).slice(0, count);
    }

    async createAllSoldArb() {
        const notExists = (query: string) => `NOT EXISTS(${query})`;
        const arbs = await this.yaArbs.createQueryBuilder("arb")
            .innerJoin(YahooAuctionDeal, "deal", "deal.aid = arb.aid")
            .where(notExists(this.yaArbs.manager.createQueryBuilder()
                .from(ArbYahooAmazonSold, "sold")
                .where("sold.aid = arb.aid")
                .getQuery()))
            .getMany();
        const ents = arbs.map(arb => this.yaSoldArbs.create({ id: arb.id, aid: arb.aid }));
        await this.yaSoldArbs.save(ents);
    }

    async createCanceledArb(dto: ArbYahooAmazonCanceledDto) {
        const ent = this.yaCanceledArbs.create({
            id: dto.arbId,
            amazonItemStateId: dto.amazonItemStateId,
            cancelReason: dto.cancelReason
        });
        await this.yaCanceledArbs.save(ent);
    }

    async createArbSync(dto: {
        id: number,
        amazonItemStateId: number,
        method: SyncMethod,
        oldPrice?: number,
        newPrice?: number
    }) {
        const sync = this.yaSyncArbs.create(dto);
        await this.yaSyncArbs.save(sync);
    }

    async getExhibitCount() {
        return await this.exhibits.createQueryBuilder("e")
            .where("e.endDate > CURRENT_TIMESTAMP AND e.actuallyEndDate IS NULL")
            .getCount();
    }

    async getArbsNotChecked(seconds: number) {
        const items = await this.yaArbs.createQueryBuilder("arb")
            .innerJoin("arb.exhibit", "e")
            .where("e.endDate > CURRENT_TIMESTAMP AND e.actuallyEndDate IS NULL")
            .andWhere("DATEDIFF(second, COALESCE(arb.amazonCheckedAt, e.startDate), CURRENT_TIMESTAMP) > :seconds", { seconds })
            .select([ "arb.id", "arb.aid", "arb.asin", "e.price" ])
            .getRawMany();
        return items.map(x => ({
            id: x.arb_id as number,
            aid: x.arb_aid as string,
            asin: x.arb_asin as string,
            price: x.e_price as number
        }));
    }

    async getAuctionImages(asin: string) {
        const exhibit = await this.yaArbs.createQueryBuilder("arb")
            .innerJoin("arb.exhibit", "e")
            .where("arb.asin = :asin AND e.startDate > DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 60 DAY) AND e.images IS NOT NULL", { asin })
            .select([ "e.images" ])
            .getRawOne();
        return exhibit?.e_images as AuctionImage[] | null;
    }
}