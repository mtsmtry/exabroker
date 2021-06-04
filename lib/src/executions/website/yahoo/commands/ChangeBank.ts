import { browserExecution } from "../../../../system/execution/BrowserExecution";
import { Cookie, WebExecution } from "../../../../system/execution/WebExecution";
import { getCurrentFilename } from "../../../../Utils";
import { getFormHiddenInputData } from "../../Utilts";
import { relogin } from "./Login";

export function changeBank(cookie: Cookie) {
    return WebExecution.webTransaction({}, "YahooDriver", getCurrentFilename())
        /*.thenExecution(_ => {
            return relogin("https://edit.wallet.yahoo.co.jp/config/wallet_recv_account_control", password, cookie)
        })*/
        .setCookie(val => cookie)
        .thenGet("GetForm,",
            val => ({
                url: "https://edit.wallet.yahoo.co.jp/config/wallet_recv_account_control"
            }),
            doc => ({
                form: getFormHiddenInputData(doc, "//*[@name='theform']")
            }))
        .thenPost("ChangeBank",
            val => ({
                url: "https://edit.wallet.yahoo.co.jp/config/wallet_recv_account_control",
                form: {
                    ...val.form,
                    img_num: 1,
                    pay_type_rec: "BK",
                    bankCode: "0033",
                    bkname_rec: "ジャパンネット銀行",
                    storeCode: "003",
                    bksubname_rec: "はやぶさ支店",
                    conttype: "bnkacmgr",
                    bank: "on",
                    bknum_rec: "7157158",
                    bkkanal_rec: "マツモト",
                    bkkanaf_rec: "リョウイ",
                    yusubname_rec: "",
                    yunum_rec: "",
                    yukanal_rec: "",
                    yukanaf_rec: "",
                    edit: "同意して登録"
                }
            }),
            doc => ({
                msg: doc.getById("msg")
            }))
        .resolve(val => ({
            valid: val.msg.text.includes("登録情報を変更しました"),
            result: null
        }))
}