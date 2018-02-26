const fileSystem = require("fs");

/**
 * 讀取伺服器狀態檔案。
 * @param {CallbackFunction} callback 回呼函式。
 */
function LoadStatus(callback) {
    fileSystem.readFile("status.json", {encoding: "utf8" }, (err, data) => {
        if (err) return callback(err, false);
        module.exports.status = JSON.parse(data);
        callback(null, true);
    });
}

/**
 * 儲存伺服器狀態檔案。
 * @param {CallbackFunction} callback 回呼函式。
 */
function SaveStatus(callback) {
    let data = module.exports.status;
    fileSystem.writeFile("status.json", JSON.stringify(data), { encoding: "utf8" }, callback);
}

module.exports.LoadStatus = LoadStatus;
module.exports.SaveStatus = SaveStatus;