import { BuyerAddress, SoldAuctionState, YahooSoldAuction } from "../../../../entities/YahooSoldAuction";
import { Cookie, WebExecution } from "../../../../system/execution/WebExecution";
import { getCurrentFilename, parseIntOrNull, toNotNull } from "../../../../Utils";

function parseDate(date: string) {
    // ex: 12月26日 13時 21分
    const m = date.match("([0-9]+)月([0-9]+)日 ([0-9]+)時([0-9]+)分");
    if (!m) {
        throw "Do not match date format";
    }
    const month = parseInt(m[1]) - 1;
    const nowYear = new Date().getFullYear();
    const nowMonth = new Date().getMonth() + 1;
    let year = nowYear;
    if (nowMonth == 1 && month == 12) {
        year = nowYear - 1;
    }
    return new Date(year, month, parseInt(m[2]), parseInt(m[3]), parseInt(m[4]));
}

function getState(states: { body: string, date: Date }[]): SoldAuctionState {
    const latestState = states?.[0];
    let state = SoldAuctionState.NONE;
    if (latestState) {
        if (latestState.body.includes("お届け情報")) {
            state = SoldAuctionState.INFORMED;
        } else if (latestState.body.includes("支払い完了")) {
            state = SoldAuctionState.PAID;
        } else if (latestState.body.includes("発送の連絡")) {
            state = SoldAuctionState.SHIPPED;
        } else if (latestState.body.includes("受け取り連絡")) {
            state = SoldAuctionState.RECEIVED;
        }
    }
    return state;
}

export function getSoldAuction(aid: string, username: string, session: Cookie) {
    return WebExecution.get({
        url: `https://contact.auctions.yahoo.co.jp/seller/top?aid=${aid}`,
        cookie: session
    }, doc => {
        function getData(text: string) {
            const th = doc.get(`//th[.='${text}']`);
            return th?.parent.get(".//td");
        }

        const stateHistory = getData("取引の状況")?.find(".//tr").map(tr => ({
            body: tr.getNeeded(".//div").text.match(/・(.+?)。/)?.[1] || "",
            date: parseDate(tr.getNeeded(".//span").text)
        })) || [];

        let state = getState(stateHistory);
        if (doc.get("//*[@class='decState']")?.text.includes("削除")) {
            state = SoldAuctionState.CANCELED;
        }
        if (doc.get("//*[@class='elAdvnc']")?.text.includes("取引を中止しました")) {
            state = SoldAuctionState.CANCELED;
        }
        if (doc.get("//*[@class='elAdvnc']")?.text.includes("まとめて取引依頼")) {
            state = SoldAuctionState.BUNDLE_REQUEST;
        }

        const messages = doc.find("//*[@id='messagelist']//dl").map(dl => ({
            isMe: dl.attr("class")?.includes("ptsOwn") || false,
            date: parseDate(dl.getNeeded(".//span").text),
            body: dl.getNeeded(".//dd").text
        }));

        let buyerAddress: BuyerAddress | null = null;
        if (state != SoldAuctionState.NONE) {
            const address = getData("住所")?.text.replace(/\n/g, "") || "";
            const matchAddress = address.match(/〒([0-9]{3})([0-9]{4})(.+?[都道府県]+)(.*)/);
            if (!matchAddress) {
                throw "Failed to match address";
            }
            buyerAddress = toNotNull({
                shipFee: getData("お届け方法")?.extractDigits() || 0,
                name: getData("氏名")?.text,
                phoneNumber: getData("電話番号")?.text,
                postalCode1: matchAddress[1],
                postalCode2: matchAddress[2],
                region: matchAddress[3].trim(),
                address: matchAddress[4].trim(),
            });
        }

        const result: YahooSoldAuction = {
            buyerAddress,
            ...toNotNull({
                aid,
                username,
                title: doc.getNeeded("//*[@class='decItmName']").text,
                endDate: parseDate(doc.getNeeded("//*[@class='decMDT']").text),
                price: parseIntOrNull(doc.getNeeded("//*[@class='decPrice']").text.match(/([0-9,]+)円/)?.[1].replace(",", "")),
                buyerId: doc.getNeeded("//*[@class='decBuyerID']").text.match(/[0-9a-zA-Z_]+/)?.[0],
                state: getState(stateHistory),
                stateHistory,
                messages
            })
        };

        return result;
    }, "YahooDriver", getCurrentFilename())
}