const fileSystem = require("fs");

const User = require("../models/mongooseSchemas/User");
const Painting = require("../models/mongooseSchemas/Painting");

const router = require("express").Router();
const Jimp = require("jimp");
const uuid = require("uuid/v4");
const dataRender = require("../models/DataRender");

/** 畫作儲存時，通用的伺服器錯誤回應訊息。 */
const GeneralSavingErrorMessage = { isOK: false, field: "SERVER", message: "伺服器內部錯誤，請稍後再嘗試儲存。" };

/**
 * 頁面「繪圖創作」的路由處理。
 */
router.get(["/drawing", "/drawing/:users_painting_id"], (req, res) => {
    dataRender.DataRender("drawing", req.url, req.session, (err, dataObj) => {
        // 若找不到相對應的圖畫，則跳轉到指定的訊息頁面。
        if (Painting.IsError_PaintingNotExist(err)) {
            req.session.painting_not_exist = true;
            res.redirect("/painting_not_exist");
        }
        else if (err) {
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.status(500);
            res.end("Server side error 500 : " + err);
        }
        else {
            res.render("drawing", dataObj);
        }
    });
});


/** 確認字串資料流中的格式是否為png圖像(image/png)，且為base64格式。 */
const regexCheckType = /^data:image\/png;base64,/;

/**
 * 檢查使用者是否有登入。若有登入，則進行下一步處理；若無，則回送尚未登入的訊息至客戶端。
 * @param {Express.Request} req Express的Request物件。
 * @param {Express.Response} res Express的Response物件。
 * @param {Function} next 導向函式。
 */
function CheckLogin(req, res, next) {
    res.setHeader("Content-Type", "application/json");

    // 先檢驗使用者是否登入，若有登入則再進行下一步。
    if (req.session.passport && req.session.passport.user) {
        next();
    }
    // 若沒有登入，則回送未登入的訊息。
    else {
        res.send({isOK: false, field: "SERVER", message: "您尚未登入，請先登入後再執行操作。"});
    }
}

/**
 * 檢查畫作作品的「畫作名稱」、「敘述」與「訪問權限」的內容是否正確。若正確則進行下一步；若無，則回送錯誤訊息至客戶端。
 * @param {Express.Request} req Express的Request物件。
 * @param {Express.Response} res Express的Response物件。
 * @param {Function} next 導向函式。
 */
function CheckBasicPaintingInfo(req, res, next) {

    // 驗證「畫作名稱」
    req.checkBody("name")
       .notEmpty()
       .withMessage("請在「畫作名稱」上為你的作品命名。")
       .matches(/^([^<>\&"']{1,64})$/)
       .withMessage("請在「畫作名稱」上輸入1~64字的作品名稱，其中不可包含「<>&\"'」非法字元。");
    
    // 驗證「敘述」
    req.checkBody("description")
       .notEmpty()
       .withMessage("請為您的作品寫上1~300字間的敘述。")
       .matches(/^([^<>\&"']{1,300})$/)
       .withMessage("作品敘述中不可包含「<>&\"'」非法字元。");
    
    // 驗證「訪問權限」
    req.checkBody("view_authority")
       .notEmpty()
       .withMessage("在作品「訪問權限」中，您必須選擇其中一種權限，決定其他使用者對此作品的能見度。")
       .isInt({min: 0, max: 2})
       .withMessage("作品「訪問權限」的權限值必須為0~2之間。");
    
    // 取得以上的驗證結果
    req.getValidationResult().then(result => {
        let errors = result.mapped();
        // 若驗證結果為無任何錯誤，則繼續驗證剩下的「標籤」清單與圖畫影像
        if (result.isEmpty()) {
            next();
        }
        // 若有錯誤，則將結果回傳
        else {
            let firstErr = Object.values(errors)[0];
            res.send({isOK: false, field: firstErr.param, message: firstErr.msg});
        }
    });
}

/**
 * 檢查畫作作品的「標籤」清單。若正確則進行下一步；若無，則回送錯誤訊息至客戶端。
 * @param {Express.Request} req Express的Request物件。
 * @param {Express.Response} res Express的Response物件。
 * @param {Function} next 導向函式。
 */
function CheckPaintingsTags(req, res, next) {
    let user_id = req.session.passport.user;    // 取得使用者的_id

    // 尋找目標使用者
    User.findOne({"_id": user_id})
        .populate({ path: "paintings", select: { "id": 1, "isFinished": 1, "isLocked": 1 } })
        .exec((err, userDocs) => {
            if (err) return res.send(GeneralSavingErrorMessage);
            // 檢查畫作的標籤是否接在使用者的定義之下
            if (userDocs.IsInTagsList(req.body.taglist)) {
                req.session.userDocs = userDocs;
                next();
            }
            // 若否，則傳回錯誤訊息
            else {
                res.send({isOK: false, field: "taglist", message: "有一至多個被選取的標籤在作品「標籤」清單中，並未在您所定義的標籤清單中。"});
            }
        }
    );
}

/**
 * 檢查畫作資訊是否正確。若處理完成正確無誤，則導向下一個處理程序；若有錯誤則回送錯誤訊息至客戶端。
 * @param {Express.Request} req Express的Request物件。
 * @param {Express.Response} res Express的Response物件。
 * @param {Function} next 導向函式。
 */
function CheckPaintingInfo(req, res, next) {
    let body = req.body;                        // 資料主體
    let userDocs = req.session.userDocs;        // 取得資料庫之使用者資料
    let responseMsg = {isOK: false};            // 定義回送訊息包
    let img_id  = body.id;                      // 取得畫作的id
    let imgData = body.painting_image;          // 取得圖片資料

    delete req.session.userDocs;

    // 若畫作id存在 且 該畫作不為使用者所有的畫作，則回送錯誤訊息
    if (img_id && !userDocs.IsPaintingsOwner(img_id)) {
        res.send({isOK: false, field: "id", message: "此畫作id無法在您的作品集中找到。您目前所繪製的作品並不屬於您的。"});
        return;
    }

    // 接下來檢查圖畫作品是否符合指定的格式
    if (regexCheckType.test(imgData)) {
        let base64Data = imgData.replace(/^data:image\/png;base64,/, "");
        let dataBuffer = Buffer.from(base64Data, "base64"); //new Buffer(base64Data, "base64");
        
        // 以Buffer的方式讀取Base64的影像檔案
        Jimp.read(dataBuffer, (err, image) => {
            if (err) return res.send({isOK: false, field: "painting_image", message: "無法解析傳送至伺服端的圖畫影像，您是否是以非正當的方式儲存圖畫呢？若有問題請回饋給我們。"});

            // 檢查圖畫影像的長寬比例是否正確
            if (image.bitmap.width === 800 && image.bitmap.height === 450) {
                // 將必要的資料存在Session中之後，在呼叫next()導向下一個處理。
                req.session.userDocs = userDocs;
                req.session.image = image;
                next();
            }
            // 若不正確則回送錯誤訊息
            else {
                res.send({isOK: false, field: "painting_image", message: "傳送至伺服端的圖畫之長寬大小與規定不符。您是否是以非正當的方式儲存圖畫呢？請以正確的方式儲存。"});
            }
        });
    }
    // 若不符合指定格式，則回送錯誤訊息
    else {
        res.send({isOK: false, field: "painting_image", message: "傳送的圖畫影像格式與規定不符。您是否是以非正當的方式儲存圖畫呢？請以正確的方式儲存。"});
    }
}

/**
 * 儲存畫作影像與資料。若成功則，則將成功訊息回送至客戶端；若失敗，則同樣將錯誤訊息回送。
 * 呼叫此處理函式時，req.session中必須包含讀取後的使用者資料(userDocs)、圖畫影像資料物件Jimp(image)，否則會出錯。
 * @param {Express.Request} req Express的Request物件。
 * @param {Express.Response} res Express的Response物件。
 * @param {Function} next 導向函式。
 */
function SavingPaintingAndResponse(req, res, next) {
    let userDocs = req.session.userDocs;
    let image = req.session.image;

    delete req.session.userDocs;
    delete req.session.image;

    // 檢查使用者的畫作ID，若存在則更新；不存在則新增
    if (req.body.id)
        UpdatePaintingInfo(res, req.body, image, false);    // 若畫作已存在，則更新其資訊
    else
        CreateNewPainting(res, req.body, userDocs, image, false);   // 若為新畫作，則加入新資料至Painting並連結至User。
}

/**
 * 路由「POST: /drawing/save」的一連串處理中，為最後儲存的部分。
 * 對畫作做「Painting資料更新」與「更新圖畫影像檔案」的動作。
 * @param {Express.Response} res Express的Response物件。
 * @param {Object} body Express的資料主體(body)。
 * @param {User} userDocs 使用者資料(Mongoose)。
 * @param {Jimp.Jimp} image 圖畫影像檔案。
 * @param {boolean} isFinish 是否要完成圖畫。
 */
function UpdatePaintingInfo(res, body, image, isFinish) {
    let lastModified = new Date();          // 取得目前的時間日期
    body.lastModified = lastModified;       // 更新「最後修改時間」欄位
    body.isFinished = isFinish;             // 為資料主體添上 isFinished = false 屬性，以符合輸入的要求。

    Painting.UpdateInfoById(body, body.id, image, (err, result) => {
        // 若有錯誤，則檢查錯誤為何種型態。
        if (err) {
            if (Painting.IsError_PaintingHasFinished(err)) {
                res.send({isOK: false, field: "SERVER", message: "此畫作狀態已為「完成」狀態，無法再二次「完成」此畫作。"});
            }
            else if (Painting.IsError_PaintingIsLocked(err)) {
                res.send({isOK: false, field: "SERVER", message: "此畫作已被鎖定，無法對其做任何更改。"});
            }
            else if (Painting.IsError_PaintingNotExist(err)) {
                res.send({isOK: false, field: "SERVER", message: "指定的畫作並不存在。請檢查目前畫作是否正確或是否屬於您的。"});
            }
            else {
                console.log(err);
                res.send(GeneralSavingErrorMessage);
            }
            return;
        }

        // 更新、儲存成功，將成功訊息回送至客戶端。若為完成畫作，則傳送轉跳頁面網址。
        if (isFinish)
            res.send({isOK: true, url: "/painting_finished"});
        else
            res.send({isOK: true, id: body.id, lastModified: result.lastModified.toLocaleString(), message: "已成功儲存了您的畫作!"});
    });
}

/**
 * 路由「POST: /drawing/save」的一連串處理中，為最後儲存的部分。
 * 對新的畫作做「Painting資料庫新增資料」、「將新增的Painting資料連接User」與「儲存影像檔案」的動作。
 * @param {Express.Response} res Express的Response物件。
 * @param {Object} body Express的資料主體(body)。
 * @param {User} userDocs 使用者資料(Mongoose)。
 * @param {Jimp.Jimp} image 圖畫影像檔案。
 * @param {boolean} isFinish 圖畫是否完成。
 */
function CreateNewPainting(res, body, userDocs, image, isFinish) {
    // 定義新畫作的基本資訊物件
    let newPaintingData = {
        name: body.name,
        description: body.description,
        artist: userDocs.username,
        tags: body.taglist,
        viewAuthority: body.view_authority,
        isFinished: isFinish
    };

    try {
    // 以 newPaintingData 來建立新畫作資料
    Painting.createNewPainting(newPaintingData, (err, result) => {
        if (err) {
            console.log(err);
            return res.send(GeneralSavingErrorMessage);
        }

        let imageFileName = "./db/paintings/" + result.id + ".png"; // 定義儲存的檔案名稱
        userDocs.paintings.push(result._id);                        // 將畫作id增加至使用者資料的paintings中

        // 以定義的檔案名稱 imageFileName 將影像儲存
        image.write(imageFileName, (err) => {
            if (err) return res.send(GeneralSavingErrorMessage);

            // 儲存使用者資料
            userDocs.save((err) => {
                if (err) {
                    console.log(err);
                    return res.send(GeneralSavingErrorMessage);
                }

                // 所有資料儲存成功，回送成功訊息。若為完成畫作，則送出跳轉頁面網址。
                if (isFinish)
                    res.send({isOK: true, url: "/painting_finished"});
                else
                    res.send({isOK: true, id: result.id, lastModified: result.lastModified.toLocaleString(), message: "已成功儲存了您的新畫作!"});
            });
        });
    });
    } catch (ex) {
        console.log(ex);
    }
}

/**
 * 在頁面「繪圖創作」下，客戶端傳送「畫作儲存」的相關資料至伺服端時的處理。
 */
router.post("/drawing/save", CheckLogin, CheckBasicPaintingInfo, CheckPaintingsTags, CheckPaintingInfo, SavingPaintingAndResponse);

/**
 * 確認畫作是否已經有建立、儲存過一次。若有則繼續接下來的儲存動作；若無則回送訊息。
 * @param {Express.Request} req Express的Request物件。
 * @param {Express.Response} res Express的Response物件。
 * @param {Function} next 導向函式。
 */
function CheckHaveCreatedPainting(req, res, next) {
    if (req.body.id) {
        next();
    }
    else {
        res.send({isOK: false, field: "SERVER", message: "此為新建立的畫作，請先手動儲存過一次後，再啟用「自動儲存」功能。"});
    }
}

/**
 * 處理「自動儲存」的處理，
 */
router.post("/drawing/autosave", CheckLogin, CheckHaveCreatedPainting, CheckBasicPaintingInfo, CheckPaintingsTags, CheckPaintingInfo, SavingPaintingAndResponse);

/**
 * 路由「POST: /drawing/save」的一連串處理中，為最後儲存的部分。
 * 對畫作做「Painting資料更新」與「更新圖畫影像檔案」的動作。此次
 * @param {Express.Request} req Express的Request物件。
 * @param {Express.Response} res Express的Response物件。
 * @param {Function} next 導向函式。
 */
function FinishPainting(req, res, next) {
    let userDocs = req.session.userDocs;
    let image = req.session.image;

    delete req.session.userDocs;
    delete req.session.image;

    // 檢查使用者的畫作ID，若存在則更新；不存在則新增
    if (req.body.id)
        UpdatePaintingInfo(res, req.body, image, true);    // 若畫作已存在，則更新其資訊
    else
        CreateNewPainting(res, req.body, userDocs, image, true);   // 若為新畫作，則加入新資料至Painting並連結至User。
}

/**
 * 在頁面「繪圖創作」下，客戶端傳送「完成畫作」的相關資料至伺服端時的處理。
 */
router.post("/drawing/finish", CheckLogin, CheckBasicPaintingInfo, CheckPaintingsTags, CheckPaintingInfo, FinishPainting);

/**
 * 在頁面「繪圖創作」下，成功「完成畫作」動作之後的跳轉頁面。
 */
router.get("/painting_finished", (req, res) => {
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
});

/**
 * 找不到指定的畫作作品時的轉跳頁面。
 */
router.get("/painting_not_exist", (req, res) => {
    if (req.session.painting_not_exist) {
        delete req.session.painting_not_exist;  // 刪除標記
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

/**
 * 確認指定的畫作屬於使用者。若要近一步檢查大小，請使用CheckPaintingInfo函式檢查。
 * @param {Express.Request} req Express的Request物件。
 * @param {Express.Response} res Express的Response物件。
 * @param {Function} next 導向函式。
 */
function CheckPaintingBelongsToUser(req, res, next) {
    let user_id = req.session.passport.user;    // 取得使用者的_id
    let paintingId = req.body.id;               // 取得指定要刪除的圖畫id

    // 若沒有指定畫作Id，則回送錯誤
    if (!paintingId) {
        res.send({isOK: false, field: "id", message: "沒有指定所要刪除的圖畫Id。"});
        return;
    }
    
    User.findOne({"_id": user_id})
        .populate({ path: "paintings", select: { "id": 1 } })
        .exec((err, userDocs) => {
            if (err) return res.send(GeneralSavingErrorMessage);
            if (!userDocs) return callback({isOK: false, field: "SERVER", message: "找不到使用者資料。請重新登入再嘗試，或請聯繫我們。"});

            // 檢查指定的畫作Id是否為使用者擁有。若是，則繼續下一步驟；若否，則回送錯誤訊息。
            if (userDocs.IsPaintingsOwner(paintingId)) {

                // 由於userDocs.paintings中的每一項皆是ObjectId物件，無法直接透過Array提供的indexOf與splice來刪除
                // 因此只能一個個比較後再刪除
                let paintingList = userDocs.paintings;
                let length = paintingList.length;
                for (let i = 0; i < length; i++) {
                    // 若第i個畫作Id與paintingId相同，則刪除其。
                    if (paintingList[i].equals(paintingId)) {
                        paintingList.splice(i, 1);
                        break;
                    }
                }

                // 儲存後進到下一步驟「刪除畫作資料」本身
                userDocs.save((err) => {
                    if (err) return res.send(GeneralSavingErrorMessage);
                    next();
                });
            }
            else {
                res.send({isOK: false, field: "id", message: "指定要刪除的畫作作品並不屬於您的，無法刪除。"});
            }
        }
    );
}

/**
 * 執行刪除畫作的動作，完成後將轉跳頁面網址送回。
 * @param {Express.Request} req Express的Request物件。
 * @param {Express.Response} res Express的Response物件。
 */
function DeletePainting_AndResponse(req, res) {
    let paintingId = req.body.id;               // 取的指定要刪除的圖畫Id

    Painting.findOne({"id": paintingId}, (err, paintingDocs) => {
        if (err) return res.send(GeneralSavingErrorMessage);
        if (!paintingDocs) return res.send({isOK: false, field: "SERVER", message: "找不到指定要刪除的畫作。請聯繫我們來解決此問題。"});
        let isJoinedActivity = paintingDocs.activity;       // 紀錄是否在參加過活動

        // 若畫作已被鎖定，則無法刪除畫作，回送錯誤訊息。
        if (paintingDocs.isLocked) {
            res.send({isOK: false, field: "id", message: "此畫作已被鎖定，無法進行刪除動作。"});
            return;
        }
        
        // 刪除與此畫作相關的「留言」、「評分」與「參與活動」資訊
        paintingDocs.RemoveAllReferenceInfo((err, isOK) => {
            if (err) return res.send(GeneralSavingErrorMessage);
            
            // 刪除圖畫影像
            fileSystem.unlink(global.__dirname + paintingDocs.links, (err) => { if (err) console.log(err); });

            // 刪除此畫作後，回送轉跳網址
            Painting.deleteOne({"_id": paintingDocs._id}, (err) => {
                if (err) return res.send(GeneralSavingErrorMessage);
                
                req.session.paintingDeleted = true;                 // 標記使用者已刪除畫作。有此標記，轉跳頁面才可以顯示
                if (isJoinedActivity)                               // 若使用者刪除的畫作有參加活動的話，在下個轉跳頁面中提醒使用者其畫作仍然會看得到
                    req.session.paintingDeleted_Activity = true;  
                res.send({isOK: true, url: "/painting_deleted"});
            });
        });
    });
}

/**
 * 使用者傳送「刪除畫作」的要求至伺服器。
 */
router.delete("/drawing/delete", CheckLogin, CheckPaintingBelongsToUser, DeletePainting_AndResponse);

/**
 * 使用者成功刪除畫作之後的轉跳頁面。
 */
router.get("/painting_deleted", (req, res) => {
    // 使用者有登入，且有被標記paintingDeleted，回應跳轉訊息頁面
    if (req.session.passport && req.session.passport.user && req.session.paintingDeleted) {
        delete req.session.paintingDeleted;     // 刪除標記
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
    // 否則跳轉到首頁
    else {
        res.redirect("/");
    }
});

module.exports = router;