import * as yahooDriver from "../YahooDriver";
import { Execution } from "../../../../system/execution/Execution";
import { getCurrentFilename } from "../../../../Utils";
import { YahooSession } from "./GetSession";
import { DBExecution } from "../../../../system/execution/DatabaseExecution";

export function cancelAuction(session: YahooSession, aid: string) {
    return Execution.transaction(arguments, "Yahoo", getCurrentFilename())
        .then(val => {
            return yahooDriver.cancelAuction(session.cookie, aid);
        })
        .then(val => {
            return DBExecution.yahoo(rep => rep.deleteAuctionExhibit(aid))
        });
}