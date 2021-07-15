import { DBExecution } from "../../system/execution/DatabaseExecution";
import { Execution } from "../../system/execution/Execution";
import { getCurrentFilename } from "../../Utils";
import { YahooSession } from "../website/yahoo/Yahoo";
import * as amazon from "../website/amazon/Amazon";
import * as yahoo from "../website/yahoo/Yahoo";
import * as yahooDriver from "../website/yahoo/YahooDriver";
import { FeedbackRaring } from "../website/yahoo/YahooDriver";
import { AmazonOrder, DeliveryPlace, OrderStatus } from "../../entities/website/AmazonOrder";
import { ArbYahooAmazonSold, MessageStatus } from "../../entities/integration/ArbYahooAmazonSold";
import { AuctionDealStatus, YahooAuctionDeal } from "../../entities/website/YahooAuctionDeal";
import { CancelAuctionMessageStatus } from "../../entities/integration/ArbYahooAmazonCanceled";
import { ImageAuctionStatus, YahooImageAuction } from "../../entities/integration/YahooImageAuction";

const tailMessage = "※このメッセージは自動で送信されました。内容の行き違いがございましたら申し訳ございません。";

function initialMessage() {
    const limit = new Date();
    limit.setDate(limit.getDate() + 3);
    const date = fromDateToString(limit);
    return `この度は、ご落札いただき誠にありがとうございます。
短い間ですがお取引終了までよろしくお願いいたします。
${date}までに、お支払いをお願いします。その際は、送料を変更しないようにご注意ください。
また、落札者様には、ご不便おかけしますが、以下のことについてご了承ください。
・外部業者に在庫管理を委託しているため、商品の同送(まとめて取引)や、発送方法の指定はできません。
・商品の受け取り時間帯の指定は、発送後に伝票番号をお知らせしますので、配送業者にお問い合わせいただくことでご対応をお願いします。
・領収書の発行はできません。ただし、銀行振込にてお支払いの場合は、各金融機関発行の振込明細票が正規領収書としてご利用いただけます。
${tailMessage}`;
}

function fromDateToString(date: Date) {
    const yobi = ["日", "月", "火", "水", "木", "金", "土"]
    return `${date.getMonth() + 1}月${date.getDate()}日(${yobi[date.getDay()]}曜日)`;
}

function shippingMessage(deliverDay: Date, deliveryLatestDay: Date | null) {
    const date = fromDateToString(deliverDay);
    const latestDay = deliveryLatestDay ? fromDateToString(deliveryLatestDay) : null;
    const dateText = latestDay ? `${date}～${latestDay}` : date;
    return `商品の発送が完了しましたのでお知らせします。
商品は${dateText}に到着予定です。
伝票番号と配送業者は後ほどお知らせします。
お手数ですが商品が到着しましたら、「受け取り連絡」をお願いいたします。
${tailMessage}`;
}

function absenceDeliverInfoMessage() {
    return `商品を配達しましたがご不在でした。
不在配達票をご確認または配送業者へお問い合わせください。
${tailMessage}
`;
}

function cancelBeforePaymentMessage() {
    return `当方の不手際により他サイトより商品が既に売れており、在庫がありませんでした。申し訳ありません。
ご迷惑おかけしますが、今回のお取引はキャンセルでお願いします。
商品代金は支払わないようにお願いいたします。
当方の不手際でご迷惑おかけし、誠に申し訳ございません。`;
}

function cancelAfterPaymentMessage() {
    return `当方の不手際により他サイトより商品が既に売れており、在庫がありませんでした。申し訳ありません。
ご迷惑おかけしますが、今回のお取引はキャンセルでお願いします。
お支払いいただいた代金は、ヤフオクより返金されます。
当方の不手際でご迷惑おかけし、誠に申し訳ございません。`;
}


function initialImageMessage() {
    const limit = new Date();
    limit.setDate(limit.getDate() + 3);
    const date = fromDateToString(limit);
    return `この度は、ご落札いただき誠にありがとうございます。
短い間ですがお取引終了までよろしくお願いいたします。
${date}までに、お支払いをお願いします。その際は、送料を変更しないようにご注意ください。
また、落札者様には、お手数おかけしますが、以下のことについてご了承ください。
・こちらは相互評価を目的とした商品となりますので、お互い高評価よろしくお願いします。
・画像の送付については、ご遠慮させていただいております。商品画像をスクリーンショット等で保存して、ご利用ください。

${tailMessage}`;
}

function shippingImageMessage() {
    return `お支払いいただきまして、ありがとうございます。
実際に画像を送付することは、ご遠慮させていただいております。商品画像をスクリーンショット等で保存してご利用ください。
「受け取り連絡」と「評価」をしていただきましたら、こちらも評価させていただきます。

${tailMessage}`;
}


function deliverInfoMessage(trackingId: string, company: string) {
    const URLS = {
        "ヤマト運輸": "http://toi.kuronekoyamato.co.jp/cgi-bin/tneko",
        "佐川急便": "https://k2k.sagawa-exp.co.jp/p/sagawa/web/okurijoinput.jsp",
        "日本郵便": "https://trackings.post.japanpost.jp/services/srv/search/input",
        "日本郵便ゆうパケット": "https://trackings.post.japanpost.jp/services/srv/search/input",
        "日本郵便ゆうパック": "https://trackings.post.japanpost.jp/services/srv/search/input",
        "カトーレック": "https://www6.katolec.com/tracking/amzn/tracking.aspx",
        "デリバリープロバイダ": "https://track-a.tmg-group.jp/cts/jsp",
        "TMG便": "https://track-a.tmg-group.jp/cts/jsp",
        "ヤマトホームコンビニエンス": "http://toi.kuronekoyamato.co.jp/cgi-bin/tneko",
        "SGムービング": "https://k2k.sagawa-exp.co.jp/p/sagawa/web/okurijoinput.jsp",
        "プラスカーゴサービス": "https://www.plus-cs.co.jp/trce/THBS0410.do",
        "SBS即配サポート": "https://www.saqura-web.com/sbs_ltrc/"
    }

    const PHONES = {
        "Amazon": "再配達依頼（自動音声受付）: 0120-899-068",
        "ヤマト運輸": "0120-01-9625 (8:00-21:00)",
        "カトーレック": "043-424-3000 (9:00-20:00)",
        "デリバリープロバイダ": "0120-130-661 (9:00-21:00)、050-5525-7445 (自動受付・24時間)",
        "TMG便": "0120-130-661 (9:00-21:00)、050-5525-7445 (自動受付・24時間)",
        "ヤマトホームコンビニエンス": "0120-008-008",
        "SGムービング": "0120-808-011",
        "プラスカーゴサービス": "03-5980-6033",
        "ADP": "0800-123-6420",
        "SBS即配サポート": "03-5633-8955 (9:00-18:00)"
    }

    let msg = "配送情報についてお知らせします。\n";
    msg += `追跡番号:${trackingId}\n`;
    msg += `配送業者:${company}\n`;
    if (URLS[company]) {
        msg += `追跡URL:${URLS[company]}\n`
    }
    if (PHONES[company]) {
        msg += `電話番号:${PHONES[company]}\n`
    };
    msg += tailMessage;
    return msg;
}

function completedDeliverInfoMessage(place: DeliveryPlace, photoUrl: string | null) {
    let msg = "配達が完了いたしましたのでお知らせします。\n";
    if (place == DeliveryPlace.DOORSTEP) {
        msg += "ご注文商品を玄関にお届けしました。\n"
    } else if (place == DeliveryPlace.MAILBOX) {
        msg += "ご注文商品を郵便受けに配達しました。\n"
    }
    if (photoUrl) {
        msg += `配達画像:${photoUrl}\n`;
    }
    msg += tailMessage;
    return msg;
}

export function messageAuction(arb: ArbYahooAmazonSold, session: YahooSession) {
    const trx = Execution.transaction("Integration", getCurrentFilename());
    let messageStatus = arb.messageStatus;

    // send initial message
    if (!messageStatus) {
        messageStatus = MessageStatus.INITIAL;
        trx.then(_ => Execution.transaction("Inner", "SendInitialMessage")
            .then(_ => yahooDriver.sendMessage(arb.aid, initialMessage(), session.cookie))
            .then(_ => DBExecution.integration(rep => rep.setMessageStatus(arb.aid, messageStatus)))
        );
    }

    // inform shipping
    if (arb.order && arb.deal.status == AuctionDealStatus.PAID) {
        trx.then(_ => Execution.transaction("Inner", "InformShipping")
            .then(val => yahooDriver.informShipping(arb.aid, session.cookie))
        );
    }

    // send shipping message
    if (arb.order && messageStatus == MessageStatus.INITIAL) {
        messageStatus = MessageStatus.SHIPPING;
        const deliveryDay = arb.order.deliveryDay;
        const deliveryLatestDay = arb.order.deliveryLatestDay;
        trx.then(_ => Execution.transaction("Inner", "SendShippingMessage")
            .then(_ => yahooDriver.sendMessage(arb.aid, shippingMessage(deliveryDay, deliveryLatestDay), session.cookie))
            .then(_ => DBExecution.integration(rep => rep.setMessageStatus(arb.aid, messageStatus)))
        );
    }

    // send deliver info message
    if (arb.order 
        && arb.order.deliveryTrackingId 
        && arb.order.deliveryCompany
        && messageStatus == MessageStatus.SHIPPING) {
        messageStatus = MessageStatus.DELIVER_INFO;
        const deliveryTrackingId = arb.order.deliveryTrackingId;
        const deliveryCompany = arb.order.deliveryCompany;
        trx.then(_ => Execution.transaction("Inner", "SendDeliverInfoMessage")
            .then(_ => yahooDriver.sendMessage(arb.aid, deliverInfoMessage(deliveryTrackingId, deliveryCompany), session.cookie))
            .then(_ => DBExecution.integration(rep => rep.setMessageStatus(arb.aid, messageStatus)))
        );
    }

    // send absence deliver info message
    if (arb.order 
        && arb.order.status == OrderStatus.ABSENCE
        && messageStatus == MessageStatus.DELIVER_INFO) {
        messageStatus = MessageStatus.ABSENCE_DELIVER_INFO;
        trx.then(_ => Execution.transaction("Inner", "SendAbsenceInfoMessage")
            .then(_ => yahooDriver.sendMessage(arb.aid, absenceDeliverInfoMessage(), session.cookie))
            .then(_ => DBExecution.integration(rep => rep.setMessageStatus(arb.aid, messageStatus)))
        );
    }

    // send completed deliver info message
    if (arb.order 
        && arb.order.deliveryPlace
        && (messageStatus == MessageStatus.DELIVER_INFO || messageStatus == MessageStatus.ABSENCE_DELIVER_INFO)) {
        messageStatus = MessageStatus.COMPLETED_DELIVER_INFO;
        const deliverPlace = arb.order.deliveryPlace;
        const deliverPhotoUrl = arb.order.deliveryPhotoUrl;
        trx.then(_ => Execution.transaction("Inner", "SendDeliverInfoMessage")
            .then(_ => yahooDriver.sendMessage(arb.aid, completedDeliverInfoMessage(deliverPlace, deliverPhotoUrl), session.cookie))
            .then(_ => DBExecution.integration(rep => rep.setMessageStatus(arb.aid, messageStatus)))
        );
    }

    // leave feedback
    if (arb.order && arb.deal.status == AuctionDealStatus.RECEIVED && !arb.leftFeedback) {
        trx.then(_ => Execution.transaction("Inner", "LeaveFeedback")
            .then(_ => yahooDriver.leaveFeedback(session.cookie, arb.aid, arb.deal.buyerId, FeedbackRaring.VeryGood))
            .then(_ => DBExecution.integration(rep => rep.setLeftFeedback(arb.aid)))
        );
    }

    // cancel before payment
    if (arb.canceled && !arb.canceled.messageStatus && (arb.deal.status == AuctionDealStatus.NONE || arb.deal.status == AuctionDealStatus.INFORMED)) {
        const canceled = arb.canceled;
        trx.then(_ => Execution.transaction("Inner", "CancelBeforePayment")
            .then(_ => yahooDriver.sendMessage(arb.aid, cancelBeforePaymentMessage(), session.cookie))
            .then(_ => DBExecution.integration(rep => rep.setCancelMessageStatus(canceled, CancelAuctionMessageStatus.BEFORE_PAYMENT)))
        );
    }

    // cancel after payment
    if (arb.canceled && arb.canceled.messageStatus != CancelAuctionMessageStatus.AFTER_PAYMENT && arb.deal.status == AuctionDealStatus.PAID) {
        const canceled = arb.canceled;
        trx.then(_ => Execution.transaction("Inner", "CancelAfterPayment")
            .then(_ => yahooDriver.sendMessage(arb.aid, cancelAfterPaymentMessage(), session.cookie))
            .then(_ => DBExecution.integration(rep => rep.setCancelMessageStatus(canceled, CancelAuctionMessageStatus.AFTER_PAYMENT))
        ));
    }

    // repay
    if (arb.canceled && arb.deal.status == AuctionDealStatus.PAID && !arb.canceled.repaid) {
        const canceled = arb.canceled;
        trx.then(_ => Execution.transaction("Inner", "Repay")
            .then(_ => yahooDriver.repayEscrow(session.cookie, arb.aid)))
            .then(_ => DBExecution.integration(rep => rep.setRepaid(canceled))
        );
    }

    return trx;
}


export function messageImageAuction(img: YahooImageAuction, deal: YahooAuctionDeal, session: YahooSession) {
    // 1円画像が落札されたらのメッセージ
    
    const trx = Execution.transaction("Integration", getCurrentFilename());

    // send initial message
    if ((deal.status == AuctionDealStatus.NONE || deal.status == AuctionDealStatus.PAID) && img.status == null) {
        img.status = ImageAuctionStatus.INITIAL;
        trx.then(_ => Execution.transaction("Inner", "SendInitialImageMessage")
            .then(_ => yahooDriver.sendMessage(deal.aid, initialImageMessage(), session.cookie))
            .then(_ => DBExecution.integration(rep => rep.setImageAuctionStatus(img.aid, ImageAuctionStatus.INITIAL)))
        );
    }

    // inform shipping
    if (deal.status == AuctionDealStatus.PAID && img.status == ImageAuctionStatus.INITIAL) {
        img.status = ImageAuctionStatus.SHIPPED;
        trx.then(_ => Execution.transaction("Inner", "InformImageShipping & SendShippingImageMessage")
            .then(val => yahooDriver.informShipping(deal.aid, session.cookie))
            .then(val => yahooDriver.sendMessage(deal.aid, shippingImageMessage(), session.cookie))
            .then(_ => DBExecution.integration(rep => rep.setImageAuctionStatus(img.aid, ImageAuctionStatus.SHIPPED)))
        );
    }

    // leave feedback
    if (deal.status == AuctionDealStatus.RECEIVED && img.status == ImageAuctionStatus.SHIPPED) {
        img.status = ImageAuctionStatus.FEEDBACKED;
        trx.then(_ => Execution.transaction("Inner", "ImageLeaveFeedback")
            .then(_ => yahooDriver.leaveFeedback(session.cookie, deal.aid, deal.buyerId, FeedbackRaring.VeryGood))
            .then(_ => DBExecution.integration(rep => rep.setImageAuctionStatus(img.aid, ImageAuctionStatus.FEEDBACKED)))
        );
    }

    return trx;
}