import { EntityManager, LessThan, MoreThan, Not, Repository } from "typeorm";
import { YahooAccount } from "../entities/website/YahooAccount";
import { YahooAuctionBid, BidStatus } from "../entities/website/YahooAuctionBid";
import { AuctionImage, YahooAuctionExhibit } from "../entities/website/YahooAuctionExhibit";
import { YahooAuctionNotice } from "../entities/website/YahooAuctionNotice";
import { Dto, notNull } from "../Utils";
import { YahooAuctionAccountStatus } from "../executions/website/yahoo/YahooDriver";
import { YahooAuctionDeal, YahooAuctionDealDto } from "../entities/website/YahooAuctionDeal";
import { YahooAuctionMessage } from "../entities/website/YahooAuctionMessage";
import { YahooAuctionState } from "../entities/website/YahooAuctionState";
import { YahooAuctionBuyer } from "../entities/website/YahooAuctionBuyer";
import { YahooAmazonExhibitFailure } from "../entities/integration/YahooAmazonExhibitFailure";
import { Qoo10Exhibit } from "../entities/website/Qoo10Exhibit";
import { Qoo10Account } from "../entities/website/Qoo10Account";

export class Qoo10Repository {
    accounts: Repository<Qoo10Account>;
    exhibits: Repository<Qoo10Exhibit>;

    constructor(mng: EntityManager) {
        this.accounts = mng.getRepository(Qoo10Account);
        this.exhibits = mng.getRepository(Qoo10Exhibit);
    }

    async createExhibit(data: {
        itemCode: string,
        userId: string,
        title: string,
        price: number
    }) {
        let exhibit = this.exhibits.create(data)
        exhibit = await this.exhibits.save(exhibit);
    }

    async getAccounts() {
        return await this.accounts.createQueryBuilder().getMany();
    }
}