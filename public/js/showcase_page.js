let list = [];                          // 存放與圖畫清單索引對應的畫家圖像、作者訊息與留言內容
let index = 0;                          // 目前正在觀看的圖畫之索引值
let indexChange_enable = true;          // 是否可以變更至指定的畫作
let txtaComment = $("#txtaComment");    // 留言區的留言輸入方塊
let msgDialog = {                       // 將對話方塊相關的功能套在一起
    title: $("#msgDialogTitle"),
    content: $("#msgDialogContent"),
    show: () => { $("#msgDialog").modal("show"); }
};

$(init);

/**
 * 初始化。
 */
function init() {
    // 初始化使用者評分物件
    $("input.rating:not([fixed])").rating({
        step: 1,
        starCaptions: {1: '1 Star', 2: '2 Stars', 3: '3 Stars', 4: '4 Stars', 5: '5 Stars'},
        starCaptionClasses: {1: "label label-danger", 2: "label label-warning", 3: "label label-info", 4: "label label-primary", 5: "label label-success"},
        showClear: false,
        clearCaption: "請為作品評分"
    });

    /* 總評分僅為顯示使用，不能備更變 */
    $("input.rating[fixed]").rating({ displayOnly: true });

    /* 設定作品集不自動滑動 與 當作品滑動時呼叫的函式 */
    $("#theCarousel").carousel( { interval : false }).on("slide.bs.carousel", (event) => { changeInformation(event.relatedTarget.dataset.worksIndex); });
    
    initialInformation();

    /* 簽署事件 */
    $("#btnSendComment").on("click", btnSendComment_Click);
    $("input.rating:not([fixed])").on("rating.change", RatingBar_Click);
}

/**
 * 初始化訊息資料標籤。將每個畫家的圖像、作品訊息與留言內容的標籤放在一組，
 * 並置入list中，使展示畫框在改變時，圖畫內容也對應得的資料。
 */
function initialInformation() {
    let artistImgs = $("div[data-artist-thumbnail]");
    let worksInfos = $("div[data-works-info]");
    let commentGroupIndex = $("div[data-comment-group-index]");
    for (let i = 0; i < artistImgs.length; i++) {
        list.push({ artist   : $(artistImgs[i]),
                    info     : $(worksInfos[i]),
                    comments : $(commentGroupIndex[i]) });
    }
}

/**
 * 變更圖畫訊息內容。
 * @param {number} newIndex 變更畫作之後的目標索引值。
 */
function changeInformation(newIndex) {
    if (index == newIndex) return;
    indexChange_enable = false;
    let flag1 = false, flag2 = false, flag3 = false;
    list[index].artist.fadeOut(250, () => {
        list[newIndex].artist.fadeIn(250, () => {
            flag1 = true;
            indexChange_enable = flag1 && flag2 && flag3;
        });
    });
    list[index].info.fadeOut(250, () => {
        list[newIndex].info.fadeIn(250, () => {
            flag2 = true;
            indexChange_enable = flag1 && flag2 && flag3;
        });
    });
    list[index].comments.fadeOut(250, () => {
        list[newIndex].comments.fadeIn(250, () => {
            flag3 = true;
            indexChange_enable = flag1 && flag2 && flag3;
        });
    });
    $("li[data-slide-to=\"" + index + "\"]").removeClass("active");
    $("li[data-slide-to=\"" + newIndex + "\"]").addClass("active");
    index = newIndex;
}

/**
 * 當留言送出按鈕按鈕被按下時，所做的事件處理。
 * @param {DOMEvent} e 事件物件。
 */
function btnSendComment_Click(e) {
    let datas = {
        isActivity: isActivity,
        id: idList[index],
        comment: txtaComment.val()
    };
    if (isActivity) {
        datas.nthSeason = nthSeason;
        datas.themeOrder = themeOrder;
    }
    $.ajax({
        url: "/showcase/send_commnet",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify(datas),
        success: SendComment_ServerResponse,
        error: SendComment_OnError
    });
}

/**
 * 將留言資料寄送到伺服端之後，伺服所回應的訊息。
 * @param {Object} response 伺服端所回應的訊息。
 */
function SendComment_ServerResponse(response) {
    msgDialog.title.text(response.isOK ? "訊息" : "錯誤");
    msgDialog.content.text(response.message);
    msgDialog.show();
}

/**
 * 當留言資料無法傳送至伺服端時的處理。
 * @param {jqXHR} jqXHR XMLHttpRequest物件。
 * @param {string} statusText 錯誤名稱。
 * @param {string} err 錯誤訊息內容。
 */
function SendComment_OnError(jqXHR, statusText, err) {
    msgDialog.title.text("錯誤");
    msgDialog.content.text("無法將留言訊息傳送至伺服端，請稍後再嘗試。");
    msgDialog.show();
}

/**
 * 當使用者在評分條上按下時，所做的事件處理。
 * @param {Event} event 事件物件。
 * @param {string} value 使用者在評分條上所選的評分數值。
 * @param {string} caption 對應於評分數值的標籤文字。
 */
function RatingBar_Click(event, value, caption) {
    let datas = {
        isActivity: isActivity,
        id: idList[index],
        score: value
    }
    if (isActivity) {
        datas.nthSeason = nthSeason;
        datas.themeOrder = themeOrder;
    }
    $.ajax({
        url: "/showcase/rating",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify(datas),
        success: RatePainting_ServerResponse,
        error: RatePainting_OnError
    });
}

/**
 * 將評分資料傳送至伺服後的回應訊息。
 * @param {Object} response 伺服器的回應訊息。
 */
function RatePainting_ServerResponse(response) {
    msgDialog.title.text(response.isOK ? "訊息" : "錯誤");
    msgDialog.content.text(response.message);
    msgDialog.show();
}

/**
 * 將評分資料傳送至伺服器時，發生了錯誤。
 * @param {jqXHR} jqXHR XMLHttpRequest物件。
 * @param {string} statusText 錯誤名稱。
 * @param {string} err 錯誤敘述。
 */
function RatePainting_OnError(jqXHR, statusText, err) {
    msgDialog.title.text("傳送錯誤");
    msgDialog.content.text("將評分資料送至伺服時發生了錯誤，請稍後再嘗試。");
    msgDialog.show();
}