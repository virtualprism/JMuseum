const User = require("../models/mongooseSchemas/User");

const router = require("express").Router();
const dataRender = require("../models/DataRender");

/**
 * 頁面「首頁」的路由處理。
 */
router.get(["/", "/index"], (req, res) => {
    dataRender.DataRender("index", req.url, req.session, (err, dataObj) => {
        if (err) {
            res.setHeader("Content-Type", "text/plain");
            res.status(500);
            res.end("Server side error : 500");
        }
        else {
            res.render("index", dataObj);
        }
    });
});

module.exports = router;