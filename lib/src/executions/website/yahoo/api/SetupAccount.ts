import { Execution } from "../../../../system/execution/Execution";
import * as yahooDriver from "../YahooDriver";
import { getCurrentFilename } from "../../../../Utils";
import { YahooSession } from "./GetSession";
import { DBExecution } from "../../../../system/execution/DatabaseExecution";
import { updatePasswordAuth } from "../commands/UpdatePasswordAuth";

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
                    zip_code: setting.userInfo.zip,
                    prefecture_name: yahooDriver.Prefecture[setting.userInfo.prefecture],
                    city: setting.userInfo.city,
                    address1: setting.userInfo.address1,
                    address2: setting.userInfo.address2,
                    phone_number: setting.userInfo.phone
                };
                return yahooDriver.setUserInfo(session.cookie, userInfo);
            })
            .and(val =>
                Execution.transaction()
                .then(val => {
                    return yahooDriver.getIsWalletSignedUp(session.cookie);
                })
                .then(val => {
                    return Execution.cancel();
                    if (val) {
                        return Execution.transaction()
                            .then(val => updatePasswordAuth(session.cookie, session.account.password, 1))
                            .then(val => {
                                const wallet: yahooDriver.WalletSingup = {
                                    payType: "CC",
                                    conttype: "regpay",
                                    acttype: "regist",
                                    lastNameKanji: setting.wallet.nameSei,
                                    firstNameKanji: setting.wallet.nameMei,
                                    lastNameKana: setting.wallet.nameSeiKana,
                                    firstNameKana: setting.wallet.nameMeiKana,
                                    zipCode: setting.wallet.zip,
                                    prefecture: setting.wallet.prefecture,
                                    city: setting.wallet.city,
                                    address1: setting.wallet.address1,
                                    address2: setting.wallet.address2,
                                    phoneNumber: setting.wallet.phone,
                                    credit_bank_check: "on",
                                    ccNum: setting.wallet.ccNumber,
                                    ccexpMo: setting.wallet.ccExpMonth,
                                    ccexpYr: setting.wallet.ccExpYear,
                                    cvv: setting.wallet.ccCVV
                                }
                                return yahooDriver.signupWallet(val, wallet, null).map(_ => ({ cookie: val }));
                            })
                            .then(val => updatePasswordAuth(val.cookie, null, 0));
                    } else {
                        return Execution.cancel();
                    }      
                })
            ));
}