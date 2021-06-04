import { ArbYahooAmazonSold } from "../../entities/integration/ArbYahooAmazonSold";
import { DeliveryAddress } from "../../entities/website/AmazonOrder";
import { AuctionDealStatus } from "../../entities/website/YahooAuctionDeal";
import { DBExecution } from "../../system/execution/DatabaseExecution";
import { Execution } from "../../system/execution/Execution";
import { getCurrentFilename } from "../../Utils";
import * as amazon from "../website/amazon/Amazon";
import * as amazonDriver from "../website/amazon/AmazonDriver";
import { AmazonSession } from "../website/amazon/Amazon";
import { getWideLength, replaceDict } from "./Utils";
import { CancelReason } from "../../entities/integration/ArbYahooAmazonCanceled";
import { isAvailableItem, isPurchasableItem } from "./Algorithm";

const MAX_ADDRESS_LENGTH = 32;

var zenHanMap = {
    "ガ": "ｶﾞ", "ギ": "ｷﾞ", "グ": "ｸﾞ", "ゲ": "ｹﾞ", "ゴ": "ｺﾞ",
    "ザ": "ｻﾞ", "ジ": "ｼﾞ", "ズ": "ｽﾞ", "ゼ": "ｾﾞ", "ゾ": "ｿﾞ",
    "ダ": "ﾀﾞ", "ヂ": "ﾁﾞ", "ヅ": "ﾂﾞ", "デ": "ﾃﾞ", "ド": "ﾄﾞ",
    "バ": "ﾊﾞ", "ビ": "ﾋﾞ", "ブ": "ﾌﾞ", "ベ": "ﾍﾞ", "ボ": "ﾎﾞ",
    "パ": "ﾊﾟ", "ピ": "ﾋﾟ", "プ": "ﾌﾟ", "ペ": "ﾍﾟ", "ポ": "ﾎﾟ",
    "ヴ": "ｳﾞ", "ヷ": "ﾜﾞ", "ヺ": "ｦﾞ",
    "ア": "ｱ", "イ": "ｲ", "ウ": "ｳ", "エ": "ｴ", "オ": "ｵ",
    "カ": "ｶ", "キ": "ｷ", "ク": "ｸ", "ケ": "ｹ", "コ": "ｺ",
    "サ": "ｻ", "シ": "ｼ", "ス": "ｽ", "セ": "ｾ", "ソ": "ｿ",
    "タ": "ﾀ", "チ": "ﾁ", "ツ": "ﾂ", "テ": "ﾃ", "ト": "ﾄ",
    "ナ": "ﾅ", "ニ": "ﾆ", "ヌ": "ﾇ", "ネ": "ﾈ", "ノ": "ﾉ",
    "ハ": "ﾊ", "ヒ": "ﾋ", "フ": "ﾌ", "ヘ": "ﾍ", "ホ": "ﾎ",
    "マ": "ﾏ", "ミ": "ﾐ", "ム": "ﾑ", "メ": "ﾒ", "モ": "ﾓ",
    "ヤ": "ﾔ", "ユ": "ﾕ", "ヨ": "ﾖ",
    "ラ": "ﾗ", "リ": "ﾘ", "ル": "ﾙ", "レ": "ﾚ", "ロ": "ﾛ",
    "ワ": "ﾜ", "ヲ": "ｦ", "ン": "ﾝ",
    "ァ": "ｧ", "ィ": "ｨ", "ゥ": "ｩ", "ェ": "ｪ", "ォ": "ｫ",
    "ッ": "ｯ", "ャ": "ｬ", "ュ": "ｭ", "ョ": "ｮ",
    "。": "｡", "、": "､", "ー": "ｰ", "「": "｢", "」": "｣", "・": "･"
}

function splitByLength(address: string): [string, string] {
    let address1 = "", address2 = "";

    address = address.replace(" ", "");
    let length = 0;
    for (let i = 0; i < address.length; i++) {
        const char = address[i];
        length += getWideLength(char);
        if (length <= MAX_ADDRESS_LENGTH) {
            address1 += char;
        } else {
            address2 += char;
        }
    }

    return [address1, address2];
}

function splitAddress(address: string): [string, string] {
    address = address.replace(/　/, " ");
    const parts = address.split(" ");
    let address1 = "", address2 = "";
    parts.forEach(part => {
        if (getWideLength(address1) + getWideLength(part) <= MAX_ADDRESS_LENGTH) {
            address1 += part;
        } else {
            address2 += part;
        }
    });

    if (getWideLength(address2) > MAX_ADDRESS_LENGTH) {
        [address1, address2] = splitByLength(address);
    }

    if (getWideLength(address2) > MAX_ADDRESS_LENGTH) {
        address = replaceDict(address, zenHanMap);
        [address1, address2] = splitByLength(address);
    }

    return [address1, address2];
}

export function orderAuction(arb: ArbYahooAmazonSold, session: AmazonSession) {
    if (arb.order
        || !arb.deal.buyer
        || arb.deal.status != AuctionDealStatus.PAID
        || arb.canceled) {
        return Execution.cancel();
    }
    const asin = arb.arb.asin;
    const [line1, line2] = splitAddress(arb.deal.buyer.address);
    const address: DeliveryAddress = {
        fullName: arb.deal.buyer.fullName,
        postalCode1: arb.deal.buyer.postalCode1,
        postalCode2: arb.deal.buyer.postalCode2,
        stateOrRegion: arb.deal.buyer.region,
        phoneNumber: arb.deal.buyer.phoneNumber,
        addressLine1: line1,
        addressLine2: line2,
        addressLine3: ""
    }

    return Execution.transaction("Integration", getCurrentFilename())
        .then(val => amazon.getItemState(asin))
        .then(itemState => {
            if (isPurchasableItem(itemState, arb.deal.price)) {
                return Execution.transaction()
                    .then(_ => amazon.orderItem(asin, address, session))
                    .then(orderId => DBExecution.integration(rep => rep.setOrderId(arb.aid, orderId)));
            } else {
                let cancelReason;
                if (!itemState.hasStock) {
                    cancelReason = CancelReason.OUT_OF_STOCK;
                } else if (itemState.isAddon) {
                    cancelReason = CancelReason.IS_ADDON;
                } else {
                    cancelReason = CancelReason.EXPENSIVE;
                }
                return DBExecution.integration(rep => rep.createCanceledArb({ arbId: arb.id, cancelReason, amazonItemStateId: itemState.id }))
            }
        });
}