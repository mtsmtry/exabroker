import { YahooRepository } from "../repositories/YahooRepository";
import { Prefecture, ShipSchedule, YahooAuctionAccountStatus, YahooAuctionDriver, AuctionExhibition, WalletSingup, PostYahooUserInfo } from "./drivers/YahooAuctionDriver";
import { toTimestamp } from "../Utils";
import { YahooAccount } from "../entities/YahooAccount";
import { BidStatus } from "../entities/YahooAuctionBid";
import { equalsUserInfo, equalsWalletInfo } from "../entities/YahooAccountSetting";

export interface AuctionData {
    images: string[],
    title: string;
    price: number;
    description: string;
    days: number;
    closingHours: number;
    shipSchedule: ShipSchedule;
    shipName: string;
    prefecture: Prefecture;
}

export class YahooAuctionClient {
    driver: YahooAuctionDriver;
    private _account: YahooAccount | null;
    private _status: YahooAuctionAccountStatus | null;

    constructor(private rep: YahooRepository) {
        this.driver = new YahooAuctionDriver();
        this._account = null;
    }

    get account() {
        if (!this._account) {
            throw "Not logined";
        }
        return this._account;
    }

    private get status() {
        if (!this._status) {
            throw "Not logined";
        }
        return this._status;
    }

    private get setting() {
        if (!this.account.lastSetting) {
            throw "Not logined";
        }
        return this.account.lastSetting;
    }

    async login(username: string) {
        console.log(`yahoo:login ${username}`);
        this._account = await this.rep.getAccount(username) || null;
        if (!this._account) {
            throw `${username} is not found`;
        }

        // Login and set cookies
        if (!this._account.cookies) {
            const cookies = await this.driver.login(username, this._account.password);
            await this.rep.saveCookies(username, cookies);
        } else {
            this.driver.setCookies(this._account.cookies);
        }

        // Check login and save the status of the account
        try {
            this._status = await this.driver.getAccountStatus(username);
            await this.rep.saveStatus(username, this._status);
            
        // Relogin
        } catch(ex) {
            const cookies = await this.driver.login(username, this._account.password);
            await this.rep.saveCookies(username, cookies);
            this._status = await this.driver.getAccountStatus(username);
            await this.rep.saveStatus(username, this._status);
        }
    }

    async exhibitAuction(data: AuctionData) {
        console.log(`yahoo:exhibitAuction ${data.title}`);
        // Check nubmer range
        if (!(1 <= data.days && data.days <= 7 && 0 <= data.closingHours && data.closingHours <= 23)) {
            throw "Out of range";
        }

        // Set closing date
        const closingDate = new Date();
        closingDate.setDate(closingDate.getDate() + data.days);

        // Get category
        const category = (await this.driver.getCategory(data.title))[0].id;

        // Upload images
        const uploadResult = await this.driver.uploadImages(data.images);

        // Submit auction
        const auction: AuctionExhibition = {
            salesmode: "buynow",
            Quantity: 1,
            StartPrice: data.price,
            BidOrBuyPrice: data.price,
            istatus: "new",
            istatus_comment: "",
            dskPayment: "ypmOK",  
            Title: data.title,
            submit_description: "text",
            Description: data.description,
            Description_rte: "",
            Description_plain: "",
            ClosingYMD: `${closingDate.getFullYear()}-${closingDate.getMonth() + 1}-${closingDate.getDate()}`,
            ClosingTime: data.closingHours,
            submitUnixtime: toTimestamp(new Date()),
            Duration: data.days,
            shiptime: "payment",
            shippinginput: "now",
            is_other_ship: "yes",
            shipname1: data.shipName,
            shipschedule: data.shipSchedule,
            loc_cd: data.prefecture, 
            city: "",
            retpolicy: 0,               
            retpolicy_comment: "",
            minBidRating: 0,
            badRatingRatio: "yes",
            bidCreditLimit: 1,
            AutoExtension: "yes",
            CloseEarly: "yes",
            numResubmit: 0,
            shipping: "seller",
            nonpremium: this.status.isPremium ? 1 : 0, 
            category: category
        }
        const res = await this.driver.submitAuction(auction, uploadResult.images);

        // Save
        await this.rep.createAuction({ aid: res.aid, username: this.account.username, title: data.title, price: data.price, endDate: res.endDate, category: category });
        return res.aid;
    }

    async cancelAuction(aid: string) {
        console.log(`yahoo:cancelAuction ${aid}`);

        // Cancel and delete
        await this.driver.cancelAuction(aid);
        await this.rep.deleteAuction(aid);
    }

    async getNotices() {
        console.log(`yahoo:getNotices`);
        const res = await this.driver.getNotices();
        if (res.notices.length > 0) {
            await this.rep.saveNotices(this.account.username, res.notices);
            await this.driver.removeNotices(res.notices.map(x => x.code), res.formData);
        }
        return res.notices;
    }

    async setupAccount() {
        console.log(`yahoo:setupAccount`);

        if (!this.account.desiredSetting) {
            return;
        }
        const info = this.account.desiredSetting;

        if (!this.account.lastSetting || !equalsUserInfo(this.account.desiredSetting, this.account.lastSetting)) {
            const user: PostYahooUserInfo = {
                select: "non_premium",
                last_name: info.nameSei,
                first_name: info.nameMei,
                zip: info.zip,
                state: Prefecture[info.prefecture],
                city: info.city,
                address1: info.address1,
                address2: info.address2,
                phone: info.phone
            };
            await this.driver.setUserInfo(user);
        }

        if (!this.account.lastSetting || !equalsWalletInfo(this.account.desiredSetting, this.account.lastSetting)) {
            const wallet: WalletSingup = {
                pay_type: "CC",
                conttype: "regpay",
                acttype: "regist",
                namel: info.nameSei,
                namef: info.nameMei,
                kanal: info.nameSeiKana,
                kanaf: info.nameMeiKana,
                zip: info.zip,
                pref: info.prefecture,
                city: info.city,
                addr1: info.address1,
                addr2: info.address2,
                ph: info.phone,
                credit_bank_check: "on",
                ccnum: info.ccNumber,
                ccexpMo: info.ccExpMonth,
                ccexpYr: info.ccExpYear,
                cvv: info.ccCVV
            }
            let form = await this.driver.getWalletSignupFormData(this.account.password);
            if (!form) {
                await this.driver.deleteWallet();
                form = await this.driver.getWalletSignupFormData(this.account.password);
                if (!form) {
                    throw "Form is null";
                }
            }
            await this.driver.signupWallet(wallet, form);
        }

        await this.rep.setAccountLastSetting(this.account.username, info.id);
    }

    async buyAuction(aid: string, price: number) {
        let bid = await this.rep.getAuctionBid(aid);
        if (!bid) {
            const auction = await this.driver.getAuction(aid);
            bid = await this.rep.createAuctionBid({ username: this.account.username, price, ...auction });
        }

        switch (bid.status) {
            case BidStatus.Pending:
                await this.driver.buyAuction(aid, price);
                await this.rep.updateAuctionBidStatis(aid, BidStatus.Accepted);
            case BidStatus.Accepted:
                await this.driver.startAuction(aid, bid.sellerId, this.account.username);
                await this.rep.updateAuctionBidStatis(aid, BidStatus.Started);
            case BidStatus.Started:
                await this.driver.payAuction(aid, this.setting.ccCVV, 0);
                await this.rep.updateAuctionBidStatis(aid, BidStatus.Paid);
            case BidStatus.Paid:
                await this.driver.payAuction(aid, this.setting.ccCVV, 0);
                await this.rep.updateAuctionBidStatis(aid, BidStatus.Paid);
        }
    }
}