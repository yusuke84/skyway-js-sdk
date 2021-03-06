const Peer = window.Peer;

(async function main() {
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
  const gumWidth = document.getElementById('js-gum-width');
  const gumHeight = document.getElementById('js-gum-height');
  const gumFramerate = document.getElementById('js-gum-framerate');
  const gumTrigger = document.getElementById('js-gum-trigger');
  const sdkSrc = document.querySelector('script[src*=skyway]');

  let localStream = null;

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

  // eslint-disable-next-line require-atomic-updates
  const peer = (window.peer = new Peer({
    key: window.__SKYWAY_KEY__,
    debug: 3,
  }));

  // Register gum handler
  gumTrigger.addEventListener('click', async () =>{
    let video_constraints;
    (gumWidth.value !== "" && gumHeight.value !== "" && gumFramerate.value !== "") ? video_constraints = 
      {width: {exact: gumWidth.value}, height: {exact: gumHeight.value}, frameRate: {exact: gumFramerate.value}} : video_constraints = "true";  
    localStream = await navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: true,
    })
    .catch(console.error);

    // Render local stream
    localVideo.muted = true;
    localVideo.srcObject = localStream;
    localVideo.playsInline = true;
    await localVideo.play().catch(console.error);

  });

  // Register join handler
  joinTrigger.addEventListener('click', () => {
    // Note that you need to ensure the peer has connected to signaling server
    // before using methods of peer instance.
    if (!peer.open) {
      return;
    }

    let room = peer.joinRoom(roomId.value, {
      mode: getRoomModeByHash(),
      stream: localStream,
    });

    room.once('open', () => {
      messages.textContent += '=== You joined ===\n';
    });
    room.on('peerJoin', peerId => {
      messages.textContent += `=== ${peerId} joined ===\n`;
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

      const track = stream.getVideoTracks()[0];
      track.addEventListener("ended", async () =>{
        console.log("localStream was ended.");
        await room.close();
        localStream = await navigator.mediaDevices
          .getUserMedia({
            audio: true,
            video: true,
          })
          .catch(console.error);
        room = peer.joinRoom(roomId.value, {
          mode: getRoomModeByHash(),
          stream: localStream,
        });

        room.on('peerJoin', peerId => {
          messages.textContent += `=== ${peerId} joined ===\n`;
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
        });
    
        room.on('data', ({ data, src }) => {
          // Show a message sent to the room and who sent
          messages.textContent += `${src}: ${data}\n`;
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
        });
    
        // for closing myself
        room.on('close', () => {
          sendTrigger.removeEventListener('click', onClickSend);
          messages.textContent += '== You left ===\n';
          Array.from(remoteVideos.children).forEach(remoteVideo => {
            remoteVideo.srcObject.getTracks().forEach(track => track.stop());
            remoteVideo.srcObject = null;
            remoteVideo.remove();
          });
        });

      });

    });

    room.on('data', ({ data, src }) => {
      // Show a message sent to the room and who sent
      messages.textContent += `${src}: ${data}\n`;
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
    });

    // for closing myself
    room.on('close', () => {
      sendTrigger.removeEventListener('click', onClickSend);
      messages.textContent += '== You left ===\n';
      Array.from(remoteVideos.children).forEach(remoteVideo => {
        remoteVideo.srcObject.getTracks().forEach(track => track.stop());
        remoteVideo.srcObject = null;
        remoteVideo.remove();
      });
    });

    sendTrigger.addEventListener('click', onClickSend);
    leaveTrigger.addEventListener('click', () => room.close(), { once: true });

    function onClickSend() {
      // Send message to all of the peers in the room via websocket
      room.send(localText.value);

      messages.textContent += `${peer.id}: ${localText.value}\n`;
      localText.value = '';
    }
  });

  peer.on('error', (err) => {
    console.error(err);
  });



})();
