import { CodePipeline } from "aws-sdk";
import { Column, Entity, Index, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { CreatedAt } from "../Utils";

export function equalsUserInfo(a: YahooAccountSetting, b: YahooAccountSetting) {
    return a.nameSei == b.nameSei
        && a.nameMei == b.nameMei
        && a.nameSeiKana == b.nameSeiKana
        && a.nameMeiKana == b.nameMeiKana
        && a.phone == b.phone
        && a.zip == b.zip
        && a.prefecture == b.prefecture
        && a.city == b.city
        && a.address1 == b.address1
        && a.address2 == b.address2;
}

export function equalsWalletInfo(a: YahooAccountSetting, b: YahooAccountSetting) {
    return a.ccNumber == b.ccNumber
        && a.ccExpYear == b.ccExpYear
        && a.ccExpMonth == b.ccExpMonth
        && a.ccCVV == b.ccCVV;
}

@Entity()
export class YahooAccountSetting {

    @PrimaryGeneratedColumn()
    id: number;
    
    @Column()
    nameSei: string;

    @Column()
    nameMei: string;

    @Column()
    nameSeiKana: string;

    @Column()
    nameMeiKana: string;

    @Column()
    phone: string;

    @Column()
    zip: string;

    @Column()
    prefecture: string;

    @Column()
    city: string;

    @Column()
    address1: string;

    @Column()
    address2: string;

    @Column()
    ccNumber: string;

    @Column()
    ccExpMonth: number;

    @Column()
    ccExpYear: number;

    @Column()
    ccCVV: number;

    @CreatedAt()
    createdAt: Date;
}