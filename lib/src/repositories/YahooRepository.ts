import { EntityManager, LessThan, MoreThan, Repository } from "typeorm";
import { YahooAuctionAccountStatus } from "../executions/yahoo/YahooDriver";
import { YahooAccount } from "../entities/YahooAccount";
import { YahooAccountSetting } from "../entities/YahooAccountSetting";
import { YahooAuctionBid, BidStatus } from "../entities/YahooAuctionBid";
import { YahooAuctionExhibit } from "../entities/YahooAuctionExhibit";
import { YahooAuctionNotice } from "../entities/YahooAuctionNotice";
import { Dto } from "../Utils";

export interface AccountSettingInfo {
    nameSei: string;
    nameMei: string;
    nameSeiKana: string;
    nameMeiKana: string;
    phone: string;
    zip: string;
    prefecture: string;
    city: string;
    address1: string;
    address2: string;
    ccNumber: string;
    ccExpMonth: number;
    ccExpYear: number;
    ccCVV: number;
}

export class YahooRepository {
    accounts: Repository<YahooAccount>;
    exhibits: Repository<YahooAuctionExhibit>;
    notices: Repository<YahooAuctionNotice>;
    bids: Repository<YahooAuctionBid>;
    settings: Repository<YahooAccountSetting>;

    constructor(mng: EntityManager) {
        this.accounts = mng.getRepository(YahooAccount);
        this.exhibits = mng.getRepository(YahooAuctionExhibit);
        this.notices = mng.getRepository(YahooAuctionNotice);
        this.bids = mng.getRepository(YahooAuctionBid);
        this.settings = mng.getRepository(YahooAccountSetting);
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

    async createAccount(username: string, password: string) {
        console.log("un" + username);
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

    async createAccountSetting(info: AccountSettingInfo) {
        let setting = this.settings.create(info);
        setting = await this.settings.save(setting);
        return setting.id;
    }

    async saveCookies(username: string, cookies: { [name: string]: string }) {
        await this.accounts.update(username, { cookies, loggedinAt: new Date });
    }

    async saveStatus(username: string, status: YahooAuctionAccountStatus) {
        await this.accounts.update(username, {  
            isPremium: status.isPremium,
            isExhibitable: status.isExhibitable,
            rating: status.rating,
            balance: status.balance,
            statusUpdatedAt: new Date() 
        });
    }

    async createAuctionExhibit(dto: { aid: string, username: string, title: string, price: number, endDate: Date, category: number }) {
        const auction = this.exhibits.create(dto);
        await this.exhibits.save(auction);
    }

    async deleteAuctionExhibit(aid: string) {
        await this.exhibits.delete(aid);
    } 

    async saveNotices(username: string, dto: { aid: string, code: string, message: string, date: Date, type: string }[]) {
        const columns = this.notices.metadata.columns.map(x => x.propertyName);
        const notices = dto.map(x => this.notices.create({ username, ...x}));
        await this.notices
            .createQueryBuilder()
            .insert()
            .orUpdate({ overwrite: columns })
            .values(notices)
            .execute();
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
        await this.exhibits.delete({ endDate: LessThan(new Date()) });
        return await this.exhibits.count({ username });
    }
}