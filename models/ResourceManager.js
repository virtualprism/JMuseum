const User = require("./mongooseSchemas/User");
const Painting = require("./mongooseSchemas/Painting");

const router = require("express").Router();

let sourceDir;

/**
 * 用於初始化的函式。
 * @param {string} sourceDirectory 被管理的資源的根目錄。
 */
function Initialize(sourceDirectory) {
    sourceDir = sourceDirectory;
    return router;
}

/**
 * 檢查使用者是否登入。如果已登入，則進行下一步；反之，則回送403狀態碼。
 * @param {Express.Request} req Express的Request物件。
 * @param {Express.Response} res Express的Response物件。
 * @param {Function} next 導向函式。
 */
function CheckUserLogin(req, res, next) {
    if (req.session.passport && req.session.passport.user) {
        next();
    }
    else {
        res.state(403).send("Forbidden");
    }
}

/**
 * 嘗試取得指定的圖畫影像。經過登入檢查之後，還要再檢查該項圖畫是否存在或屬於使用者。
 */
router.get("/db/paintings/:painting_file", (req, res) => {
    let user_id = (req.session.passport && req.session.passport.user) ? req.session.passport.user : null;
    let fileName = req.params.painting_file;                        // 取得URL參數中的檔案名稱
    let painting_id = fileName.substr(0, fileName.length - 4);      // 去掉後面的".png"

    // 檢查使用者是否有足夠的權限訪問此畫作
    Painting.CheckViewAuthority(painting_id, user_id, (err, result) => {
        if (err) {
            res.state(500).send("Internal Server Error");
            return;
        }
        // 若權限足夠，則將圖畫檔案送至客戶端；若無則回送403。
        if (result) {
            res.status(200).sendFile(sourceDir + "/paintings/" + fileName);
        }
        else {
            res.status(403).send("Forbidden");
        }
    });
});


module.exports = Initialize;