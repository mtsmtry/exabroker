import { Execution } from "../../../../system/execution/Execution";
import * as yahooDriver from "../YahooDriver";
import { getCurrentFilename } from "../../../../Utils";
import { YahooSession } from "./GetSession";
import { DBExecution } from "../../../../system/execution/DatabaseExecution";
import { AccountSettingInfo } from "../../../../repositories/YahooRepository";

export function setupAccount(session: YahooSession, setting: AccountSettingInfo, password: string) {
    return Execution.transaction("Yahoo", getCurrentFilename())
        .then(val =>
            Execution.batch()
            .and(val => {
                const userInfo: yahooDriver.PostYahooUserInfo = {
                    select: session.account.isPremium ? "premium" : "non_premium" as "non_premium" | "premium",
                    last_name: setting.nameSei,
                    first_name: setting.nameMei,
                    zip: setting.zip,
                    state: yahooDriver.Prefecture[setting.prefecture],
                    city: setting.city,
                    address1: setting.address1,
                    address2: setting.address2,
                    phone: setting.phone
                };
                return yahooDriver.setUserInfo(session.cookie, userInfo);
            })
            .and(val =>
                Execution.transaction()
                .then(val => {
                    return yahooDriver.getIsWalletSignedUp(session.cookie);
                })
                .then(val => {
                    if (val) {
                        const wallet: yahooDriver.WalletSingup = {
                            pay_type: "CC",
                            conttype: "regpay",
                            acttype: "regist",
                            namel: setting.nameSei,
                            namef: setting.nameMei,
                            kanal: setting.nameSeiKana,
                            kanaf: setting.nameMeiKana,
                            zip: setting.zip,
                            pref: setting.prefecture,
                            city: setting.city,
                            addr1: setting.address1,
                            addr2: setting.address2,
                            ph: setting.phone,
                            credit_bank_check: "on",
                            ccnum: setting.ccNumber,
                            ccexpMo: setting.ccExpMonth,
                            ccexpYr: setting.ccExpYear,
                            cvv: setting.ccCVV
                        }
                        return yahooDriver.signupWallet(session.cookie, wallet, password);
                    } else {
                        return Execution.cancel();
                    }      
                })
            ));
}