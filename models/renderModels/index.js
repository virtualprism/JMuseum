var PaintingSpotlight = require("../mongooseSchemas/PaintingSpotlight");
/**
 * 取得首頁的插值資料。
 * @param {BasicLayout} renderData 插值物件。
 * @param {string} route 路由路徑。
 * @param {Express.Session} session Express的Session物件。
 * @param {CallbackFunction} callback 回呼函式。
 */
function IndexRender(renderData, route, session, callback) {
    PaintingSpotlight.GetCarouselInfo("index", function (err, infos) {
        if (err) {
            callback(err, null);
        }
        else {
            renderData.datas = infos;
            callback(null, true);
        }
    });
}
module.exports.Render = IndexRender;
