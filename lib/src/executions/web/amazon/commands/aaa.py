    def purchase_item(self, aid, asin, shipping: web_yahoo.Shipping, max_price, credit_number):
        already = self.db.select_one(Purchase, aid=aid)
        if already is not None and aid != "dammy":
            return already
            #raise Exception("already purchased")

        # when you duplicate the action of pressing a button, you must send a form data of the submit of the button.
        purchase = Purchase(account=self.email, asin=asin, aid=aid)

    
        with self.log.section("clear cart"):
            res = self.wc.get("https://www.amazon.co.jp/gp/cart/view.html?ref=nav_cart")
            box = res.soup.find(attrs={"data-name": "Active Items"})
            if box is not None:
                form = res.get_form_data(id="activeCartViewForm")
                items = box.findChildren("div", recursive=False)
                for item in items:
                    data = {"timeStamp": form["timeStamp"],
                            "token": form["token"],
                            "requestID": form["requestID"],
                            item.find(attrs={"type": "submit"}).get("name"): 1,
                            "actionItemID": item.get("data-itemid"),
                            "actionType": "delete",
                            "asin": item.get("data-asin"),
                            "encodedOffering": item.get("data-encoded-offering")}
                    self.wc.post("https://www.amazon.co.jp/gp/cart/ajax-update.html/ref=ox_sc_cart_delete_1", data=data)

        if False:
            with self.log.section("add to cart"):
                #res = self.wc.get("https://www.amazon.co.jp/dp/" + asin)
                #params = {"redirectUrl": "/gp/product/" + asin}
                #res = self.wc.get("http://www.amazon.co.jp/gp/product/black-curtain-redirect.html", params=params)
                url = f"https://www.amazon.co.jp/dp/{asin}/ref=as_sl_pc_tf_til?tag=dragonspirit-22&linkCode=w00"
                res = self.wc.get(url)
                data = res.get_form_data(id="addToCart")
                res = self.wc.post("https://www.amazon.co.jp/gp/product/handle-buy-box/ref=dp_start-bbf_1_glance", data=data)
                data = res.get_form_data(method="POST")
                if data is not None:
                    data["addToCart"] = 1
                    res = self.wc.post("https://www.amazon.co.jp/gp/verify-action/templates/add-to-cart/ordering", data=data)

            with self.log.section("set address"):
                res = self.wc.get("https://www.amazon.co.jp/gp/cart/desktop/go-to-checkout.html?proceedToCheckout=Proceed+to+checkout")
                res = self.wc.get("https://www.amazon.co.jp/gp/buy/addressselect/handlers/display.html")
                purchase_id = res.find("input", name="purchaseId").get("value")
                address1, address2 = self.__normalize_address(shipping.address)
                normalized_name = self.__normalize_name(shipping.name)
                data = {"purchaseId": purchase_id,
                        "enterAddressCountryCode": "JP",
                        "enterAddressIsDomestic": 1,
                        "enterAddressFullName": normalized_name,
                        "enterAddressPostalCode": shipping.postal_code1,
                        "enterAddressPostalCode2": shipping.postal_code2,
                        "enterAddressStateOrRegion": shipping.region,
                        "enterAddressAddressLine1": address1,
                        "enterAddressAddressLine2": address2,
                        "enterAddressAddressLine3": "",
                        "enterAddressPhoneNumber": shipping.phone_number}
                res = self.wc.post("https://www.amazon.co.jp/gp/buy/shipaddressselect/handlers/continue.html", data=data)

        with self.wc.get_driver(True) as driver:
            url = urllib.parse.quote("/gp/product/" + asin)
            driver.get(f"http://www.amazon.co.jp/gp/product/black-curtain-redirect.html?redirectUrl={url}")
            driver.find_by_id("add-to-cart-button").click()
            driver.get("https://www.amazon.co.jp/gp/cart/view.html?ref_=nav_cart")
            driver.find_by_name("proceedToCheckout").click()
            address1, address2 = self.__normalize_address(shipping.address)
            normalized_name = self.__normalize_name(shipping.name)
            driver.find_by_id("enterAddressFullName").send_keys(normalized_name)
            driver.find_by_id("enterAddressPostalCode1").send_keys(shipping.postal_code1)
            driver.find_by_id("enterAddressPostalCode2").send_keys(shipping.postal_code2)
            driver.select_by_id("enterAddressStateOrRegion", shipping.region)
            driver.find_by_id("enterAddressAddressLine1").clear()
            driver.find_by_id("enterAddressAddressLine2").clear()
            driver.find_by_id("enterAddressAddressLine1").send_keys(address1)
            driver.find_by_id("enterAddressAddressLine2").send_keys(address2)
            driver.find_by_id("enterAddressPhoneNumber").send_keys(shipping.phone_number)
            driver.find_by_name("shipToThisAddress").click()

            driver.get("https://www.amazon.co.jp/gp/buy/shipoptionselect/handlers/display.html")
            driver.get("https://www.amazon.co.jp/gp/buy/payselect/handlers/display.html")
            payment = driver.get_page()
            text = payment.find(class_="balance-checkbox").text
            self.balance = int(re.search("￥\s*([0-9,]+)", text).group(1).replace(",", ""))
            tag = payment.find(id="pm_0")
            if tag is not None:
                if payment.find(id="pm_300") is None:
                    needs_retype = tag.get("checked") != "checked"
                    driver.find_by_id("pm_0").click()
                    if needs_retype:
                        driver.find_by_id("addCreditCardNumber").send_keys(credit_number)
                        driver.find_by_id("confirm-card").click()
                    time.sleep(3)
                driver.get("https://www.amazon.co.jp/gp/buy/spc/handlers/display.html")

        with self.log.section("get display"):
            res = self.wc.get("https://www.amazon.co.jp/gp/buy/spc/handlers/display.html")
            data = res.get_form_data(id="spc-form")

            if "purchaseTotal" in data:
                purchase.price = data["purchaseTotal"]
            else:
                tag = res.find(id="payment-information")
                match = re.search("([0-9,]+)分のギフト券", tag.text)
                purchase.price = int(match.group(1).replace(",", ""))
            if purchase.price > min(max_price, self.balance):
                raise Exception(f"too expensive:{purchase.price}>{max_price}")
            
            years = res.find_all(**{"data-field": "promiseyear"})
            months = res.find_all(**{"data-field": "promisemonth"})
            days = res.find_all(**{"data-field": "promiseday"})
            dates = [None, None]
            for i, year in enumerate(years):
                y, m, d = int(year.text.replace("年", "")), int(months[i].text.replace("月", "")), int(days[i].text.replace("日", ""))
                dates[i] = dt.datetime(y, m, d)
            purchase.promis_date1, purchase.promis_date2 = dates[0], dates[1]

            if res.select(".displayAddressFullName").text != normalized_name:
                raise Exception("wrong name")
            if res.select(".displayAddressPostalCode").text != f"{shipping.postal_code1}-{shipping.postal_code2}":
                raise Exception("wrong postal code")
            tags = res.find_all("input", name="dupOrderCheckArgs")
            asins = [re.match("([A-Z0-9]+)|", x.get("value")).group(1) for x in tags]
            if len(asins) != 1:
                raise Exception(f"wrong item count:{asins}")
            if asins[0] != asin:
                raise Exception(f"wrong item:{asins[0]}")

        if purchase.promis_date1 is None:
            raise Exception("promis date does not exist")
        latest_promis_date = purchase.promis_date2 or purchase.promis_date1
        if (latest_promis_date - dt.datetime.now()).days > 7:
            raise Exception(f"promis date is too late:{latest_promis_date}")

        with self.log.section("set gift option"):
            box = None #res.find(id="spc-orders").find(attrs={"data-action": "a-checkout-modal-popover"})
            if box is not None:
                gift = json.loads(box.get("data-a-checkout-modal-popover"))
                data = {"obfuscatedEntityId": gift["data"],
                        "cachebuster": utility.now_unixtime(),
                        "includeMessage": 0, 
                        "hidePrices": 1}
                self.wc.post("https://www.amazon.co.jp/gp/buy/pipeline/handlers/update-gift.html", data=data)

        with self.log.section("set amazon point"):
            data = res.get_form_data("span", id="loyalty-points-hidden-fields")
            if data is not None:
                point = data["jpPointsAvailablePoints"]
                data["jpPointsCustomerRequestedAmount"] = min(int(point), purchase.price)
                data["isClientTimeBased"] = 1
                self.wc.post("https://www.amazon.co.jp/gp/buy/spc/handlers/update-loyalty-points.html/ref=ox_spc_points_edit", data=data)

        with self.log.section("place order"):
            data = {"placeYourOrder1": 1} # default: std-pri-jp-dom
            if res.find(value="exp-jp-timed") is not None:
                data["order0"] = "exp-jp-timed" # お急ぎ便
            res = self.wc.post("https://www.amazon.co.jp/gp/buy/spc/handlers/static-submit-decoupled.html/ref=ox_spc_place_order", data=data)
            purchase.order_id = re.search("注文番号:\s*([0-9]{3}\-[0-9]{7}\-[0-9]{7})", res.innertext).group(1) # order id
        purchase.order_date = dt.datetime.now()
        self.db.insert(purchase)
        return purchase
