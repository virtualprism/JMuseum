
const router = require("express").Router();
const dataRender = require("../models/DataRender");

/**
 * 頁面「撰寫站內訊息」的路由處理
 */
router.get(["/write_message", "/write_message/:username"], (req, res) => {
    if (req.session.passport && req.session.passport.user) {
        dataRender.DataRender("write_message", req.url, req.session, (err, dataObj) => {
            if (err) {
                console.log(err);
                res.setHeader("Content-Type", "text/plain");
                res.status(500);
                res.end("Server side error 500 : " + err);
            }
            else {
                res.render("write_message", dataObj);
            }
        });
    }
    else {
        res.redirect("/");
    }
});

/**
 * 取得由「撰寫站內訊息」頁面所傳來的訊息
 */
router.post("/write_message", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    // 檢查使用者是否有登入。 若有登入，則近一步地做檢查動作
    if (req.session.passport && req.session.passport.user) {
        // 檢查「收件者」
            req.checkBody("recipient")
            .notEmpty()
            .withMessage("請選擇接收此站內信的目標使用者名稱。");
        
        // 檢查「標題」
        req.checkBody("subject")
            .notEmpty()
            .withMessage("請在「主旨」欄位上輸入1~32字間的主旨。")
            .matches(/^([^<>\&"'$]{1,32})$/)
            .withMessage("請勿在「主旨」中輸入有包含「<>&\"'$」有關的字元。");
        
        // 檢查「內文」
        req.checkBody("content")
            .notEmpty()
            .withMessage("請在「內文」中輸入您想對目標使用者傳達的訊息。")
            .len({min: 8, max: 500})
            .withMessage("請在「內文」中輸入8~500數量的文字訊息。");

        // 取得驗證結果
        req.getValidationResult().then((result) => {
            let errors = result.mapped();
            let responseMsg = { isOK: result.isEmpty() };
            // 若驗證不通過，則傳送錯誤訊息
            if (!responseMsg.isOK) {
                let firstErr = Object.values(errors)[0];
                responseMsg.field = firstErr.param;
                responseMsg.message = firstErr.msg;
                res.send(responseMsg);
                return;
            }
            
            // 若驗證皆通過，則寄發信件: 將寄件者的信件寄給收件者。
            User.SendSiteMail(req.session.passport.user, req.body, (err, isOK) => {
                if (!err) {
                    responseMsg.url = "/send_sitemail_successfully";
                }
                else if (User.IsUserNotExist(err)) {
                    responseMsg.isOK = false;
                    responseMsg.field = "SERVER";
                    responseMsg.message = "找不到指定的目標的收件者。";
                }
                else {
                    responseMsg.isOK = false;
                    responseMsg.field = "SERVER";
                    responseMsg.message = err.message;
                }
                res.send(responseMsg);
            });
        });
    }
    // 若沒有登入，則回應錯誤。
    else {
        res.send({isOK: false, message: "您尚未登入，請登入後再嘗試撰寫、傳送站內訊息。"});
    }
});

/**
 * 在頁面「撰寫站內訊息」下，成功處理站內信後的跳轉頁面。
 */
router.get("/send_sitemail_successfully", (req, res) => {
    dataRender.DataRender("message_form", req.url, req.session, (err, dataObj) => {
        if (err) {
            res.setHeader("Content-Type", "text/plain");
            res.status(500);
            res.end("Server side error 500 : " + err);
        }
        else {
            res.render("message_form", dataObj);
        }
    });
});

module.exports = router;