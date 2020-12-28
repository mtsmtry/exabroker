import fetch from "node-fetch";
import { Document, WebClient } from "../../web/WebClient";
import { notNull, randomString } from "../../Utils";
import { WebDriver } from "../../web/WebDriver";
import { string0To255 } from "aws-sdk/clients/customerprofiles";
import { YahooRepository } from "../../repositories/YahooRepository";
import * as xml from "xml-js";
import * as request from "superagent"
import { parseFloatOrNull } from "../../scrapers/Utils";
import { DriverException, DriverExceptionType } from "./DriverException";
import { TextDecoder } from "text-encoding";

export enum Prefecture {
    "北海道"=1, "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
    "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
    "山梨県", "長野県", "新潟県", "富山県", "石川県", "福井県", "岐阜県",
    "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
    "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
    "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
    "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県", "海外"
}

export enum AuctionSort {
    "おすすめ順" = "score2,d",
    "現在価格の安い順" = "cbids,a",
    "現在価格の高い順" = "cbids,d",
    "入札件数の多い順" = "bids,a",
    "入札件数の少ない順" = "bids,d",
    "残り時間の短い順" = "end,a",
    "残り時間の長い順" = "end,d",
    "即決価格の安い順" = "bidorbuy,a",
    "即決価格の高い順" = "bidorbuy,d",
    "注目のオークション順" = "featured,d"
}

function getPrefectureString(pre: Prefecture): string {
    const prefectures = [
        "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
        "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
        "山梨県", "長野県", "新潟県", "富山県", "石川県", "福井県", "岐阜県",
        "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
        "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
        "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
        "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県", "海外"];
    return prefectures[pre - 1];
}

export interface PostYahooUserInfo {
    select: "non_premium" | "premium";

    // 苗字: 山田
    last_name: string;
    // 名前: 太郎
    first_name: string;

    // 郵便番号: 7918011
    zip: string

    // 県: 38 (愛媛県)
    state: Prefecture;

    // 市: 松山市
    city: string

    // 住所: 中央1-1-1
    address1: string

    // ビル、マンション名: オーブ
    address2: string

    // 電話番号: 0899235652
    phone: string
}

export interface GetYahooUserInfo {
    nameSei: string;
    nameMei: string;
    postNum: string;
    addressSet: string;
    bildNum: string;
    phone: string;
}

export interface YahooAuctionAccountStatus {
    isPremium: boolean;
    isExhibitable: boolean;
    rating: number;
    balance: number;
}

export interface AuctionImageUploadResponse {
    total_results_available: number,
    total_results_returned: number,
    first_result_position: number,
    images: { url: string, width: number, height: number }[]
}

export interface YahooAuctionCategory {
    id: number;
    name: string;
    path: string;
    depth: number;
    isAdult: boolean;
}

export enum ShipSchedule {
    "1～2日で発送" = 1, "3～6日で発送" = 4, "7～13日で発送" = 5, "14日以降に発送" = 6
}

export interface SearchedAuction {
    title: string;
    aid: string;
    sellerId: string;
    sellerRating: number;
    bidPrice: number;
    buyPrice: number | null;
}

export interface AuctionExhibition {
    // main ----------------------------------------
    // オークション(auction)/定額(buynow)/値下げ交渉(offer)
    salesmode: "auction" | "buynow" | "offer";  
    // 数量(0-9)
    Quantity: number;        
    StartPrice: number;
    BidOrBuyPrice: number;
    // 新品、未使用(new)/未使用に近い(used10)/目立った傷や汚れなし(used20)
    // やや傷や汚れあり(used40)/傷や汚れあり(used60)/全体的に状態が悪い(used80)
    istatus: "new" | "used10" | "used20" | "used40" | "used60" | "used80";       
    istatus_comment: string;
    // かんたん決済
    dskPayment: "ypmOK";  
    // description
    Title: string;
    // テキスト(text)/HTML(html)
    submit_description: "text" | "html"; 
    Description: string;
    Description_rte: string;
    Description_plain: string;
    // datetime ----------------------------------------
    ClosingYMD: string;
    ClosingTime: number;
    submitUnixtime: number;
    Duration: number;
    // shipping ----------------------------------------
    shiptime: "payment";
    shippinginput: "now";
    is_other_ship: "yes" | "no";
    shipname1: string;
    shipschedule: ShipSchedule;
    // 都道府県
    loc_cd: Prefecture; 
    // 市区町村
    city: string;             
    // 返品:不可(0)/可(1)        
    retpolicy: 0 | 1;               
    retpolicy_comment: string;
    // options ----------------------------------------
    // 総合評価で制限
    minBidRating: 0;
    // 非常に悪い・悪い評価の割合で制限
    badRatingRatio: "yes" | "no";
    // 入札者認証制限:なし(0)/あり(1)
    bidCreditLimit: 0 | 1;
    // 自動延長
    AutoExtension: "yes" | "no";
    // 早期終了
    CloseEarly: "yes" | "no";
    // 自動再出品(0-3)
    numResubmit: number;
    shipping: "seller" | "buyer";
    nonpremium: 0 | 1;
    category: number;
}

export interface WalletSingup {
    pay_type: "CC"
    conttype: "regpay"
    acttype: "regist"
    namel: string
    namef: string
    kanal: string
    kanaf: string
    zip: string
    pref: string
    city: string
    addr1: string 
    addr2: string
    ph: string
    credit_bank_check: "on"
    ccnum: string
    ccexpMo: number
    ccexpYr: number
    cvv: number
}

export interface AuctionDetail {
    aid: string;
    title: string;
    sellerId: string;
}

export enum FeedbackRaring {
    VeryGood = "veryGood",
    Good = "good",
    Normal = "normal",
    Bad = "bad",
    VeryBad = "veryBad"
}

export function vaildYahooUserInfo(post: PostYahooUserInfo, get: GetYahooUserInfo) {
    return post.last_name == get.nameSei 
        && post.first_name == get.nameMei
        && post.zip == get.postNum
        && `${getPrefectureString(post.state)} ${post.city} ${post.address1}` == get.addressSet
        && post.address2 == get.bildNum
        && post.phone == get.phone
}

function toNotNull<T>(src: T): { [P in keyof T]: Exclude<T[P], null | undefined> } {
    return Object.keys(src).reduce((m, x) => {
        const value = src[x];
        if (value === null || value === undefined) {
            throw `${x} is null or undefined`;
        } else {
            m[x] = value;
        }
        return m;
    }, {}) as any;
}

export class YahooAuctionDriver {
    private client: WebClient;

    constructor() {
        this.client = new WebClient();
    }

    setCookies(cookies: { [name: string]: string }) {
        this.client.setCookies(cookies);
    }

    private getFormHiddenInputData(doc: Document, xpath: string) {
        const form = doc.get(xpath);
        if (!form) {
            throw "form is null";
        }

        // Hidden inputs
        const inputs = form.find(".//input[@type='hidden']");
        return inputs.map(input => {
            const name = input.attr("name") || input.attr("id");
            const value = input.attr("value");
            return name !== null ? { name, value: value ? value : "" } : null;
        }).filter(notNull).reduce((m: object, x) => {
            m[x.name] = x.value;
            return m;
        }, {} as object);
    }

    private getFormInputAndSelectData(doc: Document, xpath: string) {
        const form = doc.getNeeded(xpath);

        // Inputs
        const inputs = form.find(".//input");
        const inputData = inputs.map(input => {
            const name = input.attr("name") || input.attr("id");
            const value = input.attr("value");
            return name ? { name, value: value ? value : "" } : null;
        }).filter(notNull).reduce((m: object, x) => {
            m[x.name] = x.value;
            return m;
        }, {} as object);

        // Selects
        const selects = form.find(".//select");
        const selectData = selects.map(select => {
            const name = select.attr("name") || select.attr("id");
            const selected = select.find("./option").filter(x => x.hasAttr("selected"));
            const value = selected.length > 0 ? selected[0].attr("value") : null;
            return name && value ? { name, value } : null;
        }).filter(notNull).reduce((m: object, x) => {
            m[x.name] = x.value;
            return m;
        }, {} as object);

        return { ...inputData, ...selectData };
    }

    async login(username: string, password: string) {
        console.log(`  driver:login ${username} ${password}`);     
        const driver = new WebDriver();
        await driver.navigate("https://login.yahoo.co.jp/config/login");
        await (await driver.getOne("//*[@id='username']")).sendKeys(username);
        await (await driver.getOne("//*[@id='btnNext']")).click();
        await (await driver.getOne("//*[@id='passwd']")).sendKeys(password);
        await (await driver.getOne("//*[@id='btnSubmit']")).click();
        const cookies = await driver.getCookies();
        this.setCookies(cookies);
        await driver.quit();
        return cookies;
    }

    private async relogin(url: string, password: string) {
        console.log(`  driver:relogin ${url} ${password}`);     
        const driver = new WebDriver(this.client.cookies);
        await driver.navigate(url);
        await (await driver.getOne("//*[@id='passwd']")).sendKeys(password);
        await (await driver.getOne("//*[@id='btnSubmit']")).click();
        const cookies = await driver.getCookies();
        this.setCookies(cookies);
        await driver.quit();
    }

    private parseDate(date: string) {
        // ex: 2020年 12月 26日 13時 21分
        const m = date.match("([0-9]+)年 ([0-9]+)月 ([0-9]+)日 ([0-9]+)時 ([0-9]+)分");
        if (!m) {
            throw "Do not match date format";
        }
        return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]), parseInt(m[4]), parseInt(m[5]));
    }

    async setUserInfo(info: PostYahooUserInfo) {   
        console.log(`  driver:setUserInfo ${info}`);     

        // Get form data, note: select=non_premium is necessary
        let doc = await this.client.get("https://contact.auctions.yahoo.co.jp/setting/user/initialedit?select=non_premium");
        const form = this.getFormHiddenInputData(doc, "//form[@method='POST']");
        
        // Submit
        const data = { ...form, ...info };
        doc = await this.client.post("https://contact.auctions.yahoo.co.jp/setting/user/initialsubmit?select=non_premium", data);

        // Check
        const main = doc.get("//div[@id='yjMain']");
        if (!main || !main.text.includes("出品者情報の登録が完了しました")) {
            throw new DriverException(DriverExceptionType.OnCheck, doc);
        }
    }

    async getUserInfo(): Promise<GetYahooUserInfo> {
        console.log(`  driver:getUserInfo`);
        const doc = await this.client.get("https://contact.auctions.yahoo.co.jp/setting/top?fnavi=3");
        return toNotNull({
            nameSei: doc.get(`//p[@class='ptsNameSei']`)?.text,
            nameMei: doc.get(`//p[@class='ptsNameMei']`)?.text,
            postNum: doc.get(`//p[@class='ptsPostNum']`)?.text,
            addressSet: doc.get(`//p[@class='ptsAddressSet']`)?.text,
            bildNum: doc.get(`//p[@class='ptsBildNum']`)?.text,
            phone: doc.get(`//div[@class='decCnfWr']`)?.text,
        });
    }

    async getAccountStatus(username: string): Promise<YahooAuctionAccountStatus> {
        console.log(`  driver:getAccountStatus ${username}`);
        const doc = await this.client.get("https://auctions.yahoo.co.jp/user/jp/show/mystatus");
        doc.save();
        const tag = doc.getNeeded("//*[@id='acMdStatus']");
        const rating = tag.get(`.//a[@href='https://auctions.yahoo.co.jp/jp/show/rating?userID=${username}']`);
        const balance = tag.get(`.//a[@href='https://receive.wallet.yahoo.co.jp/list']`);
        return toNotNull({
            isPremium: tag.text.includes("プレミアム会員登録済み"),
            isExhibitable: !tag.text.includes("出品制限中") && !tag.text.includes("停止中"),
            rating: tag.text.includes("新規") ? 0 : rating?.extractDigits(),
            balance: balance?.extractDigits()
        });
    }

    async getCategory(keyword: string): Promise<YahooAuctionCategory[]> {
        console.log(`  driver:getCategory ${keyword}`);

        // Get AuctionWebService application id
        let doc = await this.client.get("https://auctions.yahoo.co.jp/sell/jp/show/topsubmit?select=flea_market");
        const eappid = doc.getNeeded("//*[@name='eappid']").attrNeeded("value");
        function parseJSONP(jsonp) {
            return JSON.parse(jsonp.slice(7, -1));
        }

        // Query categorySuggest
        const query = { q: keyword, eappid, output: "json" };
        doc = await this.client.get("https://auctions.yahooapis.jp/AuctionWebService/V1/categorySuggest", query);
        const json = parseJSONP(doc.buffer.toString());
        return json.ResultSet.Result.CategoryList.Category.map(x => {
            return {
                id: parseInt(x.CategoryId),
                name: x.CategoryName.trim(),
                path: x.CategoryPath.trim(),
                depth: parseInt(x.Depth),
                isAdult: parseInt(x.IsAdult) > 0,
            }
        });
    }

    async uploadImages(urls: string[]): Promise<AuctionImageUploadResponse> {
        console.log(`  driver:uploadImages ${urls.join(",")}`);
        // Get crumb
        const doc = await this.client.get("https://auctions.yahoo.co.jp/sell/jp/show/submit");
        const data = this.getFormHiddenInputData(doc, "//form[@name='auction']");
        
        // Get images
        const imgs = await Promise.all(urls.map(url => this.client.get(url)));

        // Upload images with crumb
        let req = request.post("https://auctions.yahoo.co.jp/img/images/new")
            .field(".crumb", data["img_crumb"]);
        imgs.forEach((img, i) => {
            req.attach(`files[${i}]`, img.buffer, { filename: `files[${i}].jpg`, contentType: "image/jpeg" });
        })
        req.set("Cookie", this.client.getCookies());
        const res = JSON.parse((await req).text) as AuctionImageUploadResponse;

        // Check
        if (res.total_results_available != urls.length) {
            throw `Upload failed ${urls.length - res.total_results_available} / ${urls.length}`;
        }
        return res;
    }

    async submitAuction(auction: AuctionExhibition, imgs: { url: string, width: number, height: number }[]) {
        console.log(`  driver:submitAuction ${auction.Title}`);
        // Set images
        imgs.forEach((img, i) => {
            auction[`ImageFullPath${i+1}`] = img.url;
            auction[`ImageWidth${i+1}`] = img.width;
            auction[`ImageHeight${i+1}`] = img.height;
        });

        // Preview
        let doc = await this.client.post("https://auctions.yahoo.co.jp/sell/jp/show/preview", auction);
        
        // Set form data
        const data = this.getFormHiddenInputData(doc, "//form[@name='auction']");
        Object.assign(auction, data);

        // Submit
        doc = await this.client.post("https://auctions.yahoo.co.jp/sell/jp/config/submit", auction);
        
        // Check and maybe throw error 
        const error = doc.get("//div[@id='modAlertBox']//div[@class='decJS']")?.text;
        if (error) {
            throw error;
        }

        // Return
        return toNotNull({
            aid: doc.text.match("aID=([0-9a-z]+)")?.[1],
            endDate: new Date(data["endDate"] as number * 1000)
        });
    }

    async cancelAuction(aid: string) {
        console.log(`  driver:cancelAuction ${aid}`);
        // Get crumb
        let doc = await this.client.get(`https://page.auctions.yahoo.co.jp/jp/show/cancelauction?aID=${aid}`);
        const crumb = doc.getNeeded("//*[@name='crumb']").attrNeeded("value");

        // Cancel
        const data = { "aID": aid, crumb };
        doc = await this.client.post("https://page.auctions.yahoo.co.jp/jp/config/cancelauction", data);
        
        // Check
        if (!doc.get("//*[@id='closedHeader']")) {
            throw new DriverException(DriverExceptionType.OnCheck, doc);
        }
    }

    async getNotices() {
        console.log(`  driver:getNotices`);
        const doc = await this.client.get("https://auctions.yahoo.co.jp/jp/show/myaucinfo");
        const notices = doc.find("//*[@id='modItemNewList']/table/tr").slice(1, -1).map(tr => {
            const code = tr.getNeeded(".//input").attrNeeded("value");
            return code.includes("payms") ? null : toNotNull({
                code,
                type: code.match("type=([a-z]+)")?.[1],
                aid: code.match("aid=([a-z0-9]+)")?.[1],
                message: tr.getNeeded(".//a").text,
                date: this.parseDate(tr.getNeeded("./td[@class='decTd05']").text)
            });
        }).filter(notNull);
        return {
            notices,
            formData: notices.length > 0 ? this.getFormHiddenInputData(doc, "//form[@name='auctionList']") : {}
        };
    }

    async removeNotices(codes: string[], formData: object) {
        console.log(`  driver:removeNotices`);
        const data = { aidlist: codes, ...formData };
        await this.client.post("https://auctions.yahoo.co.jp/jp/uconfig/removenotice", data);
    }

    async searchAution(keyword: string, sort: AuctionSort): Promise<SearchedAuction[]> {
        console.log(`  driver:searchAution ${keyword} ${sort}`); 
        const [s1, o1] = sort.split(",");
        const params = { p: keyword, mode: 2, n: 100, s1, o1 };
        const doc = await this.client.get("https://auctions.yahoo.co.jp/search/search", params);
        const items = doc.find("//ul[@class='Products__items']/li[@class='Product']");
        return items.map(item => {
            const titleLink = item.getNeeded(".//a[@class='Product__titleLink']");
            return {
                buyPrice: item.get(".//span[@class='Product__priceValue']")?.extractDigits() || null,
                ...toNotNull({
                    title: titleLink.text,
                    aid: titleLink.attrNeeded("href").match("auction/([0-9a-z]+)")?.[1],
                    bidPrice: item.getNeeded(".//span[@class='Product__priceValue u-textRed']").extractDigits(),
                    sellerId: item.getNeeded(".//a[@class='Product__seller']").text,
                    sellerRating: parseFloatOrNull(item.getNeeded(".//a[@class='Product__rating']").text.slice(0, -1))
                })
            };
        });
    }

    async buyAuction(aid: string, price: number) {
        console.log(`  driver:buyAuction ${aid} ${price}`); 
        const bid = { Quantity: 1, buynow: 1, Bid: price };

        // Get form data
        let doc = await this.client.get(`https://page.auctions.yahoo.co.jp/jp/auction/${aid}`);

        // Preview
        let data: object = { ...this.getFormHiddenInputData(doc, "//form[@method='post']"), ...bid };
        doc = await this.client.post("https://auctions.yahoo.co.jp/jp/show/bid_preview", data);
        data = this.getFormHiddenInputData(doc, "//form[@method='post']");

        // Place bid
        doc = await this.client.post("https://auctions.yahoo.co.jp/jp/config/placebid", data);

        // Check
        const box = doc.get("//*[@id='modAlertBox']");
        if (!box || !box.text.includes("あなたが落札しました")) {
            throw new DriverException(DriverExceptionType.OnCheck, doc);
        }
    }

    async getAuction(aid: string): Promise<AuctionDetail> {
        console.log(`  driver:getAuction ${aid}`); 
        const doc = await this.client.get(`https://page.auctions.yahoo.co.jp/jp/auction/${aid}`);
        return toNotNull({
            aid,
            title: doc.getNeeded("//h1[@class='ProductTitle__text']").text,
            sellerId: doc.getNeeded("//span[@class='Seller__name']/a").text,
        });
    }

    async startAuction(aid: string, sellerId: string, myId: string) {
        console.log(`  driver:startAuction ${aid}`); 

        // Get start url
        const params = { aid, syid: sellerId, bid: myId };
        let doc = await this.client.get("https://contact.auctions.yahoo.co.jp/buyer/top", params);
        const url = doc.getNeeded("//a[text()='取引をはじめる']").attrNeeded("href");

        // Get form data
        doc = await this.client.get(`https://contact.auctions.yahoo.co.jp${url}`);
        let form = this.getFormInputAndSelectData(doc, "//form[@action='/buyer/preview']");

        // Preview
        let data: any = { ...form, SendInfo1: 1, myCountry: 1, sendAddress: 0 };
        doc = await this.client.post("https://contact.auctions.yahoo.co.jp/buyer/preview", data);
        doc.save();

        // Submit
        data = this.getFormHiddenInputData(doc, "//form[@action='/buyer/submit']");
        doc = await this.client.post("https://contact.auctions.yahoo.co.jp/buyer/submit", data);
       
        // Check
        const msg = doc.get("//div[@id='yjMain']");
        if (!msg || !msg.text.includes("出品者に取引情報の連絡をしました")) {
            throw new DriverException(DriverExceptionType.OnCheck, doc);
        }
    }

    async payAuction(aid: string, cvv: number, transPrice: number) {
        console.log(`  driver:payAuction ${aid}`); 

        function loadDoc(doc: Document, begin: RegExp) {
            return new Document(new TextDecoder("euc-jp")
                .decode(doc.buffer)
                .replace(/<!--[\s\S\r\n]*?-->/g, "")
                .match(begin.source + /[\s\S\r\n]+<\/form>/g.source)?.[0] || "");
        }

        // Get url
        let doc = await this.client.get(`https://auctions.yahoo.co.jp/jp/config/jpypay?aID=${aid}`);
        const url = doc.getNeeded("//input[@name='.done']").attrNeeded("value");

        // Get form data
        doc = await this.client.get(url, {}, "binary");
        doc = loadDoc(doc, /<form method="POST"/g);
        let form = this.getFormInputAndSelectData(doc, ".");

        // Preview
        let data: object = { ...form, 
            scode: cvv,
            transprice: transPrice, 
            paytype: "card", // Necessary!!
            selectCard: "wcc1"  // Necessary!!
        };
        doc = await this.client.post("https://auc.payment.yahoo.co.jp/Payment", data, "binary");
        doc = loadDoc(doc, /<form name="nextHandler"/g);
        form = this.getFormHiddenInputData(doc, ".");

        // Submit
        data = { ...form, _entry: "PaymFinish", paytype: "card" }
        doc = await this.client.post("https://auc.payment.yahoo.co.jp/Payment", data, "binary");     
    }

    async informReceiving(aid: string) {
        console.log(`  driver:informReceiving ${aid}`);
    }

    async getWalletSignupFormData(password: string): Promise<object | null> {
        console.log(`  driver:getWalletSignupFormData`); 

        // Get crumb
        await this.relogin("https://edit.wallet.yahoo.co.jp/config/wallet_signup", password);
        let doc = await this.client.get("https://edit.wallet.yahoo.co.jp/config/wallet_signup");
        
        // Check
        if (doc.get("//div[@id='yjMain']")?.text.includes("すでに登録済みです")) {
            return null;
        }
        const form = this.getFormHiddenInputData(doc, "//form[@name='theform']");
        return form;
    }

    async signupWallet(wallet: WalletSingup, formData: object) {
        console.log(`  driver:signupWallet`); 

        // Signup
        const data = { 
            ...formData, 
            ...wallet,
            edit: "登録" // Necessary!!
        };
        const doc = await this.client.post("https://edit.wallet.yahoo.co.jp/config/wallet_signup", data);

        // Check
        const msg = doc.get("//div[@id='msg']")?.text;
        if (!msg || !msg.includes("登録が完了しました")) {
            throw new DriverException(DriverExceptionType.OnCheck, doc);
        }
    }

    async deleteWallet() {
        console.log(`  driver:deleteWallet`); 

        // Get crumb
        let doc = await this.client.get("https://edit.wallet.yahoo.co.jp/config/wallet_delete");
        const form = this.getFormHiddenInputData(doc, "//form[@name='theform']");

        // Delete
        const data = { ...form, edit: "はい" }
        doc = await this.client.post("https://edit.wallet.yahoo.co.jp/config/wallet_delete", data);

        // Check
        const msg = doc.get("//div[@id='msg']")?.text;
        if (!msg || !msg.includes("削除が完了しました")) {
            throw new DriverException(DriverExceptionType.OnCheck, doc);
        }
    }

    async leaveFeedback(aid: string, targetId: string, rating: FeedbackRaring = FeedbackRaring.VeryGood, message: string = "ありがとうございました。とても良い取引ができました。また機会がありましたら、よろしくお願いいたします。") {
        // Get form data
        const params = { aID: aid, t: targetId };
        let doc = await this.client.get("https://auctions.yahoo.co.jp/jp/show/leavefeedback", params);
        const form = this.getFormHiddenInputData(doc, "//form[method='post']");

        // Submit
        const data = { ...form, rating, previewComment: message }
        doc = await this.client.post("https://auctions.yahoo.co.jp/jp/submit/leavefeedback", data);

        // Check
        if (!doc.text.includes("を送信しました")) {
            throw new DriverException(DriverExceptionType.OnCheck, doc);
        }
    }
}