import { Endpoint } from "aws-sdk";
import { Cookie } from "../../../../system/execution/WebExecution";
import { getCurrentFilename, toTimestamp } from "../../../../Utils";
import * as yahooDriver from "../YahooDriver";
import { Execution } from "../../../../system/execution/Execution";
import { YahooSession } from "./GetSession";
import { DBExecution } from "../../../../system/execution/DatabaseExecution";
import { AuctionImage } from "../../../../entities/website/YahooAuctionExhibit";

export interface AuctionExhibit {
    images: Buffer[] | AuctionImage[],
    title: string;
    price: number;
    description: string;
    days: number;
    closingHours: number;
    shipSchedule: yahooDriver.ShipSchedule;
    shipName: string;
    prefecture: yahooDriver.Prefecture;
}

export function exhibitAuction(session: YahooSession, auction: AuctionExhibit) {
    return Execution.transaction("Yahoo", getCurrentFilename())
        .then(val => {
            return Execution.batch()
                .and(() => {
                    return yahooDriver.getCategory(session.cookie, auction.title).map(x => ({ category: x[0].id }));
                })
                .and(() => {
                    if (auction.images.length > 0) {
                        if (auction.images[0] instanceof Buffer) {
                            return yahooDriver.uploadImages(session.cookie, auction.images as Buffer[]);
                        } else {
                            return Execution.resolve({ images: auction.images as AuctionImage[] }); 
                        }
                    } else {
                        return Execution.resolve({ images: [] });
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
                    .map(x => ({ ...x, category: val.category, images: val.images }));
            })
        .then(val => DBExecution.yahoo(rep => {
            return rep.createAuctionExhibit({ 
                aid: val.aid,
                username: session.account.username,
                title: auction.title,
                price: auction.price,
                endDate: val.endDate,
                category: val.category,
                images: val.images
            });
        }).map(_ => val.aid));
}