import { EntityManager, LessThan, MoreThan, Not, Repository } from "typeorm";
import { YahooAccount } from "../entities/website/YahooAccount";
import { YahooAccountSetting } from "../entities/website/YahooAccountSetting";
import { YahooAuctionBid, BidStatus } from "../entities/website/YahooAuctionBid";
import { AuctionImage, YahooAuctionExhibit } from "../entities/website/YahooAuctionExhibit";
import { YahooAuctionNotice } from "../entities/website/YahooAuctionNotice";
import { Dto, notNull } from "../Utils";
import { YahooAuctionAccountStatus } from "../executions/website/yahoo/YahooDriver";
import { YahooAuctionDeal, YahooAuctionDealDto } from "../entities/website/YahooAuctionDeal";
import { YahooAuctionMessage } from "../entities/website/YahooAuctionMessage";
import { YahooAuctionState } from "../entities/website/YahooAuctionState";
import { YahooAuctionBuyer } from "../entities/website/YahooAuctionBuyer";

export class YahooRepository {
    accounts: Repository<YahooAccount>;
    exhibits: Repository<YahooAuctionExhibit>;
    notices: Repository<YahooAuctionNotice>;
    bids: Repository<YahooAuctionBid>;
    settings: Repository<YahooAccountSetting>;
    deals: Repository<YahooAuctionDeal>;
    messages: Repository<YahooAuctionMessage>;
    states: Repository<YahooAuctionState>;
    buyers: Repository<YahooAuctionBuyer>;

    constructor(mng: EntityManager) {
        this.accounts = mng.getRepository(YahooAccount);
        this.exhibits = mng.getRepository(YahooAuctionExhibit);
        this.notices = mng.getRepository(YahooAuctionNotice);
        this.bids = mng.getRepository(YahooAuctionBid);
        this.settings = mng.getRepository(YahooAccountSetting);
        this.deals = mng.getRepository(YahooAuctionDeal);
        this.messages = mng.getRepository(YahooAuctionMessage);
        this.states = mng.getRepository(YahooAuctionState);
        this.buyers = mng.getRepository(YahooAuctionBuyer);
    }

    
    async getImageDeal(aid: string) {
        return await this.deals.createQueryBuilder("d")
            .where("d.aid = " + aid)
            .getOne();
    }


    async getAccount(username: string) {
        return await this.accounts.createQueryBuilder("x")
            .leftJoinAndSelect("x.lastSetting", "lastSetting")
            .leftJoinAndSelect("x.desiredSetting", "desiredSetting")
            .where({ username })
            .getOne();
    }

    async getAccountUsernames() {
        const accounts = await this.accounts.find();
        return accounts.map(x => x.username);
    }

    async getExhibitableAccountUsernames() {
        const accounts = await this.accounts.find({ isExhibitable: true });
        return accounts.map(x => x.username);
    }

    async createAccount(username: string, password: string) {
        const account = this.accounts.create({
            username, password
        });
        await this.accounts.save(account);
    }

    async setAccountLastSetting(username: string, settingId: number) {
        await this.accounts.update(username, { lastSettingId: settingId });
    }

    async setAccountDesiredSetting(username: string, settingId: number) {
        await this.accounts.update(username, { desiredSettingId: settingId });
    }

    async saveCookies(username: string, cookies: { [name: string]: string }) {
        await this.accounts.update(username, { cookies, loggedinAt: new Date });
    }

    async updateAccountStatus(username: string, status: YahooAuctionAccountStatus) {
        await this.accounts.update(username, {
            isPremium: status.isPremium,
            isExhibitable: status.isExhibitable,
            rating: status.rating,
            balance: status.balance,
            statusUpdatedAt: new Date()
        });
        
        if (!status.isExhibitable) {
            await this.exhibits.update({ username }, { actuallyEndDate: new Date() });
        }
    }

    async createAuctionExhibit(dto: { aid: string, username: string, title: string, price: number, endDate: Date, category: number, images: AuctionImage[] }) {
        const auction = this.exhibits.create(dto);
        await this.exhibits.save(auction);
    }

    async saveNotices(username: string, dto: { aid: string, code: string, message: string, date: Date, type: string }[]) {
        const columns = this.notices.metadata.columns.map(x => x.propertyName);
        const notices = dto.map(x => this.notices.create({ username, ...x }));
        await this.notices
            .createQueryBuilder()
            .insert()
            .orUpdate({ overwrite: columns })
            .values(notices)
            .execute();
    }

    async getAuctionExhibit(aid: string) {
        return await this.exhibits.findOne({ aid });
    }

    async createAuctionBid(dto: { aid: string, username: string, sellerId: string, title: string, price: number }) {
        const bid = this.bids.create({ ...dto, status: BidStatus.Pending });
        return await this.bids.save(bid);
    }

    async updateAuctionBidStatis(aid: string, status: BidStatus) {
        await this.bids.update(aid, { status });
    }

    async getAuctionBid(aid: string) {
        return await this.bids.findOne(aid);
    }

    async getExhibitCount(username: string) {
        //await this.exhibits.delete({ endDate: LessThan(new Date()) });
        return await this.exhibits.createQueryBuilder()
            .where({ username })
            .andWhere("endDate > CURRENT_TIMESTAMP AND (actuallyEndDate IS NULL OR actuallyEndDate > CURRENT_TIMESTAMP)")
            .getCount();
    }

    async upsertDeal(deal: YahooAuctionDealDto) {
        const ent = this.deals.create({ ...deal, states: undefined, messages: undefined, buyer: undefined });
        await this.deals.save(ent);

        const [buyer, messages, states] = await Promise.all([
            this.buyers.findOne({ aid: deal.aid }),
            this.messages.find({ aid: deal.aid }),
            this.states.find({ aid: deal.aid })
        ]);

        if (deal.buyer) {
            if (buyer) {
                await this.buyers.update(buyer.aid, deal.buyer);
            } else {
                const ent = this.buyers.create({ ...deal.buyer, aid: deal.aid });
                await this.buyers.save(ent);
            }
        }

        const newMsgs = deal.messages.map(msg => {
            const sames = messages.map(x => x.date.getTime() == msg.date.getTime() && x.body == msg.body && x.isMe == msg.isMe);
            return sames.filter(x => x).length == 0 ? msg : null;
        }).filter(notNull).map(msg => {
            return this.messages.create({ ...msg, aid: deal.aid });
        });

        const newStates = deal.states.map(state => {
            const sames = states.map(x => x.date.getTime() == state.date.getTime() && x.body == state.body);
            return sames.filter(x => x).length == 0 ? state : null;
        }).filter(notNull).map(state => {
            return this.states.create({ ...state, aid: deal.aid });
        });

        await this.messages.save(newMsgs);
        await this.states.save(newStates);
    }

    async setExhibitActuallyEndDate(aid: string, endDate: Date) {
        await this.exhibits.update(aid, { actuallyEndDate: endDate });
    }

    async getNoticesNotEndedByType(type: string) {
        return await this.notices.createQueryBuilder("n")
            .innerJoin(YahooAuctionExhibit, "e", "n.aid = e.aid")
            .where("n.type = :type AND e.endDate > CURRENT_TIMESTAMP AND (e.actuallyEndDate IS NULL OR e.actuallyEndDate > CURRENT_TIMESTAMP)", { type })
            .getMany();
    }

    async setAuctionPrice(aid: string, price: number) {
        await this.exhibits.update(aid, { price });
    }
}