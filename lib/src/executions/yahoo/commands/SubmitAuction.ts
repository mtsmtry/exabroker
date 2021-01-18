import { Cookie, WebExecution } from "../../../system/execution/WebExecution";
import { getCurrentFilename, toNotNull } from "../../../Utils";
import { getFormHiddenInputData } from "./Utilts";

export enum ShipSchedule {
    "1～2日で発送" = 1, "3～6日で発送" = 4, "7～13日で発送" = 5, "14日以降に発送" = 6
}

export enum Prefecture {
    "北海道"=1, "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
    "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
    "山梨県", "長野県", "新潟県", "富山県", "石川県", "福井県", "岐阜県",
    "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
    "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
    "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
    "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県", "海外"
}

export interface AuctionSubmission {
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

export function submitAuction(session: Cookie, auction: AuctionSubmission, images: { url: string, width: number, height: number }[]) {
    return WebExecution.webTransaction(arguments, "YahooDriver", getCurrentFilename())
        .setCookie(_ => session)
        .thenPost("Preview",
            val => {
                images.forEach((img, i) => {
                    auction[`ImageFullPath${i+1}`] = img.url;
                    auction[`ImageWidth${i+1}`] = img.width;
                    auction[`ImageHeight${i+1}`] = img.height;
                });
                return {
                    url: "https://auctions.yahoo.co.jp/sell/jp/show/preview",
                    form: auction
                };
            },
            doc => ({
                form: getFormHiddenInputData(doc, "//form[@name='auction']")
            }))
        .thenPost("Submit",
            val => ({
                url: "https://auctions.yahoo.co.jp/sell/jp/config/submit",
                form: { ...val.form, ...auction }
            }),
            (doc, val) => ({
                error: doc.get("//div[@id='modAlertBox']//div[@class='decJS']"),
                ...toNotNull({
                    aid: doc.text.match("aID=([0-9a-z]+)")?.[1],
                    endDate: new Date(val.form["endDate"] as number * 1000)
                })
            }))
        .resolve(val => ({
            valid: !val.error,
            result: {
                aid: val.aid,
                endDate: val.endDate
            }
        }));
}
/*
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
    }*/