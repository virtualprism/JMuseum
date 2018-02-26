
const router = require("express").Router();
const dataRender = require("../models/DataRender");
const ServerStatus = require("../ServerStatus");

const NewTheme = require("../models/mongooseSchemas/NewTheme");

const GeneralServerErrorResponse = {isOK: false, field: "SERVER", message: "伺服器內部錯誤，請稍後再嘗試操作。"};


/**
 * 確認目標物件是否為「整數」。
 * @param {Object} value 要確認的目標變數。
 * @return {boolean} 判斷結果。
 */
function isInt(value) {
    let x;
    return isNaN(value) ? !1 : (x = parseFloat(value), (0 | x) === x);
}

/**
 * 頁面「主題票選」之下的路由處理。
 */
router.get("/votetheme", (req, res) => {
    // 檢查使用者是否有登入
    if (req.user) {
        // 依照使用者是否有為主題投過票，來決定要給定哪個頁面
        let source = req.user.hasVotedNewTheme ? "message_form" : "vote_theme";
        
        dataRender.DataRender(source, req.url, req.session, (err, dataObj) => {
            if (err) {
                res.setHeader("Content-Type", "text/plain; charset=utf-8");
                res.status(500);
                res.end("Server side error 500 : " + err);
            }
            else {
                res.render(source, dataObj);
            }
        });
    }
    // 若沒有登入，則轉跳到登入頁面
    else {
        res.redirect("/login");
    }
});

/**
 * 確認基本資料。使用者是否登入、是否已有投過票，若滿足其中一項則會回送錯誤訊息。
 * @param {Express.Request} req Express的Request物件。
 * @param {Express.Response} res Express的Response物件．
 * @param {Function} next 導向函式。
 */
function CheckUserBasic(req, res, next) {
    // 若使用者未登入，則回送錯誤訊息
    if (!req.user) {
        return res.json({isOK: false, field: "SERVER", message: "請先登入後再執行主題票選的操作。"});
    }
    // 若使用者已經票選過主題，則回送訊息
    if (req.user.hasVotedNewTheme) {
        return res.json({isOK: false, field: "SERVER", message: "您已為候選主題票選過，請等待下一次的票選活動。"});
    }
    next();
}

/**
 * 確認、處理投票欄位。若該欄位不為陣列形式、使用者選取的候選主題數量不正確，
 * 或陣列中的其中一項元素不為正整數的話，則回送錯誤訊息。
 * @param {Express.Request} req Express的Request物件。
 * @param {Express.Response} res Express的Response物件．
 * @param {Function} next 導向函式。
 */
function CheckAndModifySelectionField(req, res, next) {  
    let selections = req.body ? req.body.selections : null;     // 取得使用者所選擇的主題

    // 若使用者的「所選主題」並不為陣列形式的話，回送錯誤訊息。
    if (!Array.isArray(selections)) {
        return res.json({isOK: false, field: "selections", message: "傳送的資料格式錯誤。請重新整理此頁面後再操作一次。"});
    }

    let numOfSel = ServerStatus.status.voteCount;               // 指定所要選擇的數量
    let selLength = selections.length;
    // 檢查使用者是否確實的選了指定數量(numOfSel)的候選主題。
    if (selLength != numOfSel) {
        return res.json({isOK: false, field: "selections", message: "請選取" + numOfSel + "個您所想要的候選主題。"});
    }

    // 確認清單中的每個元素皆為「整數」形式，且數值範圍為自然數。
    // 除了檢查，也依序將每個元素都轉成 Number 型態。
    // 若其中有一個元素不為整數的話，則回送錯誤訊息。
    for (let i = 0, value; i < selLength; i++) {
        if (isInt(selections[i])) {
            value = parseInt(selections[i]);
            // 如果其中一個元素的票選索引選擇小於0的話，則回送錯誤訊息
            if (value < 0) {
                return res.json({isOK: false, field: "selections", message: "傳送的選票資料錯誤。請重新整理此頁面後再操作一次。"});
            }
            // 否則，則將其轉變為整數並回存
            else {
                selections[i] = value;
            }
        }
        else {
            return res.json({isOK: false, field: "selections", message: "傳送的資料格式錯誤。請重新整理此頁面後再操作一次。"});
        }
    }

    next();
}

/**
 * 確認投票陣列中的每一項元素是否皆正確地對應到現有的候選主題上，
 * 若有，則儲存投票結果、標示使用者為「已投票」，並回送成功訊息頁面；
 * 若無，則回送錯誤訊息。
 * @param {Express.Request} req Express的Request物件。
 * @param {Express.Response} res Express的Response物件。
 */
function CheckNewTheme_SaveAndResponse(req, res) {
    let user = req.user;                                        // 取得當前使用者資料
    let username = user.username;                               // 取得使用者名稱
    let selections = req.body ? req.body.selections : null;     // 取得使用者所選擇的主題

    // 逐步地邊檢查邊更新選票計數
    NewTheme.find({})
        .sort({ "createdTime": 1 })
        .exec((err, newThemeDocs) => {
            if (err) return res.json(GeneralServerErrorResponse);
            let docsLength = newThemeDocs.length;
            let selLength = selections.length;

            // 逐一檢查選票清單中的每項元素值是否在選擇範圍內(也就是介於 0 ~ newThemeDocs.length - 1 之間)
            // 檢查「小於0」的部分已經在上面檢查過了。
            // 如果是的話，則將使用者姓名加入至指定的候選主題中；若否則直接回送錯誤訊息
            for (let sel of selections) {
                if (sel < docsLength) {
                    newThemeDocs[sel].votes.push(username);
                }
                else {
                    res.json({isOK: false, field: "SERVER", message: "傳送的選票資料錯誤。請重新整理此頁面後再操作一次。"});
                    return;
                }
            }
            
            let index = 0;      // 定義index變數，存放目前儲存的第index個資料
            // 定義循環儲存使用的函式。因為儲存(save)的成功與否訊息是以回呼的方式來呈現的，所以寫成遞迴形式的回呼函式。
            function SaveMultipleDocs(err) {
                if (err) return req.json(GeneralServerErrorResponse);
                // 若儲存動作尚未完成，則遞增index，並將第index個資料儲存
                if (index < selLength) {
                    newThemeDocs[selections[index]].save(SaveMultipleDocs);
                    index += 1;
                }
                else {
                    // 更新使用者資料，標示使用者已經完成票選並儲存使用者資料
                    user.hasVotedNewTheme = true;
                    user.save((err) => {
                        if (err) return res.json(GeneralServerErrorResponse);

                        // 以上的動作皆執行完成、無錯誤之後，回送轉跳頁面網址
                        req.session.successfullyVotedNewTheme = true;
                        res.json({isOK: true, url: "/votetheme/success"});
                    });
                }
            }
            
            // 只儲存有更動的部分。也就是selections中的每一項元素，作為newThemeDocs的索引值
            // 然後再進行回存的動作。
            newThemeDocs[selections[index]].save(SaveMultipleDocs);
        }
    );
}

/**
 * 當使用者將主題票選的選擇結果傳送至伺服端的處理。
 */
router.post("/votetheme", CheckUserBasic, CheckAndModifySelectionField, CheckNewTheme_SaveAndResponse);

/**
 * 當成功完成主題票選之後的訊息頁面。
 */
router.get("/votetheme/success", (req, res) => {
    // 若使用者有登入 且 有被標記successfullyVotedNewTheme，則顯示轉跳頁面。
    if (req.user && req.session.successfullyVotedNewTheme) {
        delete req.session.successfullyVotedNewTheme;

        dataRender.DataRender("message_form", req.url, req.session, (err, dataObj) => {
            if (err) {
                res.setHeader("Content-Type", "text/plain; charset=utf-8");
                res.status(500);
                res.end("Server side error 500 : " + err);
            }
            else {
                res.render("message_form", dataObj);
            }
        });
    }
    else {
        res.redirect("/");
    }
});

module.exports = router;