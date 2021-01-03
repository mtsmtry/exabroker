import { Cookie } from "../../../execution/WebExecution";
import { createWebTransaction, getFormHiddenInputData } from "./Utilts";

export enum FeedbackRaring {
    VeryGood = "veryGood",
    Good = "good",
    Normal = "normal",
    Bad = "bad",
    VeryBad = "veryBad"
}

const defaultFeedbackMessage = "ありがとうございました。とても良い取引ができました。また機会がありましたら、よろしくお願いいたします。";

export const leaveFeedback = createWebTransaction<{
    session: Cookie,
    aid: string,
    targetId: string,
    rating: FeedbackRaring,
    message?: string
}>()
    .setCookie(val => val.session)
    .thenGet("GetFormData", 
        val => ({
            url: "https://auctions.yahoo.co.jp/jp/show/leavefeedback",
            params: { aID: val.aid, t: val.targetId }
        }),
        (doc, val) => ({
            form: getFormHiddenInputData(doc, "//form[method='post']"),
            rating: val.rating,
            message: val.message || defaultFeedbackMessage
        }))
    .thenPost("Submit",
        val => ({
            url: "https://auctions.yahoo.co.jp/jp/submit/leavefeedback",
            form: { ...val.form, rating: val.rating, previewComment: val.message }
        }),
        doc => ({
            includeSuccessfulText: doc.text.includes("を送信しました")
        }))
    .resolve(val => ({
        valid: val.includeSuccessfulText,
        result: null
    }));
/*
    async leaveFeedback(aid: string, targetId: string, rating: FeedbackRaring = FeedbackRaring.VeryGood, message: string = "") {
        // Get form data
        const params = { aID: aid, t: targetId };
        let doc = await this.client.get("https://auctions.yahoo.co.jp/jp/show/leavefeedback", params);
        const form = this.getFormHiddenInputData(doc, "//form[method='post']");

        // Submit
        const data = { ...form, rating, previewComment: message }
        doc = await this.client.post("https://auctions.yahoo.co.jp/jp/submit/leavefeedback", data);

        // Check
        if (!doc.text.includes("を送信しました")) {
            throw new DriverException(DriverExceptionType.OnCheck, doc);
        }
    }*/