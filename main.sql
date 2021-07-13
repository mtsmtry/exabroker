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
SELECT 
	DATE(d.endDate) "日付",
    COUNT(*) "個数",
    TRUNCATE(SUM(d.price * 0.9 - o.price), 0) "利益",
    TRUNCATE(AVG(d.price * 0.9 - o.price), 0) "利益/個数",
    SUM(o.price) "売上",
    TRUNCATE(SUM(d.price * 0.9 - o.price) * 30, 0) "予測月収"
FROM exabroker.arb_yahoo_amazon_sold as s
INNER JOIN exabroker.amazon_order as o ON s.orderId = o.orderId
INNER JOIN exabroker.yahoo_auction_deal as d ON d.aid = s.aid
GROUP BY DATE(d.endDate)
ORDER BY DATE(d.endDate) DESC;

SELECT
	day "日付",
    num "個数",
    profitSum "総利益",
	profitAve "利益単価",
    sales "総売上",
    profitSum * 30 "予測月収",
    exhibitCount "出品数",
    profitSum / exhibitCount "出品あたり利益"
FROM
(
	SELECT 
		d.day as day,
		count(*) as num,
		TRUNCATE(SUM(d.price * 0.9 - o.price), 0) as profitSum,
		TRUNCATE(AVG(d.price * 0.9 - o.price), 0) as profitAve,
		SUM(o.price) as sales,
		(
			SELECT count(*)
			FROM exabroker.yahoo_auction_exhibit 
			WHERE 
				endDate > d.day
				AND (actuallyEndDate IS NULL OR actuallyEndDate > d.day) 
				AND startDate < d.day
		) as exhibitCount
	FROM exabroker.arb_yahoo_amazon_sold as s
	INNER JOIN exabroker.amazon_order as o ON s.orderId = o.orderId
	INNER JOIN (SELECT *, DATE(endDate) day FROM exabroker.yahoo_auction_deal) d ON d.aid = s.aid
	GROUP BY d.day
	ORDER BY d.day DESC
) t;

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