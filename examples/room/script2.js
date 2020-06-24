const Peer = window.Peer;

(async function main() {
//window.onload = async function(){
  const localVideo = document.getElementById('js-local-stream');
  const joinTrigger = document.getElementById('js-join-trigger');
  const leaveTrigger = document.getElementById('js-leave-trigger');
  const remoteVideos = document.getElementById('js-remote-streams');
  const roomId = document.getElementById('js-room-id');
  const roomMode = document.getElementById('js-room-mode');
  const localText = document.getElementById('js-local-text');
  const sendTrigger = document.getElementById('js-send-trigger');
  const messages = document.getElementById('js-messages');
  const meta = document.getElementById('js-meta');
  const sdkSrc = document.querySelector('script[src*=skyway]');
  const muteTrigger = document.getElementById('js-mute-trigger');
  const unMuteTrigger = document.getElementById('js-unmute-trigger');

  meta.innerText = `
    UA: ${navigator.userAgent}
    SDK: ${sdkSrc ? sdkSrc.src : 'unknown'}
  `.trim();

  const getRoomModeByHash = () => (location.hash === '#sfu' ? 'sfu' : 'mesh');

  roomMode.textContent = getRoomModeByHash();
  window.addEventListener(
    'hashchange',
    () => (roomMode.textContent = getRoomModeByHash())
  );

  const localStream = await navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: true,
    })
    .catch(console.error);

  let _localMutedAudioStream = null;
  let _localUnmutedAudioStream = null;

  // Render local stream
  localVideo.muted = true;
  localVideo.srcObject = localStream;
  localVideo.playsInline = true;
  await localVideo.play().catch(console.error);

  // eslint-disable-next-line require-atomic-updates
  const peer = (window.peer = new Peer({
    key: window.__SKYWAY_KEY__,
    debug: 3,
  }));



  // Register join handler
  joinTrigger.addEventListener('click', () => {
  //peer.on('open', () => {
    // Note that you need to ensure the peer has connected to signaling server
    // before using methods of peer instance.
    console.log(peer.open);
    if (!peer.open) {
      return;
    }
    console.log('Success onload');

    const room = peer.joinRoom(roomId.value, {
    //const room = peer.joinRoom('testroom', {
      mode: getRoomModeByHash(),
      //mode: 'mesh',
      stream: localStream,
    });

    room.once('log', log => {
      console.log('getLog:'+log);
    })

    room.once('open', () => {
      messages.textContent += '=== You joined ===\n';
    });
    room.on('peerJoin', peerId => {
      messages.textContent += `=== ${peerId} joined ===\n`;
      room.getLog();
    });

    // Render remote stream for new peer join in the room
    room.on('stream', async stream => {
      const newVideo = document.createElement('video');
      newVideo.srcObject = stream;
      newVideo.playsInline = true;
      // mark peerId to find it later at peerLeave event
      newVideo.setAttribute('data-peer-id', stream.peerId);
      remoteVideos.append(newVideo);
      await newVideo.play().catch(console.error);
      room.getLog();
    });

    room.on('data', ({ data, src }) => {
      // Show a message sent to the room and who sent
      messages.textContent += `${src}: ${data}\n`;
      room.getLog();
    });

    // for closing room members
    room.on('peerLeave', peerId => {
      const remoteVideo = remoteVideos.querySelector(
        `[data-peer-id=${peerId}]`
      );
      remoteVideo.srcObject.getTracks().forEach(track => track.stop());
      remoteVideo.srcObject = null;
      remoteVideo.remove();

      messages.textContent += `=== ${peerId} left ===\n`;
      room.getLog();
    });

    // for closing myself
    room.once('close', () => {
      sendTrigger.removeEventListener('click', onClickSend);
      messages.textContent += '== You left ===\n';
      Array.from(remoteVideos.children).forEach(remoteVideo => {
        remoteVideo.srcObject.getTracks().forEach(track => track.stop());
        remoteVideo.srcObject = null;
        remoteVideo.remove();
      });
      room.getLog();
    });

    sendTrigger.addEventListener('click', onClickSend);
    muteTrigger.addEventListener('click', onClickMute);
    unMuteTrigger.addEventListener('click', onClickunMute);
    leaveTrigger.addEventListener('click', () => room.close(), { once: true });

    function onClickSend() {
      console.log(localStream.getAudioTracks().forEach(track => track.enabled));
      localStream.getAudioTracks().forEach(track => track.enabled = true);
      console.log(localStream.getAudioTracks());
      // Send message to all of the peers in the room via websocket
      //room.send(localText.value);

      //messages.textContent += `${peer.id}: ${localText.value}\n`;
      //localText.value = '';
    }
    async function onClickMute() {
      //localStream.getAudioTracks().forEach(track => track.enabled = false);
      //console.log(localStream.getAudioTracks());
      if(_localMutedAudioStream === null){
        _localMutedAudioStream = await navigator.mediaDevices
        .getUserMedia({
          audio: true,
          video: false,
        })
        _localMutedAudioStream.getAudioTracks().forEach(track => track.enabled = false);
        localStream.removeTrack(localStream.getAudioTracks()[0]);
        localStream.addTrack(_localMutedAudioStream.getAudioTracks()[0]);
        room.replaceStream(localStream);
        console.log(localStream.getTracks());
        _localUnmutedAudioStream = null;
      }
    }
    async function onClickunMute() {
      //localStream.getAudioTracks().forEach(track => track.enabled = true);
      //console.log(localStream.getAudioTracks());
      if(_localUnmutedAudioStream === null){
        _localUnmutedAudioStream = await navigator.mediaDevices
        .getUserMedia({
          audio: true,
          video: false,
        })
        .catch(console.error);
        localStream.removeTrack(_localMutedAudioStream.getAudioTracks()[0]);
        localStream.addTrack(_localUnmutedAudioStream.getAudioTracks()[0]);
        room.replaceStream(localStream);
        console.log(localStream.getTracks());
        _localMutedAudioStream = null;
      }
    }


  });

  peer.on('error', console.error);
})();
