const Painting = require("../models/mongooseSchemas/Painting");

const router = require("express").Router();
const dataRender = require("../models/DataRender");

/**
 * 頁面「展示藝廊」的路由處理。
 */
router.get(["/showcase/:mode/:param1/:param2/:param3", "/showcase/:mode/:param1/:param2"], (req, res) => {
    if (req.user) {
        dataRender.DataRender("showcase", req.url, req.session, (err, dataObj) => {
            if (err) {
                res.setHeader("Content-Type", "text/plain; charset=utf-8");
                res.status(500);
                res.end("Server side error 500 : " + err);
            }
            else {
                res.render("showcase", dataObj);
            }
        });
    }
    else {
        res.redirect("/login");
    }
});

/**
 * 檢查從客戶端送過來的留言資料。經檢查後無錯誤則繼續至下一個程序；若有錯誤則回送錯誤訊息。
 * @param {Express.Request} req Express的Request物件。
 * @param {Express.Response} res Express的Response物件。
 * @param {Function} next 導向函式。
 */
function CheckCommentDatas(req, res, next) {
    // 確認使用者是否有登入
    if (req.user) {
        // 先檢查「是否為活動藝廊」此項是否存在
        req.checkBody("isActivity")
           .notEmpty()
           .withMessage("無法確認留言區域為「個人藝廊」或是「活動藝廊」。請重新整理頁面後再嘗試留言。");

        req.checkBody("id")
           .notEmpty()
           .withMessage("找不到指定要留言的目標畫作Id。請重新整理頁面後再嘗試留言。");
        
        req.checkBody("comment")
           .isLength({min: 1, max: 300})
           .withMessage("留言字數必須在1~300字之間。")
           .matches(/^[^<>\&"']+$/)
           .withMessage("留言內容中，不可包含如「<>&\"'」非法字元。");
        
        // 以 req.body.isActivity 做區隔，對不同的欄位做檢查
        if (req.body.isActivity) {
            req.checkBody("nthSeason")
               .notEmpty()
               .withMessage("找不到活動的季數。請重新整理頁面後再嘗試留言。");
            
            req.checkBody("themeOrder")
               .notEmpty()
               .withMessage("找不到指定季之中的主題。請重新整理頁面後再嘗試留言。");
        }

        // 取得驗證結果
        req.getValidationResult().then((result) => {
            let errors = result.mapped();
            if (result.isEmpty()) {
                next();
            }
            else {
                let firstErr = Object.values(errors)[0];
                res.json({isOK: false, field: firstErr.param, message: firstErr.msg });
            }
        });
    }
    else {
        res.json({isOK: false, field: "SERVER", message: "請先登入後再執行操作。"});
    }
}

/**
 * 儲存留言資料並回送結果訊息。
 * @param {Express.Request} req Express的Request物件。
 * @param {Express.Response} res Express的Response物件。
 */
function SaveCommentAndReponse(req, res) {
    let body = req.body;
    // 若為「活動藝廊」，則將留言新增至指定的參與活動資料中
    if (req.body.isActivity) {
        res.send("Test");
    }
    // 若為「個人藝廊」，則將留言連結至指定的畫作上
    else {
        Painting.PushNewComment(body.id, req.user.username, req.user.personalInfo.photo, body.comment, (err, _id) => {
            if (Painting.IsError_PaintingNotExist(err)) {
                res.json({isOK: false, field: "id", message: "找不到指定要新增留言的畫作。請重新整理頁面之後再嘗試。"});
            }
            else if (err) {
                res.json({isOK: false, field: "SERVER", message: "留言新增失敗，請稍後再嘗試。"});
            }
            else {
                res.json({isOK: true, message: "您的留言已成功地新增！"});
            }
        });
    }
}

/**
 * 在「展示藝廊」之下，處理由客戶端傳送過來的留言資料。
 */
router.post("/showcase/send_commnet", CheckCommentDatas, SaveCommentAndReponse);

/**
 * 檢查由客戶端傳送過來的評分資料。經檢查後無錯誤則繼續至下一個程序；若有錯誤則回送錯誤訊息。
 * @param {Express.Request} req Express的Request物件。
 * @param {Express.Response} res Express的Response物件。
 * @param {Function} next 導向函式。
 */
function CheckRatingDatas(req, res, next) {
    // 先確認使用者是否有登入
    if (req.user) {
        // 檢查「是否為活動藝廊」
        req.checkBody("isActivity")
           .notEmpty()
           .withMessage("無法確認留言區域為「個人藝廊」或是「活動藝廊」。請重新整理頁面後再嘗試留言。");

        // 檢查id
        req.checkBody("id")
           .notEmpty()
           .withMessage("找不到指定要留言的目標畫作Id。請重新整理頁面後再嘗試留言。");
        
        // 檢查「評分分數」
        req.checkBody("score")
           .notEmpty()
           .withMessage("評分分數為空，請重新評分。")
           .isInt({min: 1, max: 5})
           .withMessage("評分分數數值必須為介於1~5之間的整數。");
        
        // 若為「活動藝廊」，則做以下檢查
        if (req.body.isActivity) {
            // 檢查活動的「季」
            req.checkBody("nthSeason")
            .notEmpty()
            .withMessage("找不到活動的季數。請重新整理頁面後再嘗試留言。");
            
            // 檢查活動的「主題」
            req.checkBody("themeOrder")
                .notEmpty()
                .withMessage("找不到指定季之中的主題。請重新整理頁面後再嘗試留言。");
        }

        // 取得驗證結果
        req.getValidationResult().then((result) => {
            let errors = result.mapped();
            // 若檢查結果為沒有錯誤，則到下一個程序
            if (result.isEmpty()) {
                next();
            }
            else {
                let firstErr = Object.values(errors)[0];
                res.json({isOK: false, field: firstErr.param, message: firstErr.msg});
            }
        });
    }
    else {
        res.json({isOK: false, field: "SERVER", message: "請先登入後再執行操作。"});
    }
}

/**
 * 將評分資料儲存，並回送訊息。
 * @param {Express.Request} req Express的Request物件。
 * @param {Express.Response} res Express的Response物件。
 */
function UpdateRatingAndResponse(req, res) {
    let body = req.body;
    // 是否為「活動藝廊」
    if (body.isActivity) {
        res.send("Test");
    }
    // 是否為「個人藝廊」
    else {
        Painting.UpdateRatingById(body.id, req.user.username, body.score, (err, _id) => {
            if (Painting.IsError_PaintingNotExist(err)) {
                res.json({isOK: false, field: "id", message: "找不到指定要評分的畫作。請重新整理頁面之後再嘗試。"});
            }
            else if (err) {
                res.json({isOK: false, field: "SERVER", message: "評分失敗，請稍後再嘗試。"});
            }
            else {
                res.json({isOK: true, message: "已成功地為此作品評分！"});
            }
        });
    }
}

/**
 * 在「展示藝廊」之下，處理由客戶端傳送過來的評分資料。
 */
router.post("/showcase/rating", CheckRatingDatas, UpdateRatingAndResponse);

module.exports = router;