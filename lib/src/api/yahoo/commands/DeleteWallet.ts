import { Cookie } from "../../../execution/WebExecution";
import { createWebTransaction, getFormHiddenInputData } from "./Utilts";

export const deleteWallet = createWebTransaction<{
    session: Cookie
}>()
    .setCookie(val => val.session)
    .thenGet("GetCrumb",
        val => ({
            url: "https://edit.wallet.yahoo.co.jp/config/wallet_delete"
        }),
        doc => ({
            form: getFormHiddenInputData(doc, "//form[@name='theform']")
        }))
    .thenPost("Delete",
        val => ({
            url: "https://edit.wallet.yahoo.co.jp/config/wallet_delete",
            form: { ...val.form, edit: "はい" }
        }),
        doc => ({
            msg: doc.get("//div[@id='msg']")
        }))
    .resolve(val => ({
        valid: val.msg?.text.includes("削除が完了しました"),
        result: null
    }));

    /*
    async deleteWallet() {
        console.log(`  driver:deleteWallet`); 

        // Get crumb
        let doc = await this.client.get("https://edit.wallet.yahoo.co.jp/config/wallet_delete");
        const form = this.getFormHiddenInputData(doc, "//form[@name='theform']");

        // Delete
        const data = { ...form, edit: "はい" }
        doc = await this.client.post("https://edit.wallet.yahoo.co.jp/config/wallet_delete", data);

        // Check
        const msg = doc.get("//div[@id='msg']")?.text;
        if (!msg || !msg.includes("削除が完了しました")) {
            throw new DriverException(DriverExceptionType.OnCheck, doc);
        }
    }*/