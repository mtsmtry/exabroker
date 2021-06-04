import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn } from "typeorm";
import { CreatedAt } from "../Utils";

export interface DeliveryAddress {
    fullName: string;
    postalCode1: string;
    postalCode2: string;
    stateOrRegion: string;
    addressLine1: string;
    addressLine2: string;
    addressLine3: string;
    phoneNumber: string;
}

export enum DeliveryPlace {
    DOORSTEP = "doorstep",
    MAILBOX = "mailbox"
}

export enum OrderStatus {
    NONE = "none", 
    SHIPPED = "shipped",
    RECEIVED = "received",
    ABSENCE = "absence"
}

export enum PaymentMethod {
    NONE = "none",
    CREDIT = "credit",
    CREDIT_TWICE = "credit_twice",
    DEBIT = "debit"
}

@Entity()
export class AmazonOrder {

    @PrimaryColumn()
    orderId: string;

    @CreatedAt()
    purchasedAt: Date;

    @Column()
    asin: string;

    @Column()
    account: string;

    @Column()
    price: number;

    @Column()
    status: OrderStatus;

    @Column("enum", { enum: PaymentMethod, default: PaymentMethod.CREDIT })
    paymentMethod: PaymentMethod;

    @Column({ default: 0 })
    usedPoints: number;

    @Column({ default: 0 })
    usedGiftVoucher: number;

    @Column("simple-json")
    deliveryAddress: DeliveryAddress;

    @Column()
    deliveryAddressText: string;

    @Column()
    deliveryDay: Date;

    @Column("datetime", { nullable: true })
    deliveryLatestDay: Date | null;

    @Column()
    deliveryDayText: string;

    @Column("varchar", { nullable: true })
    deliveryCompany: string | null;

    @Column("varchar", { nullable: true })
    deliveryTrackingId: string | null;

    @Column("enum", { enum: DeliveryPlace, nullable: true })
    deliveryPlace: DeliveryPlace | null;

    @Column("text", { nullable: true })
    deliveryPhotoUrl: string | null;
}