import { AmazonItemState } from "../../entities/website/AmazonItemState";

export function getAuctionPrice(price: number) {
    const COMMISION = 0.1;
    const PROFIT = 300;
    const RATE_PROFIT = 0.05;
    const result = price * (1.0 / (1.0 - COMMISION)) * (1 + RATE_PROFIT) + PROFIT;
    return result | 0;
}

export function isAvailableItem(state: AmazonItemState) {
    return state.hasStock && !state.isAddon && state.price && state.price < 6000;
}

export function isPurchasableItem(state: AmazonItemState, auctionPrice: number) {
    return state.hasStock && !state.isAddon && state.price && state.price < auctionPrice * 0.9;
}