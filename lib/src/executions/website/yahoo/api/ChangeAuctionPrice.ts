import { Execution } from "../../../../system/execution/Execution";
import { getCurrentFilename } from "../../../../Utils";
import { YahooSession } from "./GetSession";
import * as yahooDriver from "../YahooDriver";
import { DBExecution } from "../../../../system/execution/DatabaseExecution";

export function changeAuctionPrice(session: YahooSession, aid: string, price: number) {
    return Execution.transaction("Auction", getCurrentFilename())
        .then(val => yahooDriver.changeAuctionPrice(session.cookie, aid, price))
        .then(val => DBExecution.yahoo(rep => rep.setAuctionPrice(aid, price)));
}