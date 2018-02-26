
const router = require("express").Router();
const dataRender = require("../models/DataRender");

/**
 * 頁面「傑作藝廊」的路由處理。
 */
router.get("/gallery", (req, res) => {
    dataRender.DataRender("gallery", req.url, req.session, (err, dataObj) => {
        if (err) {
            res.setHeader("Content-Type", "text/plain");
            res.status(500);
            res.end("Server side error : 500\n" + err);
        }
        else {
            res.render("gallery", dataObj);
        }
    });
});

module.exports = router;