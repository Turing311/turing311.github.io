
const PITCH_THRESHOLD = 20;
const YAW_THRESHOLD = 10;
const ROLL_THRESHOLD = 10;
const MASK_THRESHOLD = 0.5;
const SUNGLASS_THRESHOLD = 0.5;
const EYE_DIST_THRESHOLD_MIN = 90;
const EYE_DIST_THRESHOLD_MAX = 150;
const BRISQUE_THRESHOLD = 40;
const LIVENESS_THRESHOLD = 0.7;
const EYE_CLOSE_THRESHOLD = 0.8;

var CAM_WIDTH = 640;
var CAM_HEIGHT = 480;
const CENTER_R = 190;

var old_liveness1 = 0;
var old_liveness2 = 0;

var Module = {};
fetch('liveface.wasm')
    .then(response => response.arrayBuffer())
    .then(buffer => {
        Module.wasmBinary = buffer;
        var script = document.createElement('script');
        script.src = 'liveface.js';
        script.onload = function() {
            console.log('Emscripten boilerplate loaded.');
        }
        document.body.appendChild(script);
    });
            
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

    _process(dst, canvas1.width, canvas1.height, resultbuffer);

    // resultarray
    var qaqarray = HEAPF32.subarray(resultbuffer / Float32Array.BYTES_PER_ELEMENT, resultbuffer / Float32Array.BYTES_PER_ELEMENT + 143);

    var count = qaqarray[0];
    // var i;
    // for (i = 0; i < count > 0 ? 1 : 0; i++) {
    //     var bbox_x = qaqarray[i * 18 + 1];
    //     var bbox_y = qaqarray[i * 18 + 2];
    //     var bbox_w = qaqarray[i * 18 + 3];
    //     var bbox_h = qaqarray[i * 18 + 4];
    //     var prob = qaqarray[i * 18 + 17];

    //     // console.log('qaq ' + label + ' = ' + prob);
        
    //     const canvas = document.getElementById("capture");
    //     var ctx = canvas.getContext('2d')
    //     ctx.strokeRect(bbox_x, bbox_y, bbox_w, bbox_h);

    //     var center_rect_x1 = (CAM_WIDTH / 2) - CENTER_R;
    //     var center_rect_y1 = (CAM_HEIGHT / 2) - CENTER_R * 0.8;
    //     var center_rect_x2 = (CAM_WIDTH / 2) + CENTER_R ;
    //     var center_rect_y2 = (CAM_HEIGHT / 2) + CENTER_R * 1.2;
    //     ctx.strokeRect(center_rect_x1, center_rect_y1, center_rect_x2 - center_rect_x1, center_rect_y2 - center_rect_y1);


    //     var text = "liveness = " + parseFloat(prob * 100).toFixed(2) + "%";

    //     ctx.textBaseline = 'top';
    //     var text_width = ctx.measureText(text).width;
    //     var text_height = parseInt(ctx.font, 10);
    //     var x = bbox_x;
    //     var y = bbox_y - text_height;
    //     if (y < 0)
    //         y = 0;
    //     if (x + text_width > canvas.width)
    //         x = canvas.width - text_width;
    //     ctx.fillStyle = "rgb(255,255,255)";
    //     ctx.fillRect(x, y, text_width, text_height);
    //     ctx.fillStyle = "rgb(0,0,0)";
    //     ctx.fillText(text, x, y);
    // }

    var bbox_x = qaqarray[1];
    var bbox_y = qaqarray[2];
    var bbox_w = qaqarray[3];
    var bbox_h = qaqarray[4];

    var msg = "";

    if (count == 0) {
        msg = "No Person Detected"
        old_liveness1 = 0;
        old_liveness2 = 0;
    } else if(count > 1) {
        msg = "Multiple Person Detected"
        old_liveness1 = 0;
        old_liveness2 = 0;
    } else {
        var center_rect_x1 = (CAM_WIDTH / 2) - CENTER_R * 0.9;
        var center_rect_y1 = (CAM_HEIGHT / 2) - CENTER_R;
        var center_rect_x2 = (CAM_WIDTH / 2) + CENTER_R * 0.9;
        var center_rect_y2 = (CAM_HEIGHT / 2) + CENTER_R * 1.1;

        if(isMobile()) {

        }

        if(!(bbox_x >= center_rect_x1 && bbox_y >= center_rect_y1 && bbox_x < center_rect_x2 && bbox_y < center_rect_y2 &&
            bbox_x + bbox_w >= center_rect_x1 && bbox_y + bbox_h >= center_rect_y1 && bbox_x + bbox_w < center_rect_x2 && bbox_y + bbox_h < center_rect_y2)) {
            msg = "Move to center";
        }
        else if(Math.abs(qaqarray[4 + 1]) > YAW_THRESHOLD) {//yaw
            msg = "Look Straight";
            console.log("Look Straight yaw: " + Math.abs(qaqarray[4 + 1]));
        } 
        else if(Math.abs(qaqarray[5 + 1]) > PITCH_THRESHOLD) {//pitch
            msg = "Look Straight";
            console.log("Look Straight pitch: " + Math.abs(qaqarray[5 + 1]));
        }
        else if(Math.abs(qaqarray[6 + 1]) > ROLL_THRESHOLD) {//roll
            msg = "Look Straight";
            console.log("Look Straight roll: " + Math.abs(qaqarray[6 + 1]));
        }
        else if(qaqarray[9 + 1] > MASK_THRESHOLD) {//mask
            msg = "Mask Detected";
        }
        else if(qaqarray[10 + 1] > SUNGLASS_THRESHOLD) {//sunglass
            msg = "Sunglass Detected";
        }
        else if(qaqarray[11 + 1] < EYE_CLOSE_THRESHOLD) {//eyeclose
            msg = "Eye Closed";
        }
        else if(qaqarray[8 + 1] < EYE_DIST_THRESHOLD_MIN) {//eyedist
            msg = "Move Closer";
        } else if(qaqarray[8 + 1] > EYE_DIST_THRESHOLD_MAX) {//eyedist
            msg = "Go back";
        }
        else if(qaqarray[7 + 1] > BRISQUE_THRESHOLD) {//brisque
            msg = "Hold Still";
        }
        else if(qaqarray[16 + 1] < LIVENESS_THRESHOLD) {//liveness
            msg = "Spoof Detected";
        }
        else if(old_liveness1 > LIVENESS_THRESHOLD && old_liveness2 > LIVENESS_THRESHOLD){
            msg = "Selfie OK";

            const cb = document.querySelector('#autoCapture');
            if(cb.checked) {
                const video = document.getElementById("inputVideo");
                const canvas = document.getElementById("capture");
                canvas.style.opacity="1.0";
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
            
                const videoEl = document.getElementById('inputVideo')
                videoEl.srcObject = null

                document.getElementById('camera').innerText = "Start Camera";
                document.getElementById("face_cover").style.visibility = "hidden";
            }
        } else {
            msg = "Selfie OK";
        }

        if(old_liveness1 == 0) {
            old_liveness1 = qaqarray[16 + 1];
        } else if(old_liveness2 == 0){
            old_liveness2 = qaqarray[16 + 1];
        } else {
            old_liveness1 = old_liveness2;
            old_liveness2 = qaqarray[16 + 1];
        }
    }

    document.getElementById("cap_message").innerHTML = msg;

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

  const stream = await navigator.mediaDevices.getUserMedia({ video: {} })
  const videoEl = document.getElementById('inputVideo')
  if(videoEl.srcObject == null) {
    document.getElementById('camera').innerText = "Stop Camera";    
  
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
    (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
    return check;
    return true;
}


function load() {
    if(isMobile()) {
      document.getElementById("inputVideo").style.width = '480px'
      document.getElementById("inputVideo").style.height = '640px'

      document.getElementById("capture").style.width = '480px'
      document.getElementById("capture").style.height = '640px'

      document.getElementById("face_cover").style.width = '480px'
      document.getElementById("face_cover").style.height = '640px'

      document.getElementById("capture1").style.width = '480px'
      document.getElementById("capture1").style.height = '640px'

      document.getElementById("div_video").style.width = '480px'
      document.getElementById("div_video").style.height = '640px'

      document.getElementById("face_cover").src = "face_cover_p.png";

      CAM_WIDTH = 480;
      CAM_HEIGHT = 640;
    } else {
      document.getElementById("inputVideo").style.width = '640px'
      document.getElementById("inputVideo").style.height = '480px'

      document.getElementById("capture").style.width = '640px'
      document.getElementById("capture").style.height = '480px'

      document.getElementById("face_cover").style.width = '640px'
      document.getElementById("face_cover").style.height = '480px'

      document.getElementById("capture1").style.width = '640px'
      document.getElementById("capture1").style.height = '480px'

      document.getElementById("div_video").style.width = '640px'
      document.getElementById("div_video").style.height = '480px'

      CAM_WIDTH = 640;
      CAM_HEIGHT = 480;
    }
  }
window.onload = load;