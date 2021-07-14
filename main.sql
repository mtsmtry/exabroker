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
	day "日付",
    soldNum "個数",
	num - soldNum "未完了数",
    untreatedNum "未処理数",
    profitSum "総利益",
	profitAve "利益単価",
    buySum "総仕入額",
    sales "総売上",
    profitSum * 30 "月収換算",
    exhibitCount "出品数",
    TRUNCATE(profitSum / exhibitCount, 3) "出品あたり利益",
    accountCount "アカウント数",
    TRUNCATE(exhibitCount / accountCount, 0) "アカウントあたり出品数"
FROM
(
	SELECT
		DATE(d.day) as day,
		count(*) as num,
        sum(CASE WHEN o.orderId IS NULL THEN 0 ELSE 1 END) as soldNum,
		IFNULL(TRUNCATE(SUM(d.price * 0.9 - o.price), 0), 0) as profitSum,
		TRUNCATE(AVG(d.price * 0.9 - o.price), 0) as profitAve,
        IFNULL(SUM(o.price), 0) as buySum,
		IFNULL(SUM(d.price * (CASE WHEN o.orderId IS NULL THEN 0 ELSE 1 END)), 0) as sales,
        SUM(CASE WHEN d.status = 'paid' AND o.orderId IS NULL THEN 1 ELSE 0 END) as untreatedNum,
		(
			SELECT count(*)
			FROM exabroker.yahoo_auction_exhibit 
			WHERE 
				endDate > d.day
				AND (actuallyEndDate IS NULL OR actuallyEndDate > d.day) 
				AND startDate < d.day
		) as exhibitCount,
		(
			SELECT count(distinct username)
			FROM exabroker.yahoo_auction_exhibit 
			WHERE 
				endDate > d.day
				AND (actuallyEndDate IS NULL OR actuallyEndDate > d.day) 
				AND startDate < d.day
		) as accountCount
	FROM exabroker.arb_yahoo_amazon_sold as s
	LEFT JOIN exabroker.amazon_order as o ON s.orderId = o.orderId
	INNER JOIN (SELECT *, DATE_ADD(DATE(endDate), INTERVAL 12 HOUR) day FROM exabroker.yahoo_auction_deal) d ON d.aid = s.aid
	GROUP BY d.day
	ORDER BY d.day DESC
) t;

-- レコード数
SELECT table_name, table_rows FROM information_schema.TABLES WHERE table_schema = 'exabroker';

-- 出品数
SELECT e.username, count(*), a.maxExhibition, a.isExhibitable
FROM exabroker.yahoo_auction_exhibit as e
INNER JOIN exabroker.yahoo_account as a ON a.username = e.username
WHERE e.endDate > NOW() AND e.actuallyEndDate IS NULL
GROUP BY e.username
ORDER BY count(*) DESC

-- 合計出品数
SELECT count(*) FROM exabroker.yahoo_auction_exhibit
WHERE endDate > NOW() AND actuallyEndDate IS NULL

-- 落札される商品についての分析
SELECT e.username, d.buyerId, d.endDate, e.title, e.price, a.asin, s.messageStatus, h.dealCount, am.reviewCount, am.rating
FROM exabroker.arb_yahoo_amazon_sold as s
INNER JOIN exabroker.arb_yahoo_amazon as a on a.id = s.id
INNER JOIN exabroker.yahoo_auction_exhibit as e ON e.aid = a.aid
INNER JOIN exabroker.yahoo_auction_deal as d ON d.aid = a.aid
INNER JOIN exabroker.amazon_item as am ON am.asin = a.asin
LEFT JOIN exabroker.yahoo_auction_history as h ON h.asin = a.asin
ORDER BY d.endDate desc

-- 過去の落札の数
SELECT h.dealCount, count(*), AVG(a.reviewCount), AVG(a.rating) FROM exabroker.yahoo_auction_history as h
INNER JOIN exabroker.amazon_item as a ON a.asin = h.asin
WHERE h.dealCount > 0
GROUP BY h.dealCount
ORDER BY h.dealCount

-- 
UPDATE exabroker.amazon_item AS i
INNER JOIN 
(SELECT max(id) mid, asin FROM exabroker.amazon_item_state GROUP BY asin) s
ON i.asin = s.asin
SET latestStateId = s.mid
