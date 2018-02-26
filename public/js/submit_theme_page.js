var URL = window.URL || window.webkitURL;
var txtTheme =  $("#txtTheme");
var txtaNarration = $("#txtaNarration");
var imageInput = document.getElementById("btnUploadImg");

$("input#btnUploadImg").on("change", uploadImage);
$("button#btnSubmit").on("click", btnSubmit_Click);

//設置錯誤訊息: message為null時則為取消錯誤訊息顯示
function setAlert(message) {
    if ($("#divAlert").children().length > 0)
        $("#divAlert").children().remove();
    if (message) {
        $("#divAlert").append($("<div class='alert alert-danger mt-20'>" + message + "</div>"));
    }
}

//處理上傳的圖像
function uploadImage() {
    if (!imageInput.files) {
        alert("無法上傳: 您的瀏覽器對input元素中的files屬性不支援!");
        return;
    }
    else if (!imageInput.files[0]) {
        alert("取檔失敗: 請在完成動作之前選取所要上傳的影像!");
        return;
    }
    var imgFile = imageInput.files[0];
    if (imgFile.type != "image/jpeg" && imgFile.type != "image/png") {
        alert("檔案類型錯誤: 請選擇jpg或png類型的圖檔!");
    }
    else if (imgFile.size > 131072) {
        alert("檔案過大: 請選擇128KB以下的jpg或png檔案!");
    }
    else {
        let image = new Image();
        image.onload = () => {
            if (image.width != image.height) {
                alert("比例不符: 請選擇大小為1:1的jpg或png檔案。");
            }
            else {
                $("#imgThemeImage").attr("src", image.src);
            }
        };
        image.src = URL.createObjectURL(imgFile);
    }
}

//當Submit按鈕按下時
function btnSubmit_Click() {
    let themeTitle = txtTheme.val();
    let narrative = txtaNarration.val();
    if ( themeTitle.length < 1 || themeTitle.length > 32) {
        setAlert("輸入錯誤: 主題名稱請輸入1~32間的字!");
        return;
    }
    else if ( narrative.length < 8 || narrative.length > 100 ) {
        setAlert("輸入錯誤: 主題敘述請輸入8~100間的字!");
        return;
    }
    let datas = new FormData();
    datas.append("theme", themeTitle);
    datas.append("narrative", narrative);
    datas.append("image", imageInput.files[0]);
    $.ajax({
        url: "/newtheme",
        method: "POST",
        cache: false,
        processData: false,
        contentType: false,
        timeout: 5000,
        data: datas,
        success: SubmitTheme_Success,
        error: SubmitTheme_OnError
    });
}

/**
 * 將投稿新主題的相關資料傳送至伺服端後，伺服端所傳回的訊息。
 * @param {Object} response 自伺服端所傳回的訊息。
 */
function SubmitTheme_Success(response) {
    if (response.isOK) {
        window.location.replace(response.url);
    }
    else {
        setAlert(response.message);
    }
}

function SubmitTheme_OnError(jqXHR, statusText, err) {
    setAlert("將資料傳送至伺服時發生了錯誤，請稍後再嘗試。");
}