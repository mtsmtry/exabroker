import { BrowserExecution } from "../../../execution/BrowserExecution";
import { Cookie } from "../../../execution/WebExecution";
import { relogin } from "./Login";
import { createWebTransaction, getFormHiddenInputData } from "./Utilts";

export interface WalletSingup {
    pay_type: "CC";
    conttype: "regpay";
    acttype: "regist";
    namel: string;
    namef: string;
    kanal: string;
    kanaf: string;
    zip: string;
    pref: string;
    city: string;
    addr1: string;
    addr2: string;
    ph: string;
    credit_bank_check: "on";
    ccnum: string;
    ccexpMo: number;
    ccexpYr: number;
    cvv: number;
}

export const signupWallet = createWebTransaction<{
    cookie: Cookie,
    wallet: WalletSingup
    password: string
}>()
    .thenExecution(relogin,
        val => ({
            url: "https://edit.wallet.yahoo.co.jp/config/wallet_signup",
            password: val.password,
            cookie: val.cookie
        }),
        res => ({
            cookie: res
        }))
    .setCookie(val => val.cookie)
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
            form: val.form
        }),
        doc => ({
            msg: doc.get("//div[@id='msg']")?.text
        }))
    .resolve(val => ({
        valid: val.msg?.includes("登録が完了しました"),
        result: null
    }));




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
