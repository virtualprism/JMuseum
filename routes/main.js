
const User = require("../models/mongooseSchemas/User");

const router = require("express").Router();
const pug = require("pug");
const passport = require("passport");
const LocalStrategy = require('passport-local').Strategy;
const multer = require("multer");
const dataRender = require("../models/DataRender");

// 序列化: 在第一次驗證之後，session皆不會保留驗證訊息，因此取得user.id
passport.serializeUser(function(user, done) {
    done(null, user._id);
});

// 反序列化: 用user.id來取得資料庫中的指定資料
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

/**
 * 定義在「登入」頁面，使用者進行登入、傳送帳號密碼時所做的驗證策略。
 */
passport.use("login" ,new LocalStrategy({
    usernameField: "username",
    passwordField: "password"
}, function (username, password, done) {
    User.AccountComparison(username, password, (err, user) => {
        if (err) return done(err);
        if (!user)
            return done(null, false, {message: "使用者名稱或密碼錯誤。"});
        else
            return done(null, user);
    });
}));

/**
 * 頁面「首頁」的路由處理。
 */
router.use(require("./index"));

/**
 * 頁面「傑作藝廊」的路由處理。
 */
router.use(require("./gallery"));

/**
 * 頁面「畫作主題」的路由處理。
 */
router.use(require("./theme"));

/**
 * 頁面「繪圖創作」的路由處理。
 */
router.use(require("./drawing"));

/**
 * 頁面「意見回饋」的路由處理。
 */
router.use(require("./feedback"));

/**
 * 註冊、登入與登出的相關頁面與處理。
 */
router.use(require("./gate"));

/**
 * 頁面「展示藝廊」的路由處理。
 */
router.use(require("./showcase"));

/**
 * 頁面「投稿主題」的路由處理。.
 */
router.use(require("./submit_theme"));

/**
 * 頁面「主題票選」的路由處理。
 */
router.use(require("./vote_theme"));

/**
 * 頁面「個人頁面」與「編輯個人資料」的路由處理。
 */
router.use(require("./personal_page"));

/**
 * 頁面「撰寫站內訊息」的路由處理。
 */
router.use(require("./write_sitemail"));

module.exports = router;