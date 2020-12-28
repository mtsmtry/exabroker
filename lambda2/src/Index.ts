import * as lib from "exabroker-lib";

async function syncAccount(username: string, rep: lib.YahooRepository) {
    const yahoo = new lib.YahooAuctionClient(rep);
    await yahoo.login(username);
    await Promise.all([yahoo.setupAccount(), yahoo.getNotices()])
}

export async function handler(event: any, context: any) {
    const conn = await lib.createDatabaseConnection();
    const rep = new lib.YahooRepository(conn.manager);
    const usernames = await rep.getAccountUsernames();
    await Promise.all(usernames.map(username => syncAccount(username, rep)));
}