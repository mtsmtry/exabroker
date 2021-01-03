import { Cookie } from "../../../execution/WebExecution";
import { createWebTransaction, getFormHiddenInputData } from "./Utilts";

export interface AuctionImageUploadResponse {
    total_results_available: number,
    total_results_returned: number,
    first_result_position: number,
    images: { url: string, width: number, height: number }[]
}

export const uploadImages = createWebTransaction<{
    session: Cookie,
    buffers: Buffer[]
}>()
    .setCookie(val => val.session)
    .thenGet("GetCrumb", 
        val => ({
            url: "https://auctions.yahoo.co.jp/sell/jp/show/submit"
        }),
        (doc, val) => ({
            form: getFormHiddenInputData(doc, "//form[@name='auction']"),
            imgs: val.buffers
        }))
    .thenPost("Upload",
        val => ({
            url: "https://auctions.yahoo.co.jp/img/images/new",
            attachments: val.imgs.map((img, i) => ({
                field: `files[${i}]`,
                buffer: img,
                filename: `files[${i}].jpg`,
                contentType: "image/jpeg"
            }))
        }),
        doc => doc.json as AuctionImageUploadResponse)
    .resolve(val => ({
        valid: val.total_results_available > 0,
        result: val
    }));
/*
    async uploadImages(urls: string[]): Promise<AuctionImageUploadResponse> {
        console.log(`  driver:uploadImages ${urls.join(",")}`);
        // Get crumb
        const doc = await this.client.get("https://auctions.yahoo.co.jp/sell/jp/show/submit");
        const data = this.getFormHiddenInputData(doc, "//form[@name='auction']");
        
        // Get images
        const imgs = await Promise.all(urls.map(url => this.client.get(url)));

        // Upload images with crumb
        let req = request.post("https://auctions.yahoo.co.jp/img/images/new")
            .field(".crumb", data["img_crumb"]);
        imgs.forEach((img, i) => {
            req.attach(`files[${i}]`, img.buffer, { filename: `files[${i}].jpg`, contentType: "image/jpeg" });
        })
        req.set("Cookie", this.client.getCookies());
        const res = JSON.parse((await req).text) as AuctionImageUploadResponse;

        // Check
        if (res.total_results_available != urls.length) {
            throw `Upload failed ${urls.length - res.total_results_available} / ${urls.length}`;
        }
        return res;
    }*/