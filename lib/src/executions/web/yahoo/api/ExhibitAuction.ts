import { Endpoint } from "aws-sdk";
import { Cookie } from "../../../../system/execution/WebExecution";
import { getCurrentFilename, toTimestamp } from "../../../../Utils";
import * as yahooDriver from "../YahooDriver";
import { Execution } from "../../../../system/execution/Execution";
import { YahooSession } from "./GetSession";
import { DBExecution } from "../../../../system/execution/DatabaseExecution";

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

export function exhibitAuction(session: YahooSession, auction: AuctionExhibit, asin: string | null) {
    return Execution.transaction(arguments, "Yahoo", getCurrentFilename())
        .then(val => {
            return Execution.batch(val)
                .and(val => {
                    return yahooDriver.getCategory(session.cookie, auction.title).map(x => ({ category: x[0].id }));
                })
                .and(val => {
                    if (auction.images.length > 0) {
                        return yahooDriver.uploadImages(session.cookie, auction.images);
                    } else {
                        return Execution.resolve({
                            total_results_available: 0,
                            total_results_returned: 0,
                            first_result_position: 0,
                            images: []
                        });
                    }
                })
        })
        .then(val => {
                const closingDate = new Date();
                closingDate.setDate(closingDate.getDate() + auction.days);
        
                const submission: yahooDriver.AuctionSubmission = {
                    salesmode: "buynow",
                    Quantity: 1,
                    StartPrice: auction.price,
                    BidOrBuyPrice: auction.price,
                    istatus: "new",
                    istatus_comment: "",
                    dskPayment: "ypmOK",  
                    Title: auction.title,
                    submit_description: "text",
                    Description: auction.description,
                    Description_rte: "",
                    Description_plain: "",
                    ClosingYMD: `${closingDate.getFullYear()}-${closingDate.getMonth() + 1}-${closingDate.getDate()}`,
                    ClosingTime: auction.closingHours,
                    submitUnixtime: toTimestamp(new Date()),
                    Duration: auction.days,
                    shiptime: "payment",
                    shippinginput: "now",
                    is_other_ship: "yes",
                    shipname1: auction.shipName,
                    shipschedule: auction.shipSchedule,
                    loc_cd: auction.prefecture, 
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
                    nonpremium: session.account.isPremium ? 1 : 0, 
                    category: val.category
                };
                return yahooDriver
                    .submitAuction(session.cookie, submission, val.images)
                    .map(x => ({ ...x, category: val.category }));
            })
        .then(val => DBExecution.yahoo(rep => {
            return rep.createAuctionExhibit({ 
                aid: val.aid,
                username: session.account.username,
                title: auction.title,
                price: auction.price,
                endDate: val.endDate,
                category: val.category,
                asin: asin
            });
        }));
}