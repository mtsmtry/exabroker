SELECT d.endDate, d.title, d.price * 0.9 - o.price FROM exabroker.arb_yahoo_amazon_sold as s
INNER JOIN exabroker.amazon_order as o ON s.orderId = o.orderId
INNER JOIN exabroker.yahoo_auction_deal as d ON d.aid = s.aid
ORDER BY d.endDate DESC;

SELECT DATE(d.endDate), COUNT(*), SUM(d.price * 0.9 - o.price), AVG(d.price * 0.9 - o.price), SUM(o.price) FROM exabroker.arb_yahoo_amazon_sold as s
INNER JOIN exabroker.amazon_order as o ON s.orderId = o.orderId
INNER JOIN exabroker.yahoo_auction_deal as d ON d.aid = s.aid
GROUP BY DATE(d.endDate)
ORDER BY DATE(d.endDate) DESC;

SELECT table_name, table_rows FROM information_schema.TABLES WHERE table_schema = 'exabroker';

SELECT username, count(*) FROM exabroker.yahoo_auction_exhibit
WHERE endDate > NOW() AND actuallyEndDate IS NULL
GROUP BY username;