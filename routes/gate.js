const User = require("../models/mongooseSchemas/User");

const router = require("express").Router();
const passport = require("passport");
const dataRender = require("../models/DataRender");

const fieldLastName_Validator = /^[a-zA-Z\u2E80-\u2FDF\u3190-\u319F\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]{1,16}$/;
const fieldFirstName_Validator = /^([a-zA-Z\u2E80-\u2FDF\u3190-\u319F\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]{1,16})([\ ]*)([a-zA-Z]{0,16})$/;
const fieldEmail_Validator = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const fieldUsername_Validator = /^([a-zA-z]{1,1})([0-9a-zA-z]{3,15})$/;
const fieldPassword_Validator = /(^[0-9a-zA-Z_?!@#+-]{5,16}$)/;

/**
 * 頁面「註冊」的路由處理。
 */
router.get("/signup", (req, res) => {
    dataRender.DataRender("signup", req.url, req.session, (err, dataObj) => {
        if (err) {
            res.setHeader("Content-Type", "text/plain");
            res.status(500);
            res.end("Server side error : 500\n" + err);
        }
        else {
            res.render("signup", dataObj);
        }
    });
});

/**
 * * 需要為「註冊驗證」另外寫一個Typescript、Javascript模組 *
 * 在「註冊」頁面下，使用者傳回註冊訊息。
 */
router.post("/newmembersignup", (req, res) => {
    req.checkBody("lastName")           // 檢查「姓」欄位
       .notEmpty()
       .withMessage("「姓」為必要輸入的欄位，請輸入您的大名。")
       .matches(fieldLastName_Validator)
       .withMessage("「姓」欄位輸入錯誤，請輸入小於17字的英文或中文字。");

    req.checkBody("firstName")          // 檢查「名」欄位
       .notEmpty()
       .withMessage("「名」為必要輸入的欄位，請輸入您的大名。")
       .matches(fieldFirstName_Validator)
       .withMessage("「名」欄位輸入錯誤，請輸入小於33字的英文或中文字。");
    
    req.checkBody("email")              // 檢查「Email」欄位
       .notEmpty()
       .withMessage("\"Email\"為必要輸入的欄位，請輸入您的信箱地址。")
       .matches(fieldEmail_Validator)
       .withMessage("請在\"Email\"欄位中輸入正確的格式。");
    
    req.checkBody("username")           // 檢查「使用者名稱」欄位
       .notEmpty()
       .withMessage("\"Username\"為必要輸入的欄位，請輸入您想要的帳號名稱。")
       .custom((value) => !/^[0-9]$/.test(value.substr(1,1)))
       .withMessage("\"Username\"欄位中的第一字僅能為英文字母。")
       .matches(fieldUsername_Validator)
       .withMessage("「姓」欄位輸入錯誤，請輸入小於17字的英文或中文字。");
    
    req.checkBody("password")           // 檢查「密碼」欄位
       .notEmpty()
       .withMessage("\"Password\"為必要輸入的欄位，請輸入您想要的密碼。")
       .matches(fieldPassword_Validator)
       .withMessage("\"Password\"欄位中必須輸入數字、英文字母或「_?!@#+-」中任一字元。");
    
    req.checkBody("confirmPassword")    // 檢查「確認密碼」欄位
        .notEmpty()
        .withMessage("\"Confirm Password\"為必要輸入的欄位，請再次\"Password\"欄位中的密碼。")
        .equals(req.body.password)
        .withMessage("請在\"Confirm Password\"欄位中輸入與\"Password\"欄位中相符的密碼。");
    
    req.checkBody("termsAgreement")
        .isBoolean()
        .withMessage("請勾選表示同意「JMuseum 條款」。")
        .equals("true")
        .withMessage("請勾選表示同意「JMuseum 條款」。");
    
    // 取得檢查結果
    req.getValidationResult().then((result) => {
        let errors = result.mapped();
        let responseMsg = {isOK: result.isEmpty()};
        res.setHeader("Content-Type", "application/json");
        // 若檢查通過
        if (responseMsg.isOK) {
            let newUserDataSet = {lastName: req.body.lastName, firstName: req.body.firstName,
                                  email: req.body.email, username: req.body.username,
                                  password: req.body.password};
            // 以 newUserDataSet 在資料庫中的User資料表新增使用者資料
            User.createNewUser(newUserDataSet, (err, userDocu) => {
                if (!err) {
                    req.session.isNewUser = true;               // 在session上標記是一位新使用者   
                    responseMsg.redirect = "/signupmsg";        // 將轉跳頁面網址加入到回應物件的redirect屬性
                    console.log("POST /newmembersignup : A new member " + req.body.username + " signed up successfully.");
                }
                else {
                    responseMsg.isOK = false;
                    if (User.IsExistSameUsername(err)) {
                        responseMsg.field = "username";
                        responseMsg.message = "已有人註冊相同的使用者名稱，請更換新的名稱。";
                        console.log("POST /newmembersignup : Exist same username.");
                    }
                    else if (User.IsExistSameEmail(err)) {
                        responseMsg.field = "email";
                        responseMsg.message = "已有人註冊相同的Email，請更換新的電子信箱。";
                        console.log("POST /newmembersignup : Exist same email.");
                    }
                    else {
                        responseMsg.field = "SERVER";
                        responseMsg.message = "很抱歉！伺服端處理時發生錯誤，請稍候重試!";
                        console.log("POST /newmembersignup - ERROR: " + err);
                    }
                }
                res.send(responseMsg);
            });
        }
        else {
            let firstErr = Object.values(errors)[0];    // 取得第一個錯誤訊息物件
            responseMsg.field = firstErr.param;         // 將錯誤的欄位名稱新增到回應物件的field屬性
            responseMsg.message = firstErr.msg;         // 將錯誤訊息新增到回應物件的message屬性
            res.send(responseMsg);
            console.log("POST /newmembersignup : Have Problem!");
        }
    });
});

/**
 * 在「註冊」成功之後的轉跳訊息頁面。
 */
router.get("/signupmsg", (req, res) => {
    // 判斷該訪客是否為剛登入的新使用者
    if (req.session.isNewUser) {
        delete req.session.isNewUser;   // 移除isNewUser屬性，避免重複判斷
        dataRender.DataRender("message_form", req.url, req.session, (err, dataObj) => {
            if (err) {
                res.setHeader("Content-Type", "text/plain");
                res.status(500);
                res.end("Server side error : 500\n" + err);
            }
            else {
                res.render("message_form", dataObj);
            }
        });
    }
    // 若不是，則跳轉到首頁。
    else {
        res.redirect("/");
    }
});

/**
 * 頁面「登入」的路由處理。
 */
router.get("/login", (req, res) => {
    dataRender.DataRender("login", req.url, req.session, (err, dataObj) => {
        if (err) {
            res.setHeader("Content-Type", "text/plain");
            res.status(500);
            res.end("Server side error : 500\n" + err);
        }
        else {
            let errors = req.flash("error");
            if (errors.length > 0) {
                dataObj.datas.isLoginFailed = true;
                dataObj.datas.loginMessage = errors[0];
            }
            res.render("login", dataObj);
        }
    });
});

/**
 * 在「登入」頁面下，處理、驗證使用者所傳的帳號、密碼是否正確。
 */
router.post("/login", passport.authenticate("login", {failureRedirect: "/login", failureFlash: true }), (req, res) => {
    res.redirect("/");
});

/**
 * 客戶端發送「登出」動作，處理後重新導向。
 */
router.get("/signout", (req, res) => {
    req.logout();
    res.redirect("/index");
});

module.exports = router;