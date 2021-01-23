import { Execution } from "../../../../system/execution/Execution";
import { WebExecution } from "../../../../system/execution/WebExecution";
import { getCurrentFilename } from "../../../../Utils";
import * as yahooDriver from "../YahooDriver";
import { DBExecution } from "../../../../system/execution/DatabaseExecution";
import { BidStatus, YahooAuctionBid } from "../../../../entities/YahooAuctionBid";
import { YahooSession } from "./GetSession";

export function buyAuction(session: YahooSession, aid: string, price: number) {
    return Execution.transaction(arguments, "Yahoo", getCurrentFilename())
        .then(val => DBExecution.yahoo(rep => rep.getAuctionBid(aid)))
        .then(val => {
            if (!val) {
                return Execution.transaction(val)
                    .then(val => yahooDriver.getAuction(aid))
                    .then(val => DBExecution.yahoo(rep => rep.createAuctionBid({ username: session.account.username, price, ...val })))
            } else {
                return Execution.resolve(val);
            }
        })
        .then(val => {
            let result = Execution.transaction<YahooAuctionBid, unknown>(val);
            switch(val.status) {
                case BidStatus.Pending:
                    result = result
                        .then(_ => yahooDriver.bidAution(session.cookie, aid, price))
                        .then(_ => DBExecution.yahoo(rep => rep.updateAuctionBidStatis(aid, BidStatus.Accepted)));
                case BidStatus.Accepted:
                    result = result
                        .then(_ => yahooDriver.startContact(session.cookie, aid, val.sellerId, session.account.username))
                        .then(_ => DBExecution.yahoo(rep => rep.updateAuctionBidStatis(aid, BidStatus.Started)));
                case BidStatus.Started:
                    result = result
                        .then(_ => yahooDriver.payAuction(session.cookie, aid, 33, 0))
                        .then(_ => DBExecution.yahoo(rep => rep.updateAuctionBidStatis(aid, BidStatus.Paid)));
            }
            return result;
        });
}