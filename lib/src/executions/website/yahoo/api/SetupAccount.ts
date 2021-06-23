import { Execution } from "../../../../system/execution/Execution";
import * as yahooDriver from "../YahooDriver";
import { YahooAccountSetting } from "../../../../entities/website/YahooAccountSetting";
import { getCurrentFilename } from "../../../../Utils";
import { YahooSession } from "./GetSession";
import { DBExecution } from "../../../../system/execution/DatabaseExecution";

export interface AccountSettingInfo {
    userInfo: {
        nameSei: string;
        nameMei: string;
        prefecture: string;
        address1: string;
        address2: string;
        phone: string;
        zip: string;
        city: string;
    }
    wallet: {
        nameSei: string;
        nameMei: string;
        nameSeiKana: string;
        nameMeiKana: string;
        phone: string;
        zip: string;
        prefecture: string;
        city: string;
        address1: string;
        address2: string;
        ccNumber: string;
        ccExpMonth: string;
        ccExpYear: string;
        ccCVV: string;
    }
}

export function setupAccount(session: YahooSession, setting: AccountSettingInfo, password: string) {
    return Execution.transaction("Yahoo", getCurrentFilename())
        .then(val =>
            Execution.batch()
            .and(val => {
                const userInfo: yahooDriver.PostYahooUserInfo = {
                    select: session.account.isPremium ? "premium" : "non_premium" as "non_premium" | "premium",
                    last_name: setting.userInfo.nameSei,
                    first_name: setting.userInfo.nameMei,
                    zip: setting.userInfo.zip,
                    state: yahooDriver.Prefecture[setting.userInfo.prefecture],
                    city: setting.userInfo.city,
                    address1: setting.userInfo.address1,
                    address2: setting.userInfo.address2,
                    phone: setting.userInfo.phone
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
                            namel: setting.wallet.nameSei,
                            namef: setting.wallet.nameMei,
                            kanal: setting.wallet.nameSeiKana,
                            kanaf: setting.wallet.nameMeiKana,
                            zip: setting.wallet.zip,
                            pref: setting.wallet.prefecture,
                            city: setting.wallet.city,
                            addr1: setting.wallet.address1,
                            addr2: setting.wallet.address2,
                            ph: setting.wallet.phone,
                            credit_bank_check: "on",
                            ccnum: setting.wallet.ccNumber,
                            ccexpMo: setting.wallet.ccExpMonth,
                            ccexpYr: setting.wallet.ccExpYear,
                            cvv: setting.wallet.ccCVV
                        }
                        return yahooDriver.signupWallet(session.cookie, wallet, password);
                    } else {
                        return Execution.cancel();
                    }      
                })
            ));
}