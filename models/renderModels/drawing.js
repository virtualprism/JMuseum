
const User = require("../mongooseSchemas/User");
const Painting = require("../mongooseSchemas/Painting");
const Participation = require("../mongooseSchemas/Participation");

/** 預設的新畫作基本資料。 */
const defaultPaintingData = {
    id: null,
    paintingName: "",
    description: "",
    tags: [],
    viewAuthority: 0,
    createdTime: "無",
    lastModified: "無",
    activity: null,
    isFinished: false,
    isLocked: false
};

/**
 * 頁面「繪圖創作」的插值函式。
 * @param {BasicLayout} renderData 基本插值資料物件。
 * @param {string} route 路由路徑。
 * @param {Express.Session} session Express的Session物件。
 * @param {CallbackFunction} callback 回呼函式。
 */
function DrawingRender(renderData, route, session, callback) {
    let paintingId = route.substr(9);
    let datas = renderData.datas;
    // 若使用者有登入
    if (renderData.hasLogin) {
        // 先尋找使用者資料
        User.findOne({"username": renderData.username})
            .select("autoSaveEnable tags paintings")
            .populate({ path: "paintings", select: { "id": 1 } })
            .exec((err, userDocs) => {
                if (err) return callback(err, null);
                // 先將使用者的自動儲存設定、所有標填上
                datas.isAutoSave = userDocs.autoSaveEnable;
                datas.userTags = userDocs.tags;

                // 若沒有指定圖畫ID，將預設的畫作資料填上後回呼。
                if (!paintingId) {
                    datas.painting = defaultPaintingData;
                    return callback(null, true);
                }

                // 若該圖畫不屬於使用者的話，就回乎錯誤Error_PaintingNotExist。
                if (!userDocs.IsPaintingsOwner(paintingId)) {
                    return callback(Painting.GetError_PaintingNotExist(), null);
                }
                
                // 若該圖畫屬於使用者，則將目標畫作的基本資料填入，然後回呼true。
                Painting.GetDrawingPageInfoById(paintingId, (err, paintingInfo) => {
                    if (err) return callback(err, null);
                    datas.painting = paintingInfo;
                    callback(null, true);
                });
            }
        );
    }
    // 若使用者沒有登入
    else {
        datas.isAutoSave = false;
        datas.userTags = [];
        datas.painting = defaultPaintingData;
        callback(null, true);
    }
    
}

module.exports.Render = DrawingRender;