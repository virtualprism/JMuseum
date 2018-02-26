/**
 * @typedef CPosition
 * @prop {number} X 平面座標上的X。
 * @prop {number} Y 平面座標上的Y。
 */
/**
 * 滑鼠狀態的列舉。
 * @readonly
 * @enum {number}
 */
const MouseStatus = Object.freeze({MouseDown: 0, Drawing: 1, MouseUp: 2, MouseMoving: 3});

/** @type {HTMLElement} */
let cvsCanvas = document.getElementById("cvsCanvas");   // 畫布(Canvas)的HTML物件

/** @type {CanvasRenderingContext2D} */
let context = cvsCanvas.getContext("2d");               // 操縱繪圖動作的相關函式集。

/** 以Id對應不同的筆刷模式。有: 筆刷、滑筆、燕筆、刺筆、印筆 */
let BrushMethods = {
    "normalBrush":  NormalBrush_Drawing,
    "slideBrush":   SlideBrush_Drawing,
    "featherBrush": FeatherBrush_Drawing,
    "furBrush":     FurBrush_Drawing,
    "stampBrush":   StampBrush_Drawing
};

/* ============================ 紀錄HTML物件 ============================ */
let sizeGroupText = document.getElementById("sizeGroupText");
let strokeSizeGroupText = document.getElementById("strokeSizeGroupText");

/* ======================== 紀錄繪圖工具的相關狀態 ======================== */
let isMouseDown = false;                                    // 紀錄滑鼠是否為壓下的狀態
let lastPosition = {X: 0, Y: 0};                            // 紀錄上一次的點的座標
let curPosition = {X: 0, Y: 0};                             // 紀錄目前的滑鼠座標位置
let brushWidth = 1;                                         // 紀錄目前使用者設定的筆刷大小
let fillWidth = 1;                                          // 紀錄目前使用者設定的填充大小
let strokeColor = "#000000";                                // 紀錄目前使用者所設定的比刷顏色
let fillColor = "#000000";                                  // 紀錄目前使用者所設定的填滿顏色
let activedBrush = document.getElementById("normalBrush");  // 紀錄目前在使用的比刷模式的HTML物件
let DrawingMethod = NormalBrush_Drawing;                    // 紀錄目前的繪畫模式

/* ============================== 簽署事件 ============================== */
cvsCanvas.addEventListener("mousedown", cvsCanvas_MouseDown);
cvsCanvas.addEventListener("mousemove", cvsCanvas_MouseMove, false);
cvsCanvas.addEventListener("mouseup", cvsCanvas_MouseUp, false);
document.getElementById("resetCanvas").addEventListener("click", ClearCanvas);
document.getElementById("normalBrush").addEventListener("click", ChangeBrushMethod);
document.getElementById("slideBrush").addEventListener("click", ChangeBrushMethod);
document.getElementById("featherBrush").addEventListener("click", ChangeBrushMethod);
document.getElementById("furBrush").addEventListener("click", ChangeBrushMethod);
document.getElementById("stampBrush").addEventListener("click", ChangeBrushMethod);
document.getElementById("mainColorPicker").addEventListener("change", ChangeColor, false);
document.getElementById("subColorPicker").addEventListener("change", ChangeColor, false);
document.getElementById("subColorPicker").addEventListener("click", e => e.stopPropagation() );   //防止按下按鈕時，會動到上一層的sub-color-picker
document.getElementById("sizeUp").addEventListener("click", () => ChangeFillSize(1));
document.getElementById("sizeDown").addEventListener("click", () => ChangeFillSize(-1));
document.getElementById("sizeUp10").addEventListener("click", () => ChangeFillSize(10));
document.getElementById("sizeDown10").addEventListener("click", () => ChangeFillSize(-10));
document.getElementById("strokeSizeUp").addEventListener("click", () => ChangeStrokeSize(1));
document.getElementById("strokeSizeDown").addEventListener("click", () => ChangeStrokeSize(-1));
document.getElementById("strokeSizeUp10").addEventListener("click", () => ChangeStrokeSize(10));
document.getElementById("strokeSizeDown10").addEventListener("click", () => ChangeStrokeSize(-10));

/**
 * 畫布初始化。
 */
if (paintingId) {
    let paintImg = document.createElement("img");
    paintImg.style = "display: none;";
    paintImg.onload = () => context.drawImage(paintImg, 0, 0, 800, 450);
    paintImg.src = "/db/paintings/" + paintingId + ".png";
    document.body.appendChild(paintImg);
}
else {
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, 800, 450);
    context.fill();
}

/**
 * 當「重置」按鈕按下之後，清除畫布。
 * @param {Event} event 事件物件。
 */
function ClearCanvas(event) {
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, 800, 450);
    context.fill();
}

/**
 * 變更筆刷模式。當筆刷模式按鈕按下時所做的處理。
 * @param {Event} event 事件物件。 
 */
function ChangeBrushMethod(event) {
    activedBrush.classList.remove("active");
    activedBrush = event.target;
    activedBrush.classList.add("active");
    DrawingMethod = BrushMethods[activedBrush.id];
}

/**
 * 變更顏色。當筆刷顏色或填充顏色按鈕按下時，並選取完顏色後的事件處理。
 * @param {Event} event 事件物件。 
 */
function ChangeColor(event) {
    let target = event.target ? event.srcElement : event.target;
    if (target.id == "mainColorPicker") {
        fillColor = target.value;
    }
    else {
        strokeColor = target.value;
    }
}

/**
 * 變更筆刷的粗細大小。
 * @param {number} value 變更量。
 */
function ChangeStrokeSize(value) {
    brushWidth += value;
    if (brushWidth > 128) brushWidth = 128;
    if (brushWidth < 1) brushWidth = 1;
    strokeSizeGroupText.innerText = "筆刷粗細 " + brushWidth;
}

/**
 * 變更填充的粗細大小。
 * @param {number} value 變更量。
 */
function ChangeFillSize(value) {
    fillWidth += value;
    if (fillWidth > 128) fillWidth = 128;
    if (fillWidth < 1) fillWidth = 1;
    sizeGroupText.innerText = "填色大小 " + fillWidth;
}

/**
 * 取得滑鼠在畫布中的位置。
 * @param {Event} event 事件物件。限定滑鼠動作相關的事件。
 * @return {Position} 目前游標的座標。
 */
function GetMousePosition(event) {
    let rect = cvsCanvas.getBoundingClientRect();
    return {X: event.clientX - rect.left, Y: event.clientY - rect.top};
}

/**
 * 當滑鼠在畫布上按下時，所觸發的事件。
 * @param {Event} event 事件物件。
 */
function cvsCanvas_MouseDown(event) {
    isMouseDown = true;
    DrawingMethod(event, MouseStatus.MouseDown);
}

/**
 * 當滑鼠在畫布上移動時，所觸發的事件。
 * @param {Event} event 事件物件。
 */
function cvsCanvas_MouseMove(event) {
    DrawingMethod(event, isMouseDown ? MouseStatus.Drawing : MouseStatus.MouseMoving);
}

/**
 * 當滑鼠在畫布上放開時，所觸發的事件。
 * @param {Event} event 事件物件。
 */
function cvsCanvas_MouseUp(event) {
    isMouseDown = false;
    DrawingMethod(event, MouseStatus.MouseUp);
}

/**
 * 在指定位置畫上圓。
 * @param {CPosition} pos 圓心位置。
 * @param {number} radius 圓的半徑。
 * @param {string?} color 顏色。
 */
function FillCircle(pos, radius, color) {
    if (color) context.fillStyle = color;
    context.beginPath();
    context.arc(pos.X, pos.Y, radius, 0, 2 * Math.PI);
    context.closePath();
    context.fill();
}

/**
 * 在指定兩個座標之間畫線。
 * @param {CPosition} posA 起點座標位置。
 * @param {CPosition} posB 終點座標位置。
 * @param {string?} color 顏色。
 */
function DrawLine(posA, posB, color) {
    if (color) context.strokeStyle = color;
    context.beginPath();
    context.moveTo(posA.X, posA.Y);
    context.lineTo(posB.X, posB.Y);
    context.closePath();
    context.stroke();
}

/**
 * 在指定坐標上繪製外內圓。
 * @param {CPosition} pos 圓心座標位置。
 * @param {number} radius 圓的半徑。
 * @param {string} strokeColor 外圓的顏色。
 * @param {string} fillColor 內圓的顏色。
 */
function StampCircle(pos, radius, strokeColor, fillColor) {
    if (strokeColor) context.strokeStyle = strokeColor;
    if (fillColor) context.fillStyle = fillColor;
    context.beginPath();
    context.arc(pos.X, pos.Y, radius, 0, 6.28);
    context.closePath();
    context.fill();
    context.stroke();
}

/**
 * 筆刷模式「筆刷」下的繪圖動作。
 * @param {Event} event 與滑鼠動作相關的事件物件。
 * @param {MouseStatus} status 滑鼠的狀態。
 */
function NormalBrush_Drawing(event, status) {
    switch(status) {
        case MouseStatus.MouseDown:
            lastPosition = GetMousePosition(event);
            context.lineWidth = brushWidth;
            context.strokeStyle = strokeColor;
            FillCircle(lastPosition, brushWidth / 2, strokeColor);
            break;
        case MouseStatus.Drawing:
            curPosition = GetMousePosition(event);
            DrawLine(lastPosition, curPosition);
            FillCircle(curPosition, brushWidth / 2);
            lastPosition = curPosition;
    }
}

/**
 * 筆刷模式「滑筆」下的繪圖動作。
 * @param {Event} event 與滑鼠動作相關的事件物件。
 * @param {MouseStatus} status 滑鼠的狀態。
 */
function SlideBrush_Drawing(event, status) {
    switch(status) {
        case MouseStatus.MouseDown:
            lastPosition = GetMousePosition(event);
            curPosition = lastPosition;
            context.lineWidth = brushWidth;
            context.strokeStyle = strokeColor;
            FillCircle(lastPosition, brushWidth / 2, strokeColor);
            setTimeout(SlideBrush_Chasing, 10);
            break;
        case MouseStatus.Drawing:
            curPosition = GetMousePosition(event);
    }
}
/**
 * 筆刷模式「滑筆」下的滑筆繪製動作。
 */
function SlideBrush_Chasing() {
    let dx = (curPosition.X - lastPosition.X) / 100, dy = (curPosition.Y - lastPosition.Y) / 100;
    let nextPosition = {X: lastPosition.X + dx, Y: lastPosition.Y + dy};
    DrawLine(lastPosition, nextPosition);
    FillCircle(nextPosition, brushWidth / 2);
    lastPosition = nextPosition;
    if (isMouseDown && DrawingMethod == SlideBrush_Drawing)
        setTimeout(SlideBrush_Chasing, 10);
}

let featherEnable = false;
/**
 * 筆刷模式「燕筆」下的繪圖動作。 (燕尾筆)
 * @param {Event} event 與滑鼠動作相關的事件物件。
 * @param {MouseStatus} status 滑鼠的狀態。
 */
function FeatherBrush_Drawing(event, status) {
    switch(status) {
        case MouseStatus.MouseDown:
            lastPosition = GetMousePosition(event);
            context.strokeStyle = strokeColor;
            context.lineWidth = brushWidth;
            FillCircle(lastPosition, brushWidth / 2, strokeColor);
            featherEnable = true;
            break;
        case MouseStatus.Drawing:
            if (!featherEnable) break;
            curPosition = GetMousePosition(event);
            DrawLine(lastPosition, curPosition);
            FillCircle(curPosition, context.lineWidth / 2);
            lastPosition = curPosition;
            context.lineWidth -= 0.5;
            featherEnable = context.lineWidth - 0.5 > 0;
    }
}

/**
 * 筆刷模式「刺筆」下的繪圖動作。
 * @param {Event} event 與滑鼠動作相關的事件物件。
 * @param {MouseStatus} status 滑鼠的狀態。
 */
function FurBrush_Drawing(event, status) {
    switch(status) {
        case MouseStatus.MouseDown:
            lastPosition = GetMousePosition(event);
            context.strokeStyle = strokeColor;
            context.lineWidth = brushWidth;
            FillCircle(lastPosition, brushWidth / 2, strokeColor);
            break;
        case MouseStatus.Drawing:
            curPosition = GetMousePosition(event);
            let dx = curPosition.X - lastPosition.X, dy = curPosition.Y - lastPosition.Y;
            dx = dx > 40 ? 2 : dx / 20;
            dy = dy > 40 ? 2 : dy / 20;
            DrawLine(lastPosition, curPosition);
            FillCircle(curPosition, brushWidth / 2);
            lastPosition.X += dx;
            lastPosition.Y += dy;
    }
}

/**
 * 筆刷模式「印筆」下的繪圖動作。
 * @param {Event} event 與滑鼠動作相關的事件物件。
 * @param {MouseStatus} status 滑鼠的狀態。
 */
function StampBrush_Drawing(event, status) {
    switch(status) {
        case MouseStatus.MouseDown:
            context.strokeStyle = strokeColor;
            context.fillStyle = fillColor;
            context.lineWidth = brushWidth;
            StampCircle(GetMousePosition(event), fillWidth / 2);
            break;
        case MouseStatus.Drawing:
            StampCircle(GetMousePosition(event), fillWidth / 2);
    }
}