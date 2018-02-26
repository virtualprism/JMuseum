let PaintingSpotlight = require("../mongooseSchemas/PaintingSpotlight");
let Season = require("../mongooseSchemas/Season");
/**
 * 頁面「傑作藝廊」的插值函式。
 * @param {BasicLayout} renderData 基本插值物件。
 * @param {string} route 路由路徑。
 * @param {Express.Session} session Express的Session物件。
 * @param {CallbackFunction} callback 回呼函式。傳回錯誤訊息或資料插值設定是否成功。
 */
function GalleryRender(renderData, route, session, callback) {
    // 先取得傑作藝廊中的精選輯
    PaintingSpotlight.GetCarouselInfo("gallery", function (err, carouselInfo) {
        if (err || !carouselInfo) {
            callback(err, null);
            return;
        }
        renderData.datas.paintings = carouselInfo.paintings;
        // 再取得活動相關的訊息
        Season.GetGalleryNeedInfo(function (err, seasonsInfo) {
            if (err) {
                callback(err, null);
            }
            else {
                renderData.datas.seasons = seasonsInfo;
                callback(err, true);
            }
        });
    });
}
module.exports.Render = GalleryRender;
