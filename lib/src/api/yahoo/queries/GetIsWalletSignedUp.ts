import { Cookie } from "../../../execution/WebExecution";
import { createWebGet } from "./Utils"

export const getIsWalletSignedUp = createWebGet(
    (val: { session: Cookie }) => ({
        url: "https://auctions.yahoo.co.jp/sell/jp/show/submit",
        cookie: val.session
    }),
    doc => doc.get("//a[@href='https://edit.wallet.yahoo.co.jp/config/wallet_signup']") != null
);




