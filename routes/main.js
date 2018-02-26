
const User = require("../models/mongooseSchemas/User");

const router = require("express").Router();
const pug = require("pug");
const passport = require("passport");
const LocalStrategy = require('passport-local').Strategy;
const multer = require("multer");
const dataRender = require("../models/DataRender");

// 序列化: 在第一次驗證之後，session皆不會保留驗證訊息，因此取得user.id
passport.serializeUser(function(user, done) {
    done(null, user._id);
});

// 反序列化: 用user.id來取得資料庫中的指定資料
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

/**
 * 定義在「登入」頁面，使用者進行登入、傳送帳號密碼時所做的驗證策略。
 */
passport.use("login" ,new LocalStrategy({
    usernameField: "username",
    passwordField: "password"
}, function (username, password, done) {
    User.AccountComparison(username, password, (err, user) => {
        if (err) return done(err);
        if (!user)
            return done(null, false, {message: "使用者名稱或密碼錯誤。"});
        else
            return done(null, user);
    });
}));

/**
 * 頁面「首頁」的路由處理。
 */
router.use(require("./index"));

/**
 * 頁面「傑作藝廊」的路由處理。
 */
router.use(require("./gallery"));

/**
 * 頁面「畫作主題」的路由處理。
 */
router.use(require("./theme"));

/**
 * 頁面「繪圖創作」的路由處理。
 */
router.use(require("./drawing"));

/**
 * 頁面「意見回饋」的路由處理。
 */
router.use(require("./feedback"));

/**
 * 註冊、登入與登出的相關頁面與處理。
 */
router.use(require("./gate"));

/**
 * 頁面「展示藝廊」的路由處理。
 */
router.use(require("./showcase"));

/**
 * 頁面「投稿主題」的路由處理。.
 */
router.use(require("./submit_theme"));

/**
 * 頁面「」
 */
router.use(require("./vote_theme"));

/* =================================== */

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

/**
 * 頁面「更變密碼」的路由處理。
 */
router.get("/newpw", (req, res) => {
    // 確認使用者是否有登入
    if (req.session.passport && req.session.passport.user) {
        dataRender.DataRender("change_password", req.url, req.session, (err, dataObj) => {
            if (err) {
                res.setHeader("Content-Type", "text/plain");
                res.status(500);
                res.end("Server side error 500 : " + err);
            }
            else {
                let errMsg = req.flash("error");
                if (errMsg.length > 0) {
                    dataObj.datas.errorMessage = errMsg[0];
                }
                res.render("change_password", dataObj);
            }
        });
    }
    // 若沒有登入，則轉跳到首頁。
    else {
        res.redirect("/");
    }
})

/**
 * 在頁面「更變密碼」下，傳送新、舊密碼來進行更新密碼的處理。
 */
router.post("/newpw", (req, res) => {
    // 若使用者為登入狀態，則進一步檢查內容
    if (req.session.passport && req.session.passport.user) {
        let body = req.body;
        req.checkBody("oldpw")
           .notEmpty()
           .withMessage("「舊密碼」為必要的欄位，請填寫您目前正使用的密碼。");
        
        req.checkBody("newpw")
           .notEmpty()
           .withMessage("「新密碼」為必要的欄位，請填寫您想要的新密碼。")
           .not().equals(body.oldpw)
           .withMessage("「新密碼」請勿與「舊密碼」完全一致。請更換新密碼。")
           .matches(/(^[0-9a-zA-Z_?!@#+-]{5,16}$)/)
           .withMessage("「新密碼」欄位僅能填寫5~16的數字、英文字母或「_?!@#+-」字元。");
        
        req.checkBody("newpw_confirm")
           .notEmpty()
           .withMessage("「確認新密碼」為必要的欄位，請填寫與「新密碼」欄位中一致的密碼。")
           .equals(body.newpw)
           .withMessage("「確認新密碼」欄位必須與「新密碼」欄位中的密碼一致。");

        // 取得驗證結果
        req.getValidationResult().then((result) => {

            // 如果結果為空，也就是沒有任何錯誤訊息的話
            if (result.isEmpty()) {
                // 嘗試更變使用者的密碼
                User.ChangePassword(req.session.passport.user, body.oldpw, body.newpw, (err, result) => {
                    // 若有錯誤，則對錯誤做處理
                    if (err) {
                        if (User.IsUserNotExist(err)){
                            // * 可改成轉跳到登入頁面 *
                            req.flash("error", "使用者帳號已登出，請先重新登入。");
                            res.redirect("/newpw");
                        }
                        // 若為其他錯誤，則告知使用者
                        else {
                            console.log(err);
                            req.flash("error", "伺服器內部錯誤，請稍後再嘗試。");
                            res.redirect("/newpw");
                        }
                    }
                    // 若無錯誤，則依照結果發送訊息
                    else {
                        if (result) {
                            req.session.changePW_successfuly = true;
                            res.redirect("/newpw_success");
                        }
                        else {
                            req.flash("error", "「舊密碼」輸入錯誤。請輸入正確的、當前使用的密碼。");
                            res.redirect("/newpw");
                        }
                    }
                });
            }
            // 若不為空，表示有誤
            else {
                let firstErr = Object.values(result.mapped())[0];   // 取得第一個錯誤
                req.flash("error", firstErr.msg);                   // 將錯誤設定至flash中
                res.redirect("/newpw");                             // 轉跳到「更新密碼」頁面
            }
        });
    }
    // 若沒有登入，則轉跳到首頁。 (暫時)
    else {
        res.redirect("/");
    }
});

/**
 * 在頁面「更變密碼」之下，成功更改密碼之後的轉跳訊息頁面。
 */
router.get("/newpw_success", (req, res) => {
    // 確認是否「剛剛更新完密碼」
    if (req.session.changePW_successfuly) {
        delete req.session.changePW_successfuly;    // 刪除標記，以免重複

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
    }
});



module.exports = router;