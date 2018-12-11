const http = require("http");
const path = require('path');
const lineReader = require('readline').createInterface({input : process.stdin, output : process.stdout});
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const express = require("express");
const expressValidator = require('express-validator');
const session = require('express-session');
const passport = require('passport');
const flash = require("connect-flash");
const mongodb = require("mongodb");
const mongoose = require("mongoose");
const MongoStore = require('connect-mongo')(session);
const pug = require("pug");                             // *** Pug的版本為 2.0.0-beta6 ，原先所安裝的Pug無法使用"include" 與 "extended" 指令
const DDOS = require('ddos');

const ServerStatus = require("./ServerStatus");
const ResourceManager = require("./models/ResourceManager");
const ddos = new DDOS({burst:10, limit:15});

// 讀取伺服器狀態檔案
ServerStatus.LoadStatus((err) => { 
    console.log(err ? "Read server status file failed. Please confirm whether the file is in the root directory.\n" : 
                      "Server status file read.\n");
});

// 伺服與網頁應用的變數定義
var mongoConnection, database;
let port = 12010;
let app = express();

global.__dirname = __dirname;       // 在全域之下定義這個專案的根目錄路徑

// mongodb://localhost/JMuseum
// mongodb://sample:cake4you@ds157383.mlab.com:57383/dblab

// Connect to Database
mongoose.Promise = Promise;
mongoose.connect('mongodb://localhost/JMuseum', { useNewUrlParser: true });
mongoConnection = mongoose.connection;
mongoConnection.on('error', console.error.bind(console, 'connection error:'));
mongoConnection.once('open', function() {
    console.log("Connected to MongoDB.\n");
    database = mongoose.connection.db;
});

// Initialize Web Server Application
app.set("views", "./views");
app.set("view engine", "pug");
app.use("/", express.static(__dirname + "/public"));
app.use(bodyParser.json({ limit: "5mb" }));
app.use(bodyParser.urlencoded({ extended: false }));    // bodyParser的urlencoded 模組會與 formidable 相衝突
app.use(cookieParser());
app.use(expressValidator());
app.use(flash());
app.use(session({
    secret: "secret",
    cookie: { maxAge: null },
    resave: true,
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(ResourceManager(__dirname + "/db"));
app.use(ddos.express);

// Setting Server Routes
app.use("/", require("./routes/main"));

// Start Server
let server = http.createServer(app);
server.listen(port, () => {
    console.log("Server is listening on *:" + port + " ...\n");
});

// Terminal Controls
lineReader.on("line", require("./models/ServerControl")(ExitApplication));

// Process Events
function ExitApplication() {
    // 將文字介面輸入關閉
    lineReader.close();

    // 把伺服器關閉
    server.close(() => {
        console.log("Server closed ..\n");

        // 與MongoDB結束連線
        let disconnection = mongoose.connection.close().then(() => {
            console.log("MongoDB disconnected ..\n");
        });

        // 儲存伺服器狀態檔案
        let savingStatus = ServerStatus.SaveStatus()
            .then(() => console.log("Successfully saved server status file.\n"))
            .catch(() => console.log("Save server status file failed. Please confirm whether the file is in the root directory of this project.\n"));

        Promise.all([disconnection, savingStatus])
            .then(() => process.exit());
    });
}

process.on("exit", ExitApplication);