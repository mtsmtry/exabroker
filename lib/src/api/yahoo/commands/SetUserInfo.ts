import { Cookie } from "../../../execution/WebExecution";
import { Prefecture } from "./SubmitAuction";
import { createWebTransaction, getFormHiddenInputData } from "./Utilts";

export interface PostYahooUserInfo {
    select: "non_premium" | "premium";

    // 苗字: 山田
    last_name: string;
    // 名前: 太郎
    first_name: string;

    // 郵便番号: 7918011
    zip: string

    // 県: 38 (愛媛県)
    state: Prefecture;

    // 市: 松山市
    city: string

    // 住所: 中央1-1-1
    address1: string

    // ビル、マンション名: オーブ
    address2: string

    // 電話番号: 0899235652
    phone: string
}

export const setUserInfo = createWebTransaction<{
    session: Cookie,
    userInfo: PostYahooUserInfo
}>()
    .setCookie(val => val.session)
    .thenGet("GetFormData",
        val => ({
            url: "https://contact.auctions.yahoo.co.jp/setting/user/initialedit",
            params: { select: "non_premium" }
        }),
        (doc, val) => ({
            form: getFormHiddenInputData(doc, "//form[@method='POST']"),
            info: val.userInfo
        }))
    .thenPost("Submit",
        val => ({
            url: "https://contact.auctions.yahoo.co.jp/setting/user/initialsubmit",
            // params: { select: "non_premium" },
            form: { ...val.form, ...val.info }
        }),
        doc => ({
            main: doc.get("//div[@id='yjMain']")
        }))
    .resolve(val => ({
        valid: val.main?.text.includes("出品者情報の登録が完了しました"),
        result: null
    }));
/*
    async setUserInfo(info: PostYahooUserInfo) {   
        console.log(`  driver:setUserInfo ${info}`);     

        // Get form data, note: select=non_premium is necessary
        let doc = await this.client.get("https://contact.auctions.yahoo.co.jp/setting/user/initialedit?select=non_premium");
        const form = this.getFormHiddenInputData(doc, "//form[@method='POST']");
        
        // Submit
        const data = { ...form, ...info };
        doc = await this.client.post("https://contact.auctions.yahoo.co.jp/setting/user/initialsubmit?select=non_premium", data);

        // Check
        const main = doc.get("//div[@id='yjMain']");
        if (!main || !main.text.includes("出品者情報の登録が完了しました")) {
            throw new DriverException(DriverExceptionType.OnCheck, doc);
        }
    }*/