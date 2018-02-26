
const PaintingSpotlight = require("../mongooseSchemas/PaintingSpotlight");
const Season = require("../mongooseSchemas/Season");

/**
 *  由DataRender所定義的基本差值物件。這裡僅列出必要的datas屬性
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
 * 繪圖展示上的簡短訊息。
 * @prop {string} links 此畫作的圖片連結。
 * @prop {string} name 此畫作的名稱。
 * @prop {string} description 此畫作的敘述。
 * @prop {string} artist 畫作的作者。
 */
interface PaintingInfo {
    links : string
    name : string,
    description : string,
    artist : string
}

/**
 * 表示畫作的參賽相關訊息。
 * @prop {number} rank 此畫作的名次。
 * @prop {string} artist 畫作的作者。
 * @prop {string} paintingName 畫作的名稱。
 * @prop {Date} postTime 此畫作的參賽時間。
 */
interface ParticipantInfo {
    rank : number,
    artist : string,
    paintingName : string,
    postTime : Date
}

/**
 * 有關主題的相關訊息。
 * @prop {number} order 主題與主題之間的識別號碼(用於版面先後排序用)。
 * @prop {string} title 主題的標題。
 * @prop {ParticipantInfo[]} participants 此主題的所有參賽畫作資訊。
 */
interface ThemeInfo {
    order : number,
    title : string,
    participants : ParticipantInfo[]
}

/**
 * 有關一季活動之中的相關訊息。
 * @prop {number} nth 表示目前是第nth季
 * @prop {ThemeInfo[]} 儲存這一季之中所有的活動。
 */
interface SeasonInfo {
    nth : number,
    themes : ThemeInfo[]
}

/**
 * 頁面「傑作藝廊」的插值函式。
 * @param {BasicLayout} renderData 基本插值物件。
 * @param {CallbackFunction} callback 回呼函式。傳回錯誤訊息或資料插值設定是否成功。
 */
function GalleryRender(renderData : BasicLayout, callback : CallbackFunction) : void {
    // 先取得傑作藝廊中的精選輯
    PaintingSpotlight.GetCarouselInfo("gallery", (err, carouselInfo) => {
        if (err || !carouselInfo) {
            callback(err, null);
            return;
        }
        renderData.datas.paintings = carouselInfo.paintings;
        // 再取得活動相關的訊息
        Season.GetGalleryNeedInfo((err, seasonsInfo) => {
            if (err){
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