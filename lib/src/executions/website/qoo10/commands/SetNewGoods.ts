import { WebExecution } from "../../../../system/execution/WebExecution";
import { getCurrentFilename, toNotNull } from "../../../../Utils";

export interface Qoo10GoodsBasis {
    imageUrl: string;
    price: number;
    title: string;
    description: string;
    categoryId: string;
}

interface Result {
    ResultObject: {
        GdNo: string;
        BIContentsNo: number;
        AIContentsNo: number | null;
        delivery_group_no: number;
        GroupbuyNo: number;
        optionImgResult: string[];
        InventoryImgResult: string | null;
        QaBrandResult: string | null;
    };
    ResultCode: number;
    ResultMsg: string;
}

export function setNewGoods(sellerKey: string, goods: Qoo10GoodsBasis) {
    return WebExecution.post({
        url: "http://api.qoo10.jp/GMKT.INC.Front.QAPIService/ebayjapan.qapi/ItemsBasic.SetNewGoods",
        form: {
            SecondSubCat: goods.categoryId,
            ManufactureNo: "",
            BrandNo: "",
            ItemTitle: goods.title,
            SellerCode: "",
            IndustrialCode: "",
            ProductionPlace: "",
            AudultYN: "N",
            ContactTel: "",
            StandardImage: goods.imageUrl,
            ItemDescription: goods.description,
            AdditionalOption:  "",
            ItemType:  "",
            RetailPrice: 0,
            ItemPrice: goods.price,
            ItemQty: 10,
            ExpireDate: "2030-12-31",
            ShippingNo: 0,
            AvailableDateType: 3,
            AvailableDateValue: "16:00"
        },
        headers: {
            GiosisCertificationKey: sellerKey,
            QAPIVersion: "1.0"
        }
    }, doc => {
        const result: Result = doc.json;
        return {
            itemCode: result.ResultObject.GdNo
        };
    }, "YahooDriver", getCurrentFilename());
}
