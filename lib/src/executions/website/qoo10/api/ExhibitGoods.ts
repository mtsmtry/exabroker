import { Endpoint } from "aws-sdk";
import { Cookie } from "../../../../system/execution/WebExecution";
import { getCurrentFilename, toTimestamp } from "../../../../Utils";
import * as qoo10Driver from "../Qoo10Driver";
import { Execution } from "../../../../system/execution/Execution";
import { DBExecution } from "../../../../system/execution/DatabaseExecution";
import { AuctionImage } from "../../../../entities/website/YahooAuctionExhibit";
import { Qoo10Account } from "../../../../entities/website/Qoo10Account";

export interface Qoo10Goods {
    images: string[];
    price: number;
    title: string;
    description: string;
    categoryId: string;
}

export function exhibitGoods(account: Qoo10Account, goods: Qoo10Goods) {
    return Execution.transaction("Yahoo", getCurrentFilename())
        .then(val => qoo10Driver.setNewGoods(account.sellerKey, { 
            imageUrl: goods.images[0],
            price: goods.price,
            title: goods.title,
            description: goods.description,
            categoryId: goods.categoryId
         }))
         .then(val => qoo10Driver.editGoodsMultiImage(account.sellerKey, {
             itemCode: val.itemCode,
             images: goods.images
         }).map(_ => val))
         .then(val => DBExecution.qoo10(rep => rep.createExhibit({
             itemCode: val.itemCode,
             userId: account.userId,
             title: goods.title,
             price: goods.price
         })).map(_ => val));
}