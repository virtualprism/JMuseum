let PaintingSpotlight = require("../mongooseSchemas/PaintingSpotlight");

/**
 *  由DataRender所定義的基本差值物件。這裡僅列出必要的datas屬性。
 */
interface BasicLayout {datas: any}

/**
 * A Callback function.
 * @callback CallbackFunction
 * @param {Object} err 錯誤資訊物件。
 * @param {Object} obj 成功時所回傳的物件。
 */
interface CallbackFunction { (err: Object, obj: Object) : void }

/**
 * Painting Information Interface
 */
interface PaintingInfo {
    links : string
    name : string,
    description : string,
    artist : string
}

/**
 * Data layout of index.
 */
 interface IndexLayout {
     paintings : PaintingInfo[]
}

/**
 * 取得首頁的插值資料。
 * @param {BasicLayout} renderData 插值物件。
 * @param {CallbackFunction} callback 回呼函式。
 */
function IndexRender(renderData : BasicLayout, callback : CallbackFunction) : void {
    PaintingSpotlight.GetCarouselInfo("index", (err, infos) => {
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
