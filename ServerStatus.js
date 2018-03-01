const fileSystem = require("fs");

/**
 * 讀取伺服器狀態檔案。
 * @param {CallbackFunction?} callback 回呼函式。
 * @throws {TypeError} 若傳入callback的參數不為Function或undefined，則擲出「型別錯誤」。
 * @return {undefined | Promise} 若沒有傳入回呼函式，則會回傳Promise。
 */
function LoadStatus(callback) {
    if (callback instanceof Function) {
        fileSystem.readFile("status.json", {encoding: "utf8" }, (err, data) => {
            if (err) return callback(err, false);
            module.exports.status = JSON.parse(data);
            callback(null, true);
        });
    }
    else if (callback === undefined) {
        return new Promise((res, rej) => {
            fileSystem.readFile("status.json", {encoding: "utf8" }, (err, data) => {
                if (err) return rej(err);
                module.exports.status = JSON.parse(data);
                res(true);
            });
        })
    }
    else {
        throw new TypeError("First argument must be callback function or undefined.");
    }
}

/**
 * 儲存伺服器狀態檔案。
 * @param {CallbackFunction?} callback 回呼函式。
 * @throws {TypeError} 若傳入callback的參數不為Function或undefined，則擲出「型別錯誤」。
 * @return {undefined | Promise} 若沒有傳入回呼函式，則會回傳Promise。
 */
function SaveStatus(callback) {
    let data = module.exports.status;
    if (callback instanceof Function) {
        fileSystem.writeFile("status.json", JSON.stringify(data), { encoding: "utf8" }, callback);
    }
    else if (callback === undefined) {
        return new Promise((res, rej) => {
            fileSystem.writeFile("status.json", JSON.stringify(data), { encoding: "utf8" }, err => err ? rej(err) : res());
        });
    }
    else {
        throw new TypeError("First argument must be callback function or undefined.");
    }
}

module.exports.LoadStatus = LoadStatus;
module.exports.SaveStatus = SaveStatus;