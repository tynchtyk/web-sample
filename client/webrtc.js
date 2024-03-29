
var localStream;
var remoteVideo;
var peerConnection;
var uuid;
var serverConnection;
var overlay;
var overlayCC;

var peerConnectionConfig = {
  'iceServers': [
    {'urls': 'stun:stun.stunprotocol.org:3478'},
    {'urls': 'stun:stun.l.google.com:19302'},
  ]
};

  uuid = createUUID();

  remoteVideo = document.getElementById('remoteVideo');
  overlay = document.getElementById('overlay');
	overlayCC = overlay.getContext('2d');

  serverConnection = new WebSocket('wss://' + window.location.hostname + ':8443');
  serverConnection.onmessage = gotMessageFromServer;

  var constraints = {
    video: true,
    audio: false,
  };

  var ctrack = new clm.tracker();
  ctrack.init();
  var trackingStarted = true;

if(navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia(constraints).then(getUserMediaSuccess).catch(errorHandler);
  } else {
    alert('Your browser does not support getUserMedia API');
  }


function getUserMediaSuccess(stream) {
  localStream = stream;
//  localVideo.style.filter = "invert(100%)";
//remoteVideo.srcObject = localStream;
//  drawLoop();
}


function drawLoop() {
  console.log("DRAWING");
  requestAnimFrame(drawLoop);
   //psrElement.innerHTML = "score :" + ctrack.getScore().toFixed(4);
 
  overlayCC.clearRect(0, 0, remoteVideo.width, remoteVideo.height);

  overlayCC.drawImage( remoteVideo, 0, 0, remoteVideo.width, remoteVideo.height );
  /*var pixelData = overlayCC.getImageData( 0, 0 , remoteVideo.width,remoteVideo.height);

  var avg, i;

  // apply a  simple greyscale transformation
  for( i = 0; i < pixelData.data.length; i += 4 ) {
      avg = (
          pixelData.data[ i ] +
          pixelData.data[ i + 1 ] +
          pixelData.data[ i + 2 ]
      ) / 3;
      pixelData.data[ i ] = avg;
      pixelData.data[ i + 1 ] = avg;
      pixelData.data[ i + 2 ] = avg;
  }

  // write the manipulated pixel data to the second canvas
  overlayCC.putImageData( pixelData, 0, 0 );*/
          if (ctrack.getCurrentPosition()) {
     ctrack.draw(overlay);
  }
  
  
}


function start(isCaller) {
  peerConnection = new RTCPeerConnection(peerConnectionConfig);
  peerConnection.onicecandidate = gotIceCandidate;
  peerConnection.ontrack = gotRemoteStream;
  //drawLoop();

  if(isCaller) {
    peerConnection.addStream(localStream);
    remoteVideo.srcObject = localStream;
      peerConnection.createOffer().then(createdDescription).catch(errorHandler);
  }
}

function errorHandler(error) {
  console.log(error);
}

function gotMessageFromServer(message) {
  if(!peerConnection) start(false);

  var signal = JSON.parse(message.data);

  // Ignore messages from ourself
  if(signal.uuid == uuid) return;

  if(signal.sdp) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function() {
      // Only create answers in response to offers
      if(signal.sdp.type == 'offer') {
        peerConnection.createAnswer().then(createdDescription).catch(errorHandler);
      }
    }).catch(errorHandler);
  } else if(signal.ice) {
    peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(errorHandler);
  }
}

function gotIceCandidate(event) {
  if(event.candidate != null) {
    serverConnection.send(JSON.stringify({'ice': event.candidate, 'uuid': uuid}));
  }
}

function createdDescription(description) {
  console.log('got description');

  peerConnection.setLocalDescription(description).then(function() {
    serverConnection.send(JSON.stringify({'sdp': peerConnection.localDescription, 'uuid': uuid}));
  }).catch(errorHandler);
}

function gotRemoteStream(event) {
  console.log('got remote stream');
  remoteVideo.srcObject = event.streams[0];
  ctrack.start(remoteVideo);

  drawLoop();
}




function createUUID() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}