/**
 * 在「登入」頁面下，處理、驗證使用者所傳的帳號、密碼是否正確。
 */
router.post("/login", (req, res) => {
    req.checkBody("username")
       .notEmpty().withMessage("請輸入登入的使用者名稱。");
    req.checkBody("password")
       .notEmpty().withMessage("請輸入登入的密碼。");
    // 取得錯誤物件結果
    req.getValidationResult().then((result) => {
        let errors = result.mapped();
        let responseMsg = {isOK : result.isEmpty()};
        // 取得資料插值物件
        dataRender.DataRender("login", req.session, (err, dataObj) => {
            if (err) {
                res.setHeader("Content-Type", "text/plain");
                res.status(500);
                res.end("Server side error : 500\n" + err);
                return;
            }
            // 若驗證、檢查成功，則從資料庫中比對帳號、密碼資訊
            if (responseMsg.isOK) {
                User.AccountComparison(req.body.username, req.body.password, (err, result) => {
                    // 若帳號密碼比對不成功 或 找不到使用者，則送出錯誤訊息
                    if (!result) {
                        dataObj.isLoginFailed = true;
                        dataObj.loginMessage = "錯誤的帳號名稱或密碼，請重新輸入。";
                        res.render("login", dataObj);
                        return;
                    }
                    else if (err) {
                        dataObj.isLoginFailed = true;
                        dataObj.loginMessage = "很抱歉！伺服端處理時發生錯誤，請稍候重試!";
                        res.render("login", dataObj);
                        return;
                    }
                    res.send(responseMsg);
                });
            }
            else {
                let firstErr = Object.values(errors)[0];    // 取得第一個錯誤訊息物件
                dataObj.isLoginFailed = true;
                dataObj.loginMessage = firstErr.msg;        // 將錯誤訊息新增到回應物件的message屬性
                res.render("login", dataObj);
            }
        });
    });
});