const User = require("../models/mongooseSchemas/User");

const router = require("express").Router();
const passport = require("passport");
const dataRender = require("../models/DataRender");
const request = require("request");
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
router.post("/login", 
function(req,res,next){
    console.log(req.body);
    var secretKey = "6LdCbHoUAAAAAKaOWjrWeyBoaUUgpFmYMJV9iOB8";
    console.log({secret:secretKey,response:req.body['userToken']});
    request.post({url:'https://www.google.com/recaptcha/api/siteverify', form: {secret:secretKey,response:req.body.userToken}}, function(err,httpResponse,body){ 
        if (err) {
            res.send('Faild :', err);
            return;
        }
        else
        {
            var bodyObj=JSON.parse(body);
            if(bodyObj['success'])
                next();
            else
            {
                res.redirect("/login");
            }
               
        }
     });
},passport.authenticate("login", {failureRedirect: "/login", failureFlash: true }), (req, res) => {
    res.redirect("/");
});

/**
 * 客戶端發送「登出」動作，處理後重新導向。
 */
router.get("/signout", (req, res) => {
    req.logout();
    res.redirect("/index");
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