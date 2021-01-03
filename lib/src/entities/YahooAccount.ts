import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn } from "typeorm";
import { CreatedAt } from "./Utils";
import { YahooAccountSetting } from "./YahooAccountSetting";

@Entity()
export class YahooAccount {

    @PrimaryColumn()
    username: string;

    @Column()
    password: string;

    @CreatedAt()
    createdAt: Date;

    @Column("simple-json", { nullable: true })
    cookies: { [name: string]: string } | null;

    @Column("datetime", { nullable: true })
    loggedinAt: Date | null;

    // Status
    @Column("bool", { nullable: true })
    isPremium: boolean | null;

    @Column("bool", { nullable: true })
    isExhibitable: boolean | null;

    @Column("int", { nullable: true })
    rating: number | null;

    @Column("int", { nullable: true })
    balance: number | null;

    @Column("datetime", { nullable: true })
    statusUpdatedAt: Date | null;

    @ManyToOne(type => YahooAccountSetting, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "lastSettingId" })
    lastSetting: YahooAccountSetting | null;
    @Column("int", { nullable: true })
    lastSettingId: number | null;

    @ManyToOne(type => YahooAccountSetting, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "desiredSettingId" })
    desiredSetting: YahooAccountSetting | null;
    @Column("int", { nullable: true })
    desiredSettingId: number | null;
}