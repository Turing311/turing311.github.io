

const PRODUCTION_USE = true;


var Module = {};

var wasmModuleLoaded = false;
var wasmModuleLoadedCallbacks = [];


Module.onRuntimeInitialized = function () {
    wasmModuleLoaded = true;
    for (var i = 0; i < wasmModuleLoadedCallbacks.length; i++) {
        wasmModuleLoadedCallbacks[i]();
    }

    var enc = new TextEncoder();
    var licenseStr = "PRiRREuPCZ1m5ASgF7fcpgm0nBGhi8B2AblTE+h0k4Eb93ij+U3stRYNGdOk3TqB9LqyRo9GmtzmLln4KOxL418hdoH58IkFmCJWnLCyqFhr4BGsbRfajXWLpVQmSX6q7JBi7RH8Y38S4chhGHGJMsr/Jw+WPPuEV+EY5Gz7VsMkpKygP7wkjt9Q62uM8WGpsh1nyK4zA3td78cRxh/OvU3jW0O5pgmPDg5z2ZPZS/5aNaruKkOu0ioDbbl3Xq3c6c1hYkMGq01Kv4stsA98YF9YsIDUfpUfCXr4omvsXsu3IVSVpeoxaI1KonveyoBb1wnOvBi3+62/hDyU2AejKA==";
    //   var licenseStr ='06406b07507c00306606507e07606307307506807207506e00500405605905801c05a05505b043'  
    stringArray = enc.encode(licenseStr)
    stringBuffer = _malloc(licenseStr.length + 1 * Int8Array.BYTES_PER_ELEMENT);
    HEAPU8.set(stringArray, stringBuffer / Int8Array.BYTES_PER_ELEMENT);
    var ret = _init_dict(stringBuffer);
    console.log("ret: " + ret);

    if (ret == true)
        document.getElementById("camera").disabled = false;
}

fetch('liveface.wasm')
    .then(response => response.arrayBuffer())
    .then(buffer => {
        Module.wasmBinary = buffer;
        var script = document.createElement('script');
        script.src = 'liveface.js';
        script.onload = function () {
            console.log('Emscripten boilerplate loaded.');
        }
        document.body.appendChild(script);
    });

function send_image(photo) {
    var url = 'https://capture-liveness-backend.tech5.tech/decryptionOfImage';
    fetch(url,{
        method : "POST",
        body:JSON.stringify({"image" : photo}),
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
          },
    }).then(response => response.json()).then(data  =>{
        if(data.data.error)  {
            document.getElementById('liveness_error_msg').innerText = `Liveness error : ${data.data.error}`
            document.getElementById('liveness_error_msg').style.color = 'red';
        }else {
            document.getElementById('liveness_error_msg').innerText = `Score : ${data.data.score}  ; quality : ${data.data.quality} ; probability : ${data.data.probability} `
            document.getElementById('liveness_error_msg').style.color = 'greenyellow';
        }       

        document.getElementById('camera').disabled = false;
        document.getElementById('div_loader').style.display = 'none';
        document.getElementById("capture").style.opacity = "1.0";
    }).catch((error) => {
        document.getElementById('liveness_error_msg').innerText = error
        document.getElementById('liveness_error_msg').style.color = 'red';

        document.getElementById('camera').disabled = false;
        document.getElementById('div_loader').style.display = 'none';
        document.getElementById("capture").style.opacity = "1.0";
    });
}

function takePhoto() {
    document.querySelector('#autoCapture').checked = true
    ncnn_liveness();
}

function ncnn_liveness() {
    const video = document.getElementById("inputVideo");
    const canvas1 = document.getElementById("capture1");
    canvas1.width = video.videoWidth;
    canvas1.height = video.videoHeight;
    canvas1.getContext('2d').drawImage(video, 0, 0, canvas1.width, canvas1.height);

    var imageData = canvas1.getContext('2d').getImageData(0, 0, canvas1.width, canvas1.height);
    var data = imageData.data;

    dst = _malloc(data.length);
    HEAPU8.set(data, dst);

    // max 20 objects
    resultarray = new Float32Array(20);
    resultbuffer = _malloc(20 * Float32Array.BYTES_PER_ELEMENT);
    HEAPF32.set(resultarray, resultbuffer / Float32Array.BYTES_PER_ELEMENT);

    msgBuffer = _malloc(256 * Int8Array.BYTES_PER_ELEMENT);
    _process(dst, canvas1.width, canvas1.height, resultbuffer, msgBuffer);

    var qaqarray = HEAPF32.subarray(resultbuffer / Float32Array.BYTES_PER_ELEMENT, resultbuffer / Float32Array.BYTES_PER_ELEMENT + 20);
    var capture_ok = qaqarray[0];
    var msg_len = qaqarray[1];

    var msgStringArr = HEAPU8.subarray(msgBuffer / Int8Array.BYTES_PER_ELEMENT, msgBuffer / Int8Array.BYTES_PER_ELEMENT + msg_len);

    var dec = new TextDecoder();
    var msg = dec.decode(msgStringArr);
    document.getElementById("cap_message").innerHTML = msg;
    if (capture_ok) {
        const cb = document.querySelector('#autoCapture');
        if (cb.checked) {
            document.getElementById('camera').innerText = "Start Camera";
            document.getElementById('camera').disabled = true
            document.getElementById("face_cover").style.visibility = "hidden";
            document.getElementById('captureButton').disabled = true
            document.querySelector('#autoCapture').checked = false

            if (PRODUCTION_USE) {
                var result_len = _get_result_length();
                resultStringBuffer = _malloc((result_len + 1) * Int8Array.BYTES_PER_ELEMENT);
                _get_result(resultStringBuffer);

                var resultString = HEAPU8.subarray(resultStringBuffer / Int8Array.BYTES_PER_ELEMENT, resultStringBuffer / Int8Array.BYTES_PER_ELEMENT + result_len + 1);

                var dec = new TextDecoder();
                var result_str = dec.decode(resultString);

                const canvas = document.getElementById("capture");
                canvas.style.opacity = "0.5";
                canvas.width = video.videoWidth
                canvas.height = video.videoHeight
                canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);           

                const videoEl = document.getElementById('inputVideo')
                videoEl.srcObject = null

                document.getElementById('div_loader').style.display = 'block';
                send_image(result_str);
            } else { ///Test Purpose
                var result_len = _get_dec_result_length();
                resultStringBuffer = _malloc((result_len + 1) * Int8Array.BYTES_PER_ELEMENT);
                _get_dec_result(resultStringBuffer);

                var resultString = HEAPU8.subarray(resultStringBuffer / Int8Array.BYTES_PER_ELEMENT, resultStringBuffer / Int8Array.BYTES_PER_ELEMENT + result_len + 1);
                var dec = new TextDecoder();
                var result_str = dec.decode(resultString);
                var image = new Image();
                image.onload = function () {
                    const canvas = document.getElementById("capture");
                    canvas.style.opacity = "1.0";
                    canvas.width = image.width
                    canvas.height = image.height
                    canvas.getContext('2d').drawImage(this, 0, 0, canvas.width, canvas.height);
                }

                const videoEl = document.getElementById('inputVideo')
                videoEl.srcObject = null

                send_image(result_str);
            }
        }
      

    }

    _free(resultbuffer);
    _free(dst);
}

async function onPlay() {
    const videoEl = document.getElementById('inputVideo')
    if (videoEl.paused || videoEl.ended)
        return setTimeout(() => onPlay())

    const image = document.getElementById("face_cover");
    const canvas = document.getElementById("capture");
    canvas.width = image.width;
    canvas.height = image.height;
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    document.getElementById("capture").style.opacity = "0.5"

    ncnn_liveness();

    setTimeout(() => onPlay())
}

async function startCamera() {


    const stream = await navigator.mediaDevices.getUserMedia({
        video: {}
    })
    const videoEl = document.getElementById('inputVideo')
    document.getElementById('liveness_error_msg').innerText = null
    if (videoEl.srcObject == null) {
        document.getElementById('camera').innerText = "Stop Camera";
        document.getElementById('captureButton').disabled = false

        videoEl.srcObject = stream
        old_liveness1 = 0;
        old_liveness2 = 0;

    } else {
        const canvas = document.getElementById("capture");
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

        videoEl.srcObject = null
        document.getElementById('camera').innerText = "Start Camera";
    }
}

function isMobile() {
    let check = false;
    (function (a) {
        if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true;
    })(navigator.userAgent || navigator.vendor || window.opera);
    return check;
    return true;
}


function load() {
    if (isMobile()) {

        var cssId = 'myCss';  // you could encode the css path itself to generate id..
        if (!document.getElementById(cssId))
        {
            var head  = document.getElementsByTagName('head')[0];
            var link  = document.createElement('link');
            link.id   = cssId;
            link.rel  = 'stylesheet';
            link.type = 'text/css';
            link.href = 'style_m.css';
            link.media = 'all';
            head.appendChild(link);
        }

        document.getElementById("inputVideo").style.width = '960'
        document.getElementById("inputVideo").style.height = '1280'

        document.getElementById("capture").style.width = '960'
        document.getElementById("capture").style.height = '1280'

        document.getElementById("face_cover").style.width = '960'
        document.getElementById("face_cover").style.height = '1280'

        document.getElementById("capture1").style.width = '960'
        document.getElementById("capture1").style.height = '1280'

        document.getElementById("div_video").style.width = '960'
        document.getElementById("div_video").style.height = '1280'

        document.getElementById("face_cover").src = "face_cover_p.png";
    } else {
        var cssId = 'myCss';  // you could encode the css path itself to generate id..
        if (!document.getElementById(cssId))
        {
            var head  = document.getElementsByTagName('head')[0];
            var link  = document.createElement('link');
            link.id   = cssId;
            link.rel  = 'stylesheet';
            link.type = 'text/css';
            link.href = 'style_d.css';
            link.media = 'all';
            head.appendChild(link);
        }
    }
}
window.onload = load;