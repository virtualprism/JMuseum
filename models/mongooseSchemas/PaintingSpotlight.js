const mongoose = require("mongoose")
const Schema = mongoose.Schema;

/**
 * 回呼函式，表示是否成功，並回傳物件。
 * @callback CallbackFunction
 * @param {Object} err 表示是否失敗。
 * @param {Object} obj 表示回呼的物件。
 */

/**
 * 精選集的模板定義。
 * @property {String} relation 表示此精選集的所屬。如首頁的精選集、藝廊的精選輯。
 * @property {Schema.Types.ObjectId[]} paintings 表示此精選集所有連接的圖畫。
 */
let PaintingSpotlightSchema = Schema({
    relation : {type : String, required : true},
    paintings : [{type : Schema.Types.ObjectId, ref : "Painting"}]
});

/**
 * 建立一個新的精選集。
 * @param {Object} data 包含要設定精選輯的資料。
 * @param {function} callback 回呼函式。
 */
PaintingSpotlightSchema.statics.createNewPaintingSpotlight = function (data, callback) {
    let newPaintingSpotlight = { relation : data.relation, paintings : data.paintings };
    newPaintingSpotlight.save((err, paintingSpotlight) => {
        if (err)
            callback(err, null);
        else
            callback(null, paintingSpotlight._id);
    });
};

/**
 * 指定一個精選集，將新畫作加入進去。
 * @param {string} collName 要加入新畫作的精選集。
 * @param {objectId} painting 要加入的新畫作的Id。
 * @param {function} callback 回呼函式(Error, IsSuccess)。
 */
PaintingSpotlightSchema.statics.addNewPaintingToCollection = function (collName, painting, callback) {
    this.findOne({relation : collName}, (err, obj) => {
        if (err) {
            callback(err, null);
            return;
        }
        obj.paintings.push(painting);
        obj.save((err, RObj) => {
            callback(err, RObj != null && RObj != undefined);
        });
    });
};

/**
 * 取得畫作展示所要的資訊
 * @param {string} collName 精選集的名稱
 * @param {function} callback 回呼函式(Error, IsSuccess)。
 */
PaintingSpotlightSchema.statics.GetCarouselInfo = function (collName, callback) {
    let query = {path : "paintings", select : {links : 1, name : 1, description : 1, artist : 1}};
    this.findOne({"relation" : collName}).populate(query).exec(callback);
};

module.exports = mongoose.model("PaintingSpotlight", PaintingSpotlightSchema);