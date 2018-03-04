
const router = require("express").Router();
const dataRender = require("../models/DataRender");

const Feedback = require("../models/mongooseSchemas/Feedback");

/**
 * 頁面「意見回饋」的路由處理。
 */
router.get("/feedback", (req, res) => {
    dataRender.DataRender("feedback", req.url, req.session, (err, dataObj) => {
        if (err) {
            res.setHeader("Content-Type", "text/plain");
            res.status(500);
            res.end("Server side error : 500\n" + err);
        }
        else {
            res.render("feedback", dataObj);
        }
    });
});

/**
 * 確認使用者是否有登入。
 * 若有登入，則繼續向下一個程序處理；
 * 若沒有登入，則回應、請求使用者登入。
 * @param {Express.Request} req Express的Requrest物件。
 * @param {Express.Response} res Express的Response物件。
 * @param {Function} next 導向函式。
 */
function CheckLogin(req, res, next) {
    if (req.user) {
        next();
    }
    else {
        res.json({isOK: false, field: "SERVER", message: "請先登入後再進行操作。"});
    }
}

/**
 * 檢查使用者傳送過來的資料使否正確、符合規定。
 * 若檢查通過，則繼續向下一個程序處理。
 * 若檢查不通過，則回送錯誤訊息。
 * @param {Express.Request} req Express的Request物件。
 * @param {Express.Response} res Express的Response物件。
 * @param {Function} next 導向函式。
 */
function CheckFeedbackData(req, res, next) {
    // 檢查使用者是否已經有回饋過且尚未
    if (req.user.hasPostFeedback) 
        return res.json({isOK: false, field: "SERVER", message: "您在先前已經有回饋過訊息了。請等待約一個月之後再進行回饋。"});
    
    // 檢查回饋資料的「主旨」
    req.checkBody("title")
       .notEmpty()
       .withMessage("請在欄位「主旨」輸入1~64字間的回饋主旨。")
       .len({ min: 1, max: 64 })
       .withMessage("欄位「主旨」限定1~64字間的回饋主旨。");
    
    // 檢查回饋資料的「內容」
    req.checkBody("content")
       .notEmpty()
       .withMessage("請在欄位「內容」輸入16~1000字間的回饋內容。")
       .len({ min: 16, max: 1000 })
       .withMessage("在欄位「內容」中，輸入只少16至1000字數間的回饋內容。");
    
    // 取得檢查資料的結果
    req.getValidationResult().then((result) => {
        if (result.isEmpty()) {
            next();
        }
        else {
            let errors = result.mapped();
            let firstError = Object.values(errors)[0];
            res.json({isOK: false, field: firstError.param, message: firstError.msg});
        }
    });

}

/**
 * 儲存回饋資料並回送訊息。
 * @param {Express.Request} req Express的Request物件。
 * @param {Express.Response} res Express的Response物件。
 */
function SaveFeedbackDataAndResponse(req, res) {
    let body = req.body, user = req.user;
    let newFeedbackData = { username: user.username, title: body.title, content: body.content };
    
    // 以newFeedbackData建立一個新的回饋資料
    Feedback.createNewFeedback(newFeedbackData, (err, _id) => {
        if (err) return res.json({isOK: false, field: "SERVER", message: "伺服器內部發生了錯誤。請稍候再嘗試動作。"});
        
        user.hasPostFeedback = true;    // 將hasPostFeedback設為true
        user.save((err) => {            // 儲存使用者資料
            if (err) {
                res.json({isOK: false, field: "SERVER", message: "儲存使用者資料時發生了錯誤，"});
            }
            else {
                req.session.feedbackSuccessfully = true;            // 標記處理成功
                res.json({isOK: true, url: "/feedback/success"});   // 回送訊息
            }
        });
    });
}

/**
 * 使用者將傳送過來的回饋資料進行處理。
 */
router.post("/feedback", CheckLogin, CheckFeedbackData, SaveFeedbackDataAndResponse);

module.exports = router;