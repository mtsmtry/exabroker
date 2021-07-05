import { BrowserExecution } from "../../../../system/execution/BrowserExecution";
import { Cookie, WebExecution } from "../../../../system/execution/WebExecution";
import { getCurrentFilename } from "../../../../Utils";
import { relogin } from "./Login";
import { getFormHiddenInputData } from "../../Utilts";
import { Execution } from "../../../../system/execution/Execution";

/*
.crumb: ArPS4WAAITfQLMX_LgZnfIjuV4UzLnGIHaGatww667rU0gzpG1VxiWEqLmR17VnnZO5NqUPoiUxza9ijWNoMxF_H9_1BN01ldozqVjtzRS-5VzbOCc6SfTNRLYGo_L3o8xVTIvcI
.done: 
.bail: 
.src: wallet
.from: 
.form_type: 
form: 
img_num: 0
payType: CC
bkCode: 
bkName: 
bkSubCode: 
bkSubName: 
temporaryToken: t_P25taFjZm7PSZy6BjDoFyg
conttype: regpay
acttype: regist
lastNameKanji: 松本
firstNameKanji: 龍意
lastNameKana: マツモト
firstNameKana: リョウイ
zipCode: 7918011
prefecture: 愛媛県
city: 松山市
address1: 吉藤
address2: vivant
phoneNumber: 
credit_bank_check: on
ccNum: 4297 6901 3255 7382
ccexpMo: 03
ccexpYr: 2025
cvv: 785
bkAccountNum: 
oneTimePassword: 
tcard: chk_no_tcard


.bail: 
.crumb: ArPS4WAAITfQLMX_LgZnfIjuV4UzLnGIHaGatww667rU0gzpG1VxiWEqLmR17VnnZO5NqUPoiUxza9ijWNoMxF_H9_1BN01ldozqVjtzRS-5VzbOCc6SfTNRLYGo_L3o8xVTIvcI
.done: 
.form_type: 
.from: 
.src: wallet
acttype: regist
address1: 吉藤
address2: vivant
bkAccountNum: 
bkCode: 
bkName: 
bkSubCode: 
bkSubName: 
ccNum: 4297 6901 3255 7382
ccexpMo: 03
ccexpYr: 2025
city: 松山市
conttype: regpay
credit_bank_check: on
cvv: 785
firstNameKana: リョウイ
firstNameKanji: 龍意
form: 
img_num: 0
lastNameKana: マツモト
lastNameKanji: 松本
oneTimePassword: 
payType: CC
phoneNumber: 
prefecture: 愛媛県
tcard: chk_no_tcard
temporaryToken: t_P25taFjZm7PSZy6BjDoFyg
zipCode: 7918011

*/

/*
.bail:
.crumb:AvXX4WAAtT-5a93_VTIlDNWymRHYIND8CE2PRU-7pstLUZivMqwlh2_MN6IQ6A96KK_H_xg0l_I432Xg5XVFjJsqxfd-vwTEHHiLzSc_6hXXlN4n11s_nAmEcVI6xI6x_nJx7Wmp
.done:
.form_type:
.from:
.src:wallet
acttype:regist
address1:湘南台
address2:2-7-20 vivant 702
bkCode:
bkName:
bkSubCode:
bkSubName:
ccNum:4297 6901 3255 7382
ccexpMo:03
ccexpYr:2025
city:藤沢市
conttype:regpay
credit_bank_check:on
cvv:785
edit:登録
firstNameKana:リョウイ
firstNameKanji:龍意
form:
img_num:0
lastNameKana:マツモト
lastNameKanji:松本
payType:CC
phoneNumber:08093414838
prefecture:神奈川県
saveBankCode:
saveBankName:
saveStoreCode:
saveStoreName:
temporaryToken:
zipCode:2520804



*/


export interface WalletSingup {
    payType: "CC";
    conttype: "regpay";
    acttype: "regist";
    lastNameKanji: string;
    firstNameKanji: string;
    lastNameKana: string;
    firstNameKana: string;
    zipCode: string;
    prefecture: string;
    city: string;
    address1: string;
    address2: string;
    phoneNumber: string;
    credit_bank_check: "on";
    ccNum: string;
    ccexpMo: string;
    ccexpYr: string;
    cvv: string;
}

export function signupWallet(cookie: Cookie, wallet: WalletSingup, password: string | null) {
    return WebExecution.webTransaction(arguments, "YahooDriver", getCurrentFilename())
        .thenExecution(val => {
            if (password) {
                return relogin("https://edit.wallet.yahoo.co.jp/config/wallet_signup", password, cookie);
            } else {
                return Execution.resolve(cookie)
            }
        })
        .setCookie(val => val)
        .thenGet("GetCrumb",
            val => ({
                url: "https://edit.wallet.yahoo.co.jp/config/wallet_signup"
            }),
            doc => ({
                form: getFormHiddenInputData(doc, "//form[@name='theform']")
            }))
        .thenPost("Signup",
            val => ({
                url: "https://edit.wallet.yahoo.co.jp/config/wallet_signup",
                form: { 
                    ...val.form,
                    ...wallet,
                    edit: "登録" // Necessary!!
                }
            }),
            doc => ({
                msg: doc.get("//div[@id='msg']")?.text
            }))
        .resolve(val => ({
            valid: val.msg?.includes("登録が完了しました"),
            result: undefined
        }));
}



/*
const getWalletSignupFormData 
    async getWalletSignupFormData(password: string): Promise<object | null> {
        console.log(`  driver:getWalletSignupFormData`); 

        // Get crumb
        await this.relogin("https://edit.wallet.yahoo.co.jp/config/wallet_signup", password);
        let doc = await this.client.get("https://edit.wallet.yahoo.co.jp/config/wallet_signup");
        
        // Check
        if (doc.get("//div[@id='yjMain']")?.text.includes("すでに登録済みです")) {
            return null;
        }
        const form = this.getFormHiddenInputData(doc, "//form[@name='theform']");
        return form;
    }

    async signupWallet(wallet: WalletSingup, formData: object) {
        console.log(`  driver:signupWallet`); 

        // Signup
        const data = { 
            ...formData, 
            ...wallet,
            edit: "登録" // Necessary!!
        };
        const doc = await this.client.post("https://edit.wallet.yahoo.co.jp/config/wallet_signup", data);

        // Check
        const msg = doc.get("//div[@id='msg']")?.text;
        if (!msg || !msg.includes("登録が完了しました")) {
            throw new DriverException(DriverExceptionType.OnCheck, doc);
        }
    }*/
