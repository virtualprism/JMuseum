
const Season : any = require("../mongooseSchemas/Season");

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
 * 有關主題的相關訊息。
 * @prop {number} order 主題與主題之間的識別號碼(用於版面先後排序用)。
 * @prop {string} title 主題的標題。
 * @prop {string} narrative 主題的敘述。
 * @prop {string} imageURL 主題縮圖連結。
 * @prop {string} originator 主題發起人。
 * @prop {number} participantCount 投稿人數。
 * @prop {number} views 瀏覽此主題的人次數。
 * @prop {number} commentCount 主題中相關留言人數。
 */
interface ThemeInfo {
    order : number,
    title : string,
    narrative : string,
    imageURL : string,
    originator : string,
    participantCount : number,
    views : number,
    commentCount : number
}

/**
 * 有關一季活動之中的相關訊息。
 * @prop {number} nth 表示目前是第nth季
 * @prop {Date} endTime 表示該季的結束時間。在資料取得中只有上一季有這個欄位
 * @prop {ThemeInfo[]} 儲存這一季之中所有的活動。
 */
interface SeasonInfo {
    nth : number,
    endTime : Date,
    themes : ThemeInfo[]
}

/**
 * 頁面「畫作主題」的插值函式。
 * @param renderData 基本插值物件。
 * @param callback 回呼函式。
 */
function ThemeRender(renderData: BasicLayout, callback: CallbackFunction) : void
{
    // 先取得「畫作主題」頁面所需要的季資訊
    // 若出現錯誤，則回呼錯誤訊息；若取得成功，則回呼true已表示成功。
    Season.GetThemePageNeedInfo((err, seasonDatas) => {
        if (err) {
            callback(err, null);
            return;
        }
        renderData.datas = seasonDatas;
        callback(null, true);
    });
}

module.exports.Render = ThemeRender;