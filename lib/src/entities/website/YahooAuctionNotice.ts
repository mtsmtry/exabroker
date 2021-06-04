import { CodePipeline } from "aws-sdk";
import { Column, Entity, Index, PrimaryColumn } from "typeorm";
import { CreatedAt } from "../Utils";

@Entity()
export class YahooAuctionNotice {
    
    @PrimaryColumn()
    code: string;

    @Column("char", { length: 10 })
    aid: string;

    @Column()
    type: string;

    @Column()
    date: Date;

    @Column()
    username: string;

    @Column()
    message: string;
}

export const NOTICE_TYPE_DICT = {
    discs: "連絡掲示板",
    clowb: "落札",
    conts: "取引連絡",
    clsic: "お届け先住所確定",
    stl: "支払完了",
    paydl: "発送連絡",
    arshp: "商品が店舗に届きました",
    stldl: "商品受け取り完了",
    payms: "メッセージ",
    stlms: "取引開始できます",
    paysp: "送料連絡",
    autob: "即決価格での落札",
    obid: "高値更新",
    answ: "質問への回答",
    autos: "出品 - 即決価格での落札",
    clols: "出品 - 終了（落札者なし）",
    clows: "出品 - 終了（落札者あり）",
    amup: "繰り上げ",
    wmup: "繰り上げ同意",
    cmup: "繰り上げ拒否",
    ques: "出品 - 質問",
    mdrs: "値下げ再出品",
    vrep: "違反申告されました",
    aofr: "値下げ",
    wofr: "値下げ成立",
    cofr: "値下げ未成立",
    oarmv: "出品した商品の違反削除",
    acncl: "商品の取消",
    armv: "入札した商品の違反削除",
    bdcl: "入札のキャンセル",
    rmwr: "落札者の削除",
    rats: "評価",
    fbid: "初回入札",
    sbdlr: "同梱依頼",
    bdlrq: "まとめ依頼連絡",
    bdlok: "まとめ同意連絡",
    bdlng: "まとめできませんでした",
    otm: "メッセージ（ストア出品）",
    otts: "配送情報（ストア出品）",
    shm: "購入メッセージ",
    shae: "お支払い手続きエラー",
    shc: "ご購入のキャンセル",
    shcl: "コンビニ支払期限",
    shcn7: "お支払番号(セブン)",
    shcn: "お支払番号(コンビニ)",
    shp: "商品発送準備中",
    shs: "商品発送済み"
}