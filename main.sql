-- 取引完了した出品一覧
SELECT d.endDate, d.title, d.price * 0.9 - o.price FROM exabroker.arb_yahoo_amazon_sold as s
INNER JOIN exabroker.amazon_order as o ON s.orderId = o.orderId
INNER JOIN exabroker.yahoo_auction_deal as d ON d.aid = s.aid
ORDER BY d.endDate DESC;

-- 落札一覧
SELECT d.endDate, d.title FROM exabroker.arb_yahoo_amazon_sold as s
INNER JOIN exabroker.yahoo_auction_deal as d ON d.aid = s.aid
ORDER BY d.endDate DESC;

-- 日毎の利益
SELECT DATE(d.endDate), COUNT(*), SUM(d.price * 0.9 - o.price), AVG(d.price * 0.9 - o.price), SUM(o.price) FROM exabroker.arb_yahoo_amazon_sold as s
INNER JOIN exabroker.amazon_order as o ON s.orderId = o.orderId
INNER JOIN exabroker.yahoo_auction_deal as d ON d.aid = s.aid
GROUP BY DATE(d.endDate)
ORDER BY DATE(d.endDate) DESC;

-- レコード数
SELECT table_name, table_rows FROM information_schema.TABLES WHERE table_schema = 'exabroker';

-- 出品数
SELECT username, count(*) FROM exabroker.yahoo_auction_exhibit
WHERE endDate > NOW() AND actuallyEndDate IS NULL
GROUP BY username;

-- 合計出品数
SELECT count(*) FROM exabroker.yahoo_auction_exhibit
WHERE endDate > NOW() AND actuallyEndDate IS NULL

UPDATE exabroker.amazon_item AS i
INNER JOIN 
(SELECT max(id) mid, asin FROM exabroker.amazon_item_state GROUP BY asin) s
ON i.asin = s.asin
SET latestStateId = s.mid