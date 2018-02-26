/* 初始化 */
let canvas = null,
    mainColor = "black",
    subColor = "black",
    enableSubColor = true,
    brushSize = 16,
    strokeSize = 1;

let subColorDiv = $("div.sub-color-picker"),
    sizeGroupText = $("label#sizeGroupText"),
    strokeGroupText = $("label#strokeSizeGroupText");

let activedBrush = $("input#normalBrush"),
    drawingMethod = normalBrush_Drawing;

let paintingImage;

/* 事件處理簽署 */

if (!isFinished) {
    document.getElementById("resetCanvas").addEventListener("click", () => background(255));
    document.getElementById("mainColorPicker").addEventListener("change", changeColor);
    document.getElementById("subColorPicker").addEventListener("change", changeColor);
    document.getElementById("subColorPicker").addEventListener("click", e => e.stopPropagation() );   //防止按下按鈕時，會動到上一層的sub-color-picker
    document.querySelector("div.sub-color-picker").addEventListener("click", subColorDivClick);
    document.getElementById("sizeUp").addEventListener("click", () => changeBrushSize(1));
    document.getElementById("sizeDown").addEventListener("click", () => changeBrushSize(-1));
    document.getElementById("sizeUp10").addEventListener("click", () => changeBrushSize(10));
    document.getElementById("sizeDown10").addEventListener("click", () => changeBrushSize(-10));
    document.getElementById("strokeSizeUp").addEventListener("click", () => changeStrokeSize(1));
    document.getElementById("strokeSizeDown").addEventListener("click", () => changeStrokeSize(-1));
    document.getElementById("strokeSizeUp10").addEventListener("click", () => changeStrokeSize(10));
    document.getElementById("strokeSizeDown10").addEventListener("click", () => changeStrokeSize(-10));
    document.getElementById("normalBrush").addEventListener("click", changeBrushStyle);
    document.getElementById("slideBrush").addEventListener("click", changeBrushStyle);
    document.getElementById("featherBrush").addEventListener("click", changeBrushStyle);
    document.getElementById("furBrush").addEventListener("click", changeBrushStyle);
    document.getElementById("stampBrush").addEventListener("click", changeBrushStyle);
}

$("#msgDialog").on('show.bs.modal', () => { drawingEnable = false; });
$("#msgDialog").on('hidden.bs.modal', () => { drawingEnable = true; });

/* p5.js */

// 預初始化的作業
function preload() {
    if (paintingId) {
        paintingImage = loadImage("/db/paintings/" + paintingId + ".png");
    }
}

// 初始化畫布、畫布內容
function setup() {
    // 依瀏覽器特性調整畫布版面
    let isChrome = !!window.chrome && !!window.chrome.webstore;
    if (isChrome) {
        canvas = createCanvas(800, 450);
        canvas.windowWidth = 800;
        canvas.windowHeight = 450;  
        canvas.canvas.style = "width: 800px; height: 450px;";
    }
    else {
        canvas = createCanvas(800, 450);
    }
    // 將p5的canvas設定在canvasContainer之下
    canvas.parent("canvasContainer");

    // 若有設定 paintingId ..
    if (paintingId) {
        // .. 且有讀取到畫作影像，則將畫作影像繪製到畫布上
        if (paintingImage) {
            image(paintingImage, 0, 0, canvas.width, canvas.height);
        }
        // .. 若沒有讀取到影像，則顯示訊息
        else {
            $("#msgDialog_title").text("畫作讀取錯誤");
            $("#msgDialog_message").text("無法讀取到指定的畫作影像資料。請確認目前畫作是否所屬於您，或重新整理此頁面。");
            $('#msgDialog').modal('show');
        }
    }
    // 若沒有設定 paintingId ，則畫上空白畫布
    else {
        background(255);
    }
}

// p5.js 中循環繪圖的函式
function draw() {}

function mousePressed() {
    drawingMethod(true, false);
}

function mouseDragged() {
    drawingMethod(false, false);
}

function mouseReleased() {
    drawingMethod(false, true);
}

function isOutCanvas(x, y) {
    return (x < 0 || x > canvas.width) || (y < 0 || y > canvas.height);
}

/* 不同的繪圖模式: 筆刷、滑筆、燕筆 */
var brushMethods = {"normalBrush" : normalBrush_Drawing,
                    "slideBrush" : slideBrush_Drawing,
                    "featherBrush" : featherBrush_Drawing,
                    "furBrush" : furBrush_Drawing,
                    "stampBrush" : stampBrush_Drawing };
var drawingEnable = true;
var lastPosition = { X: 0, Y: 0};
var isSliding = false;
var lastSize, desizeSpeed;

//筆刷
function normalBrush_Drawing(isMousePressed) {
    if(isOutCanvas(mouseX, mouseY) || !drawingEnable) return;
    if (isMousePressed) lastPosition = { X: mouseX, Y: mouseY };
    strokeWeight(strokeSize);
    enableSubColor ? stroke(subColor) : noStroke();
    line(lastPosition.X, lastPosition.Y, mouseX, mouseY);
    lastPosition.X = mouseX;
    lastPosition.Y = mouseY;
}

//滑筆
function slideBrush_Drawing(isMousePressed, isMouseReleased) {
    if (isMousePressed) {
        if(isOutCanvas(mouseX, mouseY) || !drawingEnable) return;
        lastPosition = { X: mouseX, Y: mouseY };
        isSliding = true;
        setTimeout(slideBrush_Moving, 10);
    }
    else if(isMouseReleased) {
        isSliding = false;
    }
    else {
        isSliding = !isOutCanvas(lastPosition.X, lastPosition.Y);
    }
}
function slideBrush_Moving() {
    var dx = mouseX - lastPosition.X, dy = mouseY - lastPosition.Y;
    dx = Math.abs(dx) > 100 ? 2 * Math.sign(dx) : dx / 50;
    dy = Math.abs(dy) > 100 ? 2 * Math.sign(dy) : dy / 50;
    strokeWeight(strokeSize);
    enableSubColor ? stroke(subColor) : noStroke();
    line(lastPosition.X, lastPosition.Y, lastPosition.X + dx, lastPosition.Y + dy);
    lastPosition.X += dx;
    lastPosition.Y += dy;
    if (isSliding && drawingMethod == slideBrush_Drawing)
        setTimeout(slideBrush_Moving, 10);
}

//燕筆(燕尾筆)
function featherBrush_Drawing(isMousePressed) {
    if(isOutCanvas(mouseX, mouseY) || !drawingEnable) return;
    if (isMousePressed) {
        lastPosition = { X: mouseX, Y: mouseY };
        lastSize = strokeSize;
        desizeSpeed = strokeSize / 20;
        if(desizeSpeed < 0) desizeSpeed = 0.5;
    }
    else {
        strokeWeight(lastSize);
        enableSubColor ? stroke(subColor) : noStroke();
        line(lastPosition.X, lastPosition.Y, mouseX, mouseY);
        lastPosition.X = mouseX;
        lastPosition.Y = mouseY;
        if(lastSize > 0) lastSize = lastSize - 0.5;
    }
}

//刺筆
function furBrush_Drawing(isMousePressed) {
    if(isOutCanvas(mouseX, mouseY) || !drawingEnable) return;
    if (isMousePressed) {
        lastPosition = { X: mouseX, Y: mouseY };
    }
    else {
        var dx = mouseX - lastPosition.X, dy = mouseY - lastPosition.Y;
        dx = dx > 40 ? 2 : dx / 20;
        dy = dy > 40 ? 2 : dy / 20;
        strokeWeight(strokeSize);
        enableSubColor ? stroke(subColor) : noStroke();
        line(lastPosition.X, lastPosition.Y, mouseX, mouseY);
        lastPosition.X += dx;
        lastPosition.Y += dy;
    }
}

//印筆
function stampBrush_Drawing() {
    if(isOutCanvas(mouseX, mouseY) || !drawingEnable) return;
    strokeWeight(strokeSize);
    enableSubColor ? stroke(subColor) : noStroke();
    fill(mainColor);
    ellipse(mouseX, mouseY, brushSize, brushSize);
}



/* 繪圖板、工具區事件設定 */

/**
 * 當使用者點下外框顏色，表示是否啟用外框色的事件處理。
 * @param {DOMEvent} e 事件物件。
 */
function subColorDivClick(e) {
    enableSubColor = !enableSubColor;
    subColorDiv.css("backgroundColor", (enableSubColor ? "#cdffa5" : "#ffb6a4"));
    return false;
}

/**
 * 當使用者變更比刷顏色時的事件。
 * @param {DOMEvent} e 事件物件。
 */
function changeColor(e) {
    var target = e.target ? e.srcElement : e.target;
    if (target.id == "mainColorPicker")
        mainColor = color(target.value);
    else
        subColor = color(target.value);
}

/**
 * 變更比刷填滿的粗細大小。
 * @param {number} d 筆刷大小的變更量。
 */
function changeBrushSize(d) {
    if (brushSize + d < 1)   brushSize = 1;
    else if (brushSize + d > 128) brushSize = 128;
    else brushSize += d;
    sizeGroupText.text("填色大小 " + brushSize);
}

/**
 * 變更比刷外框的粗細大小。
 * @param {number} d 筆刷大小的變更量。
 */
function changeStrokeSize(d) {
    if (strokeSize + d < 1)   strokeSize = 1;
    else if (strokeSize + d > 128) strokeSize = 128;
    else strokeSize += d;
    strokeGroupText.text("筆刷粗細 " + strokeSize);
}

//更變筆刷模式
function changeBrushStyle(e) {
    activedBrush.removeClass("active");
    activedBrush = $(e.target);
    activedBrush.addClass("active");
    drawingMethod = brushMethods[e.target.id];
}