const fileSystem = require("fs");
const router = require("express").Router();
const multer = require("multer");
const Jimp = require("jimp");
const dataRender = require("../models/DataRender");

const NewTheme = require("../models/mongooseSchemas/NewTheme");

/**
 * 頁面「投稿主題」的路由處理
 */
router.get("/newtheme", (req, res) => {
    let user = req.user;
    // 如果使用者有登入
    if (user) {
        // 根據使用者是否已經有投稿過新主題，來決定要給出訊息頁面或「主題投稿」頁面
        let source = user.hasPostNewTheme ? "message_form" : "submit_theme";

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
    // 若使用者沒有登入，則重新導向到登入頁面
    else {
        res.redirect("/login");
    }
});

/**
 * 透過Multer建立一個「上傳者」物件，將圖片暫存在專案目錄下的"temp"資料夾中。
 * 最大檔案上傳量限制為1；檔案大小限制為128KB。
 */
const Uploader = multer({
    dest: "./temp",
    limits: { fileSize: 131072, files: 1 }
});

/**
 * 檢查由客戶端傳送過來的評分資料。經檢查後無錯誤則繼續至下一個程序；若有錯誤則回送錯誤訊息。
 * @param {Express.Request} req Express的Request物件。
 * @param {Express.Response} res Express的Response物件。
 * @param {Function} next 導向函式。
 */
function NewTheme_CheckTextField(req, res, next) {
    // 確認使用者是否有登入。若沒有登入，則回送錯誤訊息
    if (!req.user) {
        return res.json({isOK: false, field: "SERVER", message: "尚未登入。請登入後再執行投稿主題的動作。"});
    }
    // 確認使用者是否已有發起過主題。若有發起過主題，則回送錯誤訊息
    if (req.user.hasPostFeedback) {
        return res.json({isOK: false, field: "SERVER", message: "您已經投稿過主題，請在下一季時再進行投稿動作。"});
    }

    // 檢查「主題名稱」
    req.checkBody("theme")
       .notEmpty()
       .withMessage("「主題名稱」為必要填寫的欄位。請輸入您想要的主題名稱。")
       .isLength({max: 32, min: 1})
       .withMessage("請在欄位「主題名稱」中輸入1~32字間的主題名稱。")
       .matches(/^[^.<>/\\]+$/)
       .withMessage("欄位「主題名稱」中請勿包含「.<>/\\」非法字元。");

    // 檢查「敘述」
    req.checkBody("narrative")
       .notEmpty()
       .withMessage("「敘述」為必要填寫的欄位。請輸入對於此主題的相關說明。")
       .isLength({max: 100, min: 8})
       .withMessage("請在欄位「敘述」中輸入8~100字間的主題敘述。");
    
    // 取得驗證結果
    req.getValidationResult().then((result) => {
        let errors = result.mapped();
        if (result.isEmpty()) {
            next();
        }
        else {
            let firstErr = Object.values(errors)[0];
            res.json({isOK: false, field: firstErr.param, message: firstErr.msg});
        }
    });
}

/**
 * 檢查由客戶端傳送過來的評分資料。經檢查後無錯誤則繼續至下一個程序；若有錯誤則回送錯誤訊息。
 * @param {Express.Request} req Express的Request物件。
 * @param {Express.Response} res Express的Response物件。
 * @param {Function} next 導向函式。
 */
function NewTheme_CheckImage(req, res, next) {
    let file = req.file;

    // 若使用者沒有上傳圖片，則回送錯誤訊息
    if (!file) {
        return res.json({ isOK: false, message: "請選擇小於等於128KB，且類型為png或jpeg的正方形圖檔。" });
    }
    // 若使用者上傳的圖片檔案格式不為png或jpeg，則回送錯誤訊息。
    else if (file.mimetype != "image/png" && file.mimetype != "image/jpeg") {
        fileSystem.unlink(file.path, (err) => { if (err) console.log(err); });
        return res.json({ isOK: false, message: "選擇的活動圖示之檔案格式必須為png或jpeg。" });
    }

    // 讀取圖片，檢視其圖片是否為 1:1 比例
    Jimp.read(file.path, (err, img) => {
        if (err) return res.json({ isOK: false, message: "伺服器內部錯誤，請稍後再嘗試。" });

        // 若為正方形圖示，則繼續下一個程序
        if (img.bitmap.height == img.bitmap.width) {
            next();
        }
        // 若不是，則回送錯誤訊息
        else {
            res.json({ isOK: false, field: "image", message: "選擇的活動圖示其大小比例必須為1:1。" })
        }
    });
}

/**
 * 儲存新的活動資料並將成功訊息回送。
 * @param {Express.Request} req Express的Request物件。
 * @param {Express.Response} res Express的Response物件。
 */
function NewTheme_SaveDataAndResponse(req, res) {
    let body = req.body;        // 資料主體
    let file = req.file;        // 檔案訊息資料
    let newFileName = body.theme + (file.mimetype == "image/png" ? ".png" : ".jpg");    // 新檔案的檔案名稱
    let outURLPath = "/images/newtheme/" + newFileName;                                 // 對外的檔案路徑表示
    let newFilePath = "./public" + outURLPath;                                          // 新檔案的存擋路徑

    // 建立基本資料
    let data = {
        title: body.theme,
        narrative: body.narrative,
        image: outURLPath,
        sponsor: req.user.username
    };

    // 以基本資料建立新的主題
    NewTheme.createNew_NewTheme(data, (err, _id) => {
        // 若錯誤為「已有相同的主題名稱」，則回呼錯誤
        if (NewTheme.IsError_HaveSameThemeTitle(err))
            return res.json({isOK: false, field: "theme", message: "已經有其他使用者發起過相同的主題名稱。請換一個新的主題名稱。"});
        
        // 若為伺服器內部錯誤，則將通用訊息回呼
        if (err)
            return res.json({isOK: false, field: "SERVER", message: "伺服器內部錯誤，請稍後再嘗試。"});
        
        // 更新檔案名稱，並轉存至目標資料夾中
        fileSystem.copyFile(req.file.path, newFilePath, (err) => {
            if (err) return res.json({isOK: false, field: "SERVER", message: "伺服器內部錯誤，請稍後再嘗試。"});
            
            // 刪除在暫存區的圖片檔案
            fileSystem.unlink(req.file.path, (err) => { if (err) console.log(err); });
            
            req.user.hasPostNewTheme = true;                            // 將「是否有投稿過新主題」設為true。
            req.user.save((err) => { if (err) console.log(err); });     // 並將此使用者資料進行儲存
            req.session.newThemeSuccess = true;                         // 標記newThemeSuccess，給轉跳頁面判斷所用
            res.json({isOK: true, url: "/newtheme/successful"});
        });
    }); 
}

/**
 * 當使用者將新的主題資料送至伺服端時的處理。
 */
router.post("/newtheme", Uploader.single("image"), NewTheme_CheckTextField, NewTheme_CheckImage, NewTheme_SaveDataAndResponse);

/**
 * 當使用者成功投稿了新主題後的轉跳頁面。
 */
router.get("/newtheme/successful", (req, res) => {
    // 確認是否有登入，且有被標記newThemeSuccess。則傳送轉跳頁面訊息。
    if (req.user && req.session.newThemeSuccess) {
        delete req.session.newThemeSuccess; // 將標記給去除掉
        
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