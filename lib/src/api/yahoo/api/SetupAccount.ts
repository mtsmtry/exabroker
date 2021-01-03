import { YahooSession } from "./YahooSession";
import { DBYahooExecution } from "../../../execution/DatabaseExecution";
import { createTransaction } from "./Utils";
import { BatchExecution, TransactionExecution, when } from "../../../execution/Execution";
import * as yahooDriver from "../YahooDriver";
import { YahooAccountSetting } from "../../../entities/YahooAccountSetting";

export const setupAccount = createTransaction<{
    session: YahooSession,
    setting: YahooAccountSetting
}>()
    .thenTranslate(
        new BatchExecution<{
            session: YahooSession,
            setting: YahooAccountSetting
        }>("Inner", "Setup")
        .and(yahooDriver.setUserInfo, val => ({
                session: val.session.cookie,
                userInfo: {
                    select: val.session.account.isPremium ? "premium" : "non_premium" as "non_premium" | "premium",
                    last_name: val.setting.nameSei,
                    first_name: val.setting.nameMei,
                    zip: val.setting.zip,
                    state: yahooDriver.Prefecture[val.setting.prefecture],
                    city: val.setting.city,
                    address1: val.setting.address1,
                    address2: val.setting.address2,
                    phone: val.setting.phone
                }
            }), _ => ({}))
        .and(new TransactionExecution<{
                session: YahooSession,
                setting: YahooAccountSetting
            }, {
                session: YahooSession,
                setting: YahooAccountSetting
            }>("Inner", "Wallet")
                .thenTranslate(yahooDriver.getIsWalletSignedUp, 
                    val => ({
                        session: val.session.cookie
                    }),
                    (res, val) => ({ 
                        ...val, 
                        signedUp: res 
                }))
                .then(when(yahooDriver.signupWallet, val => val.signedUp, res => undefined))
            , x => x, _ => ({}))
    , x => x
    , (_, val) => val
    )
    .then(new DBYahooExecution((rep, val) => {
        return rep.setAccountDesiredSetting(val.session.account.username, val.setting.id);
    }));