import { EntityManager, Repository } from "typeorm";
import { YahooAuctionAccountStatus } from "../api/drivers/YahooAuctionDriver";
import { YahooAccount } from "../entities/YahooAccount";
import { YahooAuction } from "../entities/YahooAuction";
import { YahooAuctionNotice } from "../entities/YahooAuctionNotice";
import { Dto } from "../Utils";

export class YahooRepository {
    accounts: Repository<YahooAccount>;
    auctions: Repository<YahooAuction>;
    notices: Repository<YahooAuctionNotice>;

    constructor(mng: EntityManager) {
        this.accounts = mng.getRepository(YahooAccount);
        this.auctions = mng.getRepository(YahooAuction);
        this.notices = mng.getRepository(YahooAuctionNotice);
    }

    async getAccount(username: string) {
        return await this.accounts.findOne(username);
    }

    async createAccount(username: string, password: string) {
        console.log("un" + username);
        const account = this.accounts.create({
            username, password
        });
        await this.accounts.save(account);
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

    async createAuction(dto: { aid: string, username: string, title: string, price: number, endDate: Date, category: number }) {
        const auction = this.auctions.create(dto);
        await this.auctions.save(auction);
    }

    async deleteAuction(aid: string) {
        await this.auctions.delete(aid);
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
}