import { Endpoint } from "aws-sdk";
import { DBYahooExecution } from "../../../execution/DatabaseExecution";
import { BatchExecution, TransactionExecution, translateExecution } from "../../../execution/Execution";
import { Cookie } from "../../../execution/WebExecution";
import { toTimestamp } from "../../../Utils";
import { createTransaction } from "./Utils";
import { YahooSession } from "./YahooSession";
import * as yahooDriver from "../YahooDriver";

export interface AuctionExhibit {
    images: Buffer[],
    title: string;
    price: number;
    description: string;
    days: number;
    closingHours: number;
    shipSchedule: yahooDriver.ShipSchedule;
    shipName: string;
    prefecture: yahooDriver.Prefecture;
}

export const exhibitAuction = createTransaction<{
    session: YahooSession,
    auction: AuctionExhibit,
    isPremium: boolean
}>()
    .thenTranslate(
        new BatchExecution<{ session: Cookie, auction: AuctionExhibit }>("Inner", "Preprocess")
        .and(yahooDriver.getCategory,
            val => ({ session: val.session, keyword: val.auction.title }),
            res => ({ category: res[0].id }))
        .and(yahooDriver.uploadImages,
            val => ({ session: val.session, buffers: val.auction.images }),
            res => ({ images: res.images })),
        val => ({ session: val.session.cookie, auction: val.auction }),
        (res, val) => ({ ...res, ...val }))
    .thenTranslate(yahooDriver.submitAuction,
        val => {
            const closingDate = new Date();
            closingDate.setDate(closingDate.getDate() + val.auction.days);
    
            const auction: yahooDriver.AuctionSubmission = {
                salesmode: "buynow",
                Quantity: 1,
                StartPrice: val.auction.price,
                BidOrBuyPrice: val.auction.price,
                istatus: "new",
                istatus_comment: "",
                dskPayment: "ypmOK",  
                Title: val.auction.title,
                submit_description: "text",
                Description: val.auction.description,
                Description_rte: "",
                Description_plain: "",
                ClosingYMD: `${closingDate.getFullYear()}-${closingDate.getMonth() + 1}-${closingDate.getDate()}`,
                ClosingTime: val.auction.closingHours,
                submitUnixtime: toTimestamp(new Date()),
                Duration: val.auction.days,
                shiptime: "payment",
                shippinginput: "now",
                is_other_ship: "yes",
                shipname1: val.auction.shipName,
                shipschedule: val.auction.shipSchedule,
                loc_cd: val.auction.prefecture, 
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
                nonpremium: val.isPremium ? 1 : 0, 
                category: val.category
            };
            return {
                session: {},
                auction,
                images: val.images
            };
        },
        (res, val) => ({ ...res, ...val }))
    .then(new DBYahooExecution(
        (rep, val) => {
            return rep.createAuctionExhibit({ 
                aid: val.aid,
                username: val.session.account.username,
                title: val.auction.title,
                price: val.auction.price,
                endDate: val.endDate,
                category: val.category
            });
        }));