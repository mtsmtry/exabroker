import { Cookie } from "../../../execution/WebExecution";
import { Document } from "../../../web/WebClient";
import { createWebTransaction, getFormHiddenInputData, getFormInputAndSelectData } from "./Utilts";

function loadDoc(doc: Document, begin: RegExp) {
    return new Document(new TextDecoder("euc-jp")
        .decode(doc.buffer)
        .replace(/<!--[\s\S\r\n]*?-->/g, "")
        .match(begin.source + /[\s\S\r\n]+<\/form>/g.source)?.[0] || "");
}

export const payAuction = createWebTransaction<{
    session: Cookie,
    aid: string,
    cvv: number,
    transPrice: number
}>()
    .setCookie(val => val.session)
    .thenGet("GetUrl",
        val => ({
            url: `https://auctions.yahoo.co.jp/jp/config/jpypay?aID=${val.aid}`
        }),
        (doc, val) => ({
            url: doc.getNeeded("//input[@name='.done']").attrNeeded("value"),
            arg: val
        }))
    .thenGet("GetFormData",
        val => ({
            url: val.url,
            useBinary: true
        }),
        (doc, val) => {
            const encodedDoc = loadDoc(doc, /<form method="POST"/g);
            return {
                form: getFormInputAndSelectData(encodedDoc, "."),
                arg: val.arg
            };
        })
    .thenPost("Preview",
        val => ({
            url: "https://auc.payment.yahoo.co.jp/Payment",
            form: { 
                ...val.form, 
                scode: val.arg.cvv,
                transprice: val.arg.transPrice, 
                paytype: "card", // Necessary!!
                selectCard: "wcc1"  // Necessary!!
            },
            useBinary: true
        }),
        doc => {
            const encodedDoc = loadDoc(doc, /<form name="nextHandler"/g);
            return {
                form: getFormHiddenInputData(encodedDoc, ".")
            };
        })
    .thenPost("Submit", 
        val => ({
            url: "https://auc.payment.yahoo.co.jp/Payment",
            form: { ...val.form, _entry: "PaymFinish", paytype: "card" },
            useBinary: true
        }),
        doc => null)
    .resolve(_ => ({
        valid: true,
        result: null
    }))
/*
    async payAuction(aid: string, cvv: number, transPrice: number) {
        console.log(`  driver:payAuction ${aid}`); 


        // Get url
        let doc = await this.client.get(`https://auctions.yahoo.co.jp/jp/config/jpypay?aID=${aid}`);
        const url = doc.getNeeded("//input[@name='.done']").attrNeeded("value");

        // Get form data
        doc = await this.client.get(url, {}, "binary");
        doc = loadDoc(doc, /<form method="POST"/g);
        let form = this.getFormInputAndSelectData(doc, ".");

        // Preview
        let data: object = { ...form, 
            scode: cvv,
            transprice: transPrice, 
            paytype: "card", // Necessary!!
            selectCard: "wcc1"  // Necessary!!
        };
        doc = await this.client.post("https://auc.payment.yahoo.co.jp/Payment", data, "binary");
        doc = loadDoc(doc, /<form name="nextHandler"/g);
        form = this.getFormHiddenInputData(doc, ".");

        // Submit
        data = { ...form, _entry: "PaymFinish", paytype: "card" }
        doc = await this.client.post("https://auc.payment.yahoo.co.jp/Payment", data, "binary");     
    }*/