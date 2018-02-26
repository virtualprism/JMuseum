
const router = require("express").Router();
const dataRender = require("../models/DataRender");

/**
 * 頁面「意見回饋」的路由處理。
 */
router.get("/feedback", (req, res) => {
    dataRender.DataRender("feedback", req.url, req.session, (err, dataObj) => {
        if (err) {
            res.setHeader("Content-Type", "text/plain");
            res.status(500);
            res.end("Server side error : 500\n" + err);
        }
        else {
            res.render("feedback", dataObj);
        }
    });
});

module.exports = router;