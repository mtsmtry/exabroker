import { Execution } from "../../../../system/execution/Execution";
import { getCurrentFilename } from "../../../../Utils";
import * as yahooDriver from "../YahooDriver";
import { YahooSession } from "./GetSession";

export function payout(session: YahooSession) {
    return Execution.transaction("Yahoo", getCurrentFilename())
        .then(val => yahooDriver.relogin("https://receive.wallet.yahoo.co.jp/list", session.account.password, session.cookie))
        .then(cookie => Execution.transaction()
            .then(val => yahooDriver.getWalletInfo(cookie))
            .then(val => {
                if (val.balance == 0) {
                    return Execution.cancel();
                } else if (val.registeredBank) {
                    return Execution.transaction()
                        .then(val => yahooDriver.deleteBank(cookie))
                        .then(val => yahooDriver.changeBank(cookie))
                        .then(val => yahooDriver.payout(cookie))
                        .then(val => yahooDriver.deleteBank(cookie));
                } else {
                    return Execution.transaction()
                        .then(val => yahooDriver.changeBank(cookie))
                        .then(val => yahooDriver.payout(cookie))
                        .then(val => yahooDriver.deleteBank(cookie));
                }
            })
        );
}