const User = require("../models/mongooseSchemas/User");

const router = require("express").Router();
const multer = require("multer");
const dataRender = require("../models/DataRender");

/**
 * 頁面「個人主頁」的路由處理。
 */
router.get("/home/:username", (req, res) => {
    // 若使用者有登入，則允許觀看其他會員的個人頁面
    if (req.session.passport && req.session.passport.user) {
        dataRender.DataRender("personal_page", req.url, req.session, (err, dataObj) => {
            if (!err) {
                res.render("personal_page", dataObj);
            }
            else if (User.IsUserNotExist(err)) {
                res.redirect("/homenotexist/" + req.params["username"]);
            }
            else {
                res.setHeader("Content-Type", "text/plain");
                res.status(500);
                res.end("Server side error 500 : " + err);
            }
        });
    }
    // 若沒有則轉跳到登入頁面
    else {
        res.redirect("/login");
    }
});

/**
 * 在「個人頁面」要尋找指定使用者之下，發生找不到該使用者時所跳轉的訊息頁面。
 */
router.get("/homenotexist/:username", (req, res) => {
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

/**
 * 頁面「編輯個人資料」的路由處理。
 */
router.get("/edit_personal_info", (req, res) => {
    // 若使用者有登入，則將編輯頁面傳送至客戶端
    if (req.session.passport && req.session.passport.user) {
        // 取得相對應的插值物件
        dataRender.DataRender("edit_personal_info", req.url, req.session, (err, dataObj) => {
            // 若發生錯誤則傳送訊息。
            if (err) {
                res.setHeader("Content-Type", "text/plain");
                res.status(500);
                res.end("Server side error 500 : " + err);
            }
            // 若無則將頁面傳送至客戶端
            else {
                res.render("edit_personal_info", dataObj);
            }
        });
    }
    // 若沒有則轉跳到首頁
    else {
        res.redirect("/");
    }
});

/**
 * 檔案上傳協助物件，SavePersonalInfo_Upload。
 * 上傳的圖片會暫存在"./temp"中。
 */
const SPI_Upload = multer({ 
    dest: "./temp",
    limits: { fileSize: 131072, files: 1 }
});

/**
 * 在頁面「編輯個人資料」之下，按下「儲存更變」後所傳來的資料，由此路由來處理。
 * 圖像檔案資訊存放於「req.files」中，文字類訊息存放於「req.body」中。
 */
router.post("/save_personal_info", SPI_Upload.single("photo"), (req, res) => {
    // 若沒有登入，則跳轉至首頁
    if (!req.session.passport || !req.session.passport.user) return res.redirect("/");

    res.setHeader("Content-Type", "application/json");

    let theFile = req.file;
    // 若有登入，則在做檢查動作。
    // 若使用者有傳送檔案 且 檔案類別不為"image/jpeg"與"image/png"的話，則回送錯誤訊息。
    if (theFile && theFile.mimetype != "image/jpeg" && theFile.mimetype != "image/png") {
        res.end({"isOK": false, "field": "photo", "message": "類型錯誤: 上傳的檔案類型請選擇jpg或png圖檔。"});
        return;
    }

    // 檢查「姓」
    req.checkBody("lastName")
       .notEmpty()
       .withMessage("「姓」為必要輸入的欄位，請輸入您的大名。")
       .matches(/^[a-zA-Z\u2E80-\u2FDF\u3190-\u319F\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]{1,16}$/)
       .withMessage("「姓」欄位輸入錯誤，請輸入小於17字的英文或中文字。");
    // 檢查「名」
    req.checkBody("firstName")
       .notEmpty()
       .withMessage("「名」為必要輸入的欄位，請輸入您的大名。")
       .matches(/^([a-zA-Z\u2E80-\u2FDF\u3190-\u319F\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]{1,16})([\ ]*)([a-zA-Z]{0,16})$/)
       .withMessage("「名」欄位輸入錯誤，請輸入小於33字的英文或中文字。");
    // 檢查「暱稱」
    req.checkBody("nickname")
       .len({max: 16})
       .withMessage("暱稱欄位的字數至多16字元。")
       .matches(/^([^<>\&"']{0,16})$/)
       .withMessage("在暱稱欄位中請勿輸入非法字元: <>&\"\'");
    // 檢查「短言」
    req.checkBody("motto")
       .len({max: 32})
       .withMessage("短言欄位的字數至多32字元。")
       .matches(/^([^<>\&"']{0,32})$/)
       .withMessage("在短言欄位中請勿輸入非法字元: <>&\"\'");
    
    // 取得檢查結果
    req.getValidationResult().then((result) => {
        let errors = result.mapped();                   // 將結果做成字典物件
        let responseMsg = {isOK: result.isEmpty()};     // 宣告、初步定義回應物件

        // 若檢查通過，則將資料更新至資料庫(交給資料庫Schema處理)
        if (responseMsg.isOK) {

            // 呼叫UpdatePersonalInfo，傳入使用者的_id、文字資料、檔案訊息與回呼函式
            User.UpdatePersonalInfo(req.session.passport.user, req.body, theFile, (err, isOK) => {
                // 若有錯誤，則將錯誤設定至回應物件上，並在控制台上印出錯誤
                if (err) {
                    responseMsg.isOK = false;
                    responseMsg.field = "SERVER";
                    responseMsg.message = (User.IsUserNotExist(err) ? "使用者資料對應錯誤。請重新登入再執行此操作。" : "伺服器內部錯誤，請稍後再嘗試。");
                    console.log(err);
                }
                // 若無錯誤，則標上 personalInfoUpdated 與轉跳頁面
                else {
                    req.session.personalInfoUpdated = true;
                    responseMsg.redirect = "/personalinfo_updated";
                }
                // 若無錯誤，則直接回呼 (不改變 responseMsg.isOK 的 true 值)
                res.send(responseMsg);
            });
        }
        else {
            let firstErr = Object.values(errors)[0];    // 取得第一個錯誤訊息物件
            responseMsg.field = firstErr.param;         // 將錯誤的欄位名稱新增到回應物件的field屬性
            responseMsg.message = firstErr.msg;         // 將錯誤訊息新增到回應物件的message屬性
            res.send(responseMsg);
        }
    });
});

/**
 * 在「編輯個人資料」頁面下，使用者上傳資料並成功後的跳轉訊息頁面。
 */
router.get("/personalinfo_updated", (req, res) => {
    // 若有標記 personalInfoUpdated ，
    if (req.session.personalInfoUpdated) {

        // 刪除標記，以免重複
        delete req.session.personalInfoUpdated;

        // 取得插值資料(傳入URL，給內部判斷)
        dataRender.DataRender("message_form", req.url, req.session, (err, dataObj) => {
            // 若有錯誤，則發送錯誤訊息
            if (err) {
                res.setHeader("Content-Type", "text/plain");
                res.status(500);
                res.end("Server side error 500 : " + err);
            }
            else {
                res.render("message_form", dataObj);
            }
        });
    }
    // 若無標記，則直接跳轉到首頁
    else {
        res.redirect("/");
    }
});

module.exports = router;