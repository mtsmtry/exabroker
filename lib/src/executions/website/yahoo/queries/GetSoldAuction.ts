import { YahooAuctionBuyer, YahooAuctionBuyerDto } from "../../../../entities/website/YahooAuctionBuyer";
import { Cookie, WebExecution } from "../../../../system/execution/WebExecution";
import { getCurrentFilename, parseIntOrNull, toNotNull } from "../../../../Utils";
import { AuctionDealStatus, YahooAuctionDeal, YahooAuctionDealDto } from "../../../../entities/website/YahooAuctionDeal";
import { YahooAuctionMessage, YahooAuctionMessageDto } from "../../../../entities/website/YahooAuctionMessage";
import { YahooAuctionState, AuctionState, YahooAuctionStateDto } from "../../../../entities/website/YahooAuctionState";

function parseDate(date: string) {
    // ex: 12月26日 13時 21分
    const m = date.match(/([0-9]+)月([0-9]+)日 ([0-9]+)時([0-9]+)分/);
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

function getState(body: string): AuctionState | null {
    if (body.includes("お届け情報")) {
        return AuctionState.INFORMED;
    } else if (body.includes("支払い完了")) {
        return AuctionState.PAID;
    } else if (body.includes("発送の連絡")) {
        return AuctionState.SHIPPED;
    } else if (body.includes("受け取り連絡")) {
        return AuctionState.RECEIVED;
    }
    return null;
}

function toStatus(state: AuctionState): AuctionDealStatus {
    switch (state) {
        case AuctionState.INFORMED:
            return AuctionDealStatus.INFORMED;
        case AuctionState.PAID:
            return AuctionDealStatus.PAID;
        case AuctionState.SHIPPED:
            return AuctionDealStatus.SHIPPED;
        case AuctionState.RECEIVED:
            return AuctionDealStatus.RECEIVED;
    }
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

        const states: YahooAuctionStateDto[] = getData("取引の状況")?.find(".//tr").map(tr => {
            const body = tr.getNeeded(".//div").text.match(/・(.+?)。/)?.[1] || "";
            return {
                state: getState(body),
                date: parseDate(tr.getNeeded(".//span").text),
                body,
            }
        }) || [];

        let state = states[0] ? getState(states[0].body) : null;
        let status: AuctionDealStatus = (state ? toStatus(state) : null) || AuctionDealStatus.NONE;
        if (doc.get("//*[@class='decState']")?.text.includes("削除")) {
            status = AuctionDealStatus.CANCELED;
        }
        const elAdvnc = doc.get("//*[@class='elAdvnc']");
        if (elAdvnc?.text.includes("取引を中止しました") || elAdvnc?.text.includes("取引がキャンセル")) {
            status = AuctionDealStatus.CANCELED;
        }
        if (elAdvnc?.text.includes("まとめて取引依頼")) {
            status = AuctionDealStatus.BUNDLE_REQUEST;
        }

        const messages: YahooAuctionMessageDto[] = doc.find("//*[@id='messagelist']//dl").map(dl => ({
            isMe: dl.attr("class")?.includes("ptsOwn") || false,
            date: parseDate(dl.getNeeded(".//span").text),
            body: dl.getNeeded(".//dd").text
        }));

        let buyer: YahooAuctionBuyerDto | null = null;
        if (status != AuctionDealStatus.NONE) {
            const address = getData("住所")?.text.replace(/\n/g, "") || "";
            const matchAddress = address.match(/〒([0-9]{3})([0-9]{4})(.+?[都道府県]+)(.*)/);
            if (!matchAddress) {
                throw "Failed to match address";
            }
            buyer = toNotNull({
                shipFee: getData("お届け方法")?.extractDigits() || 0,
                fullName: getData("氏名")?.text,
                phoneNumber: getData("電話番号")?.text,
                postalCode1: matchAddress[1],
                postalCode2: matchAddress[2],
                region: matchAddress[3].trim(),
                address: matchAddress[4].trim(),
            });
        }

        const result: YahooAuctionDealDto = {
            buyer,
            ...toNotNull({
                aid,
                username,
                title: doc.getNeeded("//*[@class='decItmName']").text,
                endDate: parseDate(doc.getNeeded("//*[@class='decMDT']").text),
                price: parseIntOrNull(doc.getNeeded("//*[@class='decPrice']").text.match(/([0-9,]+)円/)?.[1].replace(",", "")),
                buyerId: doc.getNeeded("//*[@class='decBuyerID']").text.match(/[0-9a-zA-Z_]+/)?.[0],
                status,
                states,
                messages
            })
        };

        return result;
    }, "YahooDriver", getCurrentFilename())
}