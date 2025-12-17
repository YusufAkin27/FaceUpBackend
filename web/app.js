// Socket.io ve WebRTC yapılandırması
const SERVER_URL = 'https://api.yusufakin.xyz';
let socket = null;
let peerConnection = null;
let localStream = null;
let remoteStream = null;
let currentRoomId = null;
let isInitiator = false;
let isVideoEnabled = true;
let isAudioEnabled = true;

// WebRTC yapılandırması
const rtcConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// DOM Elementleri
const registerScreen = document.getElementById('registerScreen');
const waitingScreen = document.getElementById('waitingScreen');
const callScreen = document.getElementById('callScreen');
const registerForm = document.getElementById('registerForm');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const partnerName = document.getElementById('partnerName');
const messageInput = document.getElementById('messageInput');
const sendMessageBtn = document.getElementById('sendMessage');
const chatMessages = document.getElementById('chatMessages');
const toggleVideoBtn = document.getElementById('toggleVideo');
const toggleAudioBtn = document.getElementById('toggleAudio');
const swipeBtn = document.getElementById('swipeBtn');
const endCallBtn = document.getElementById('endCallBtn');
const toggleChatBtn = document.getElementById('toggleChatBtn');
const chatPanel = document.getElementById('chatPanel');
const logoutBtn = document.getElementById('logoutBtn');
const errorToast = document.getElementById('errorToast');
let unreadCount = 0;
let chatPanelOpen = false;

// Ekranları değiştir
function showScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
}

// Toast mesajı göster
function showToast(message, type = 'info') {
    errorToast.textContent = message;
    errorToast.className = `toast ${type} show`;
    setTimeout(() => {
        errorToast.classList.remove('show');
    }, 3000);
}

// Kamera ve mikrofon erişimi
async function getLocalStream() {
    try {
        // Doğrudan getUserMedia'yı dene - en basit yöntem
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        
        if (!localStream || localStream.getTracks().length === 0) {
            showToast('Kamera veya mikrofon erişilemedi.', 'error');
            return false;
        }

        // Video elementine stream'i ata
        if (localVideo) {
            localVideo.srcObject = localStream;
        }

        console.log('Kamera ve mikrofon erişimi başarılı');
        return true;
    } catch (error) {
        console.error('Medya erişim hatası:', error);
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            showToast('Kamera ve mikrofon erişimi reddedildi. Lütfen izin verin.', 'error');
        } else if (error.name === 'NotFoundError') {
            showToast('Kamera veya mikrofon bulunamadı.', 'error');
        } else if (error.name === 'NotReadableError') {
            showToast('Kamera veya mikrofon başka bir uygulama tarafından kullanılıyor.', 'error');
        } else {
            showToast('Kamera ve mikrofon erişimi alınamadı.', 'error');
        }
        
        return false;
    }
}

// WebRTC Peer Connection oluştur
function createPeerConnection() {
    peerConnection = new RTCPeerConnection(rtcConfiguration);

    // Local stream'i ekle
    if (localStream) {
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
    }

    // Remote stream'i al
    peerConnection.ontrack = (event) => {
        remoteStream = event.streams[0];
        remoteVideo.srcObject = remoteStream;
    };

    // ICE Candidate gönder
    peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket) {
            socket.emit('ice-candidate', {
                roomId: currentRoomId,
                candidate: event.candidate
            });
        }
    };

    // Connection state değişiklikleri
    peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'failed') {
            showToast('Bağlantı hatası oluştu', 'error');
        }
    };
}

// Kayıt formu gönderimi
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('name').value.trim();
    const surname = document.getElementById('surname').value.trim();

    if (!name || !surname) {
        showToast('Lütfen ad ve soyad girin', 'error');
        return;
    }

    // Kamera ve mikrofon erişimi
    const streamSuccess = await getLocalStream();
    if (!streamSuccess) {
        return;
    }

    // Socket bağlantısı
    socket = io(SERVER_URL);

    socket.on('connect', () => {
        console.log('Socket bağlandı');
        socket.emit('register', { name, surname });
    });

    socket.on('registered', () => {
        showScreen(waitingScreen);
        showToast('Kayıt başarılı, eşleşme aranıyor...');
    });

    socket.on('matched', async (data) => {
        currentRoomId = data.roomId;
        isInitiator = data.isInitiator;
        
        if (data.partner) {
            partnerName.textContent = `${data.partner.name} ${data.partner.surname}`;
        }

        showScreen(callScreen);
        showToast('Eşleşme yapıldı!');

        // Local video'yu tekrar ayarla
        if (localStream) {
            localVideo.srcObject = localStream;
        }

        // Mesaj panelini kapat
        chatPanelOpen = false;
        chatPanel.classList.remove('open');
        unreadCount = 0;
        updateUnreadCount();

        // Peer connection oluştur
        createPeerConnection();

        // Initiator ise offer gönder
        if (isInitiator) {
            try {
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                socket.emit('offer', {
                    roomId: currentRoomId,
                    offer: offer
                });
            } catch (error) {
                console.error('Offer oluşturma hatası:', error);
                showToast('Bağlantı kurulurken hata oluştu', 'error');
            }
        }
    });

    socket.on('offer', async (data) => {
        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.emit('answer', {
                roomId: currentRoomId,
                answer: answer
            });
        } catch (error) {
            console.error('Answer oluşturma hatası:', error);
            showToast('Bağlantı kurulurken hata oluştu', 'error');
        }
    });

    socket.on('answer', async (data) => {
        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        } catch (error) {
            console.error('Answer ayarlama hatası:', error);
            showToast('Bağlantı kurulurken hata oluştu', 'error');
        }
    });

    socket.on('ice-candidate', async (data) => {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (error) {
            console.error('ICE candidate ekleme hatası:', error);
        }
    });

    socket.on('message', (data) => {
        addMessage(data.text, data.senderName, data.sender !== socket.id);
    });

    socket.on('call-ended', (data) => {
        showToast('Görüşme sonlandı, yeni eşleşme aranıyor...');
        // Bekleme ekranına geç ve yeni match bekle
        showScreen(waitingScreen);
        resetCall();
        // Backend otomatik olarak her iki kullanıcıyı da bekleme listesine ekleyip yeni match arayacak
    });

    socket.on('error', (data) => {
        showToast(data.message || 'Bir hata oluştu', 'error');
    });

    socket.on('disconnect', () => {
        showToast('Bağlantı kesildi', 'error');
        endCall();
    });
});

// Mesaj gönder
function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || !currentRoomId) return;

    socket.emit('message', {
        roomId: currentRoomId,
        message: message
    });

    addMessage(message, 'Siz', true);
    messageInput.value = '';
}

sendMessageBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Mesaj ekle
function addMessage(text, sender, isOwn) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;
    
    const senderDiv = document.createElement('div');
    senderDiv.className = 'message-sender';
    senderDiv.textContent = sender;
    
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.textContent = text;
    
    messageDiv.appendChild(senderDiv);
    messageDiv.appendChild(textDiv);
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Eğer mesaj paneli kapalıysa unread count artır
    if (!chatPanelOpen && !isOwn) {
        unreadCount++;
        updateUnreadCount();
    }
}

// Video toggle
toggleVideoBtn.addEventListener('click', () => {
    if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            isVideoEnabled = !isVideoEnabled;
            videoTrack.enabled = isVideoEnabled;
            toggleVideoBtn.style.opacity = isVideoEnabled ? '1' : '0.5';
        }
    }
});

// Audio toggle
toggleAudioBtn.addEventListener('click', () => {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            isAudioEnabled = !isAudioEnabled;
            audioTrack.enabled = isAudioEnabled;
            toggleAudioBtn.classList.toggle('muted', !isAudioEnabled);
        }
    }
});

// Swipe (sonraki kişi)
swipeBtn.addEventListener('click', () => {
    if (currentRoomId && socket) {
        socket.emit('swipe', { roomId: currentRoomId });
        showScreen(waitingScreen);
        showToast('Yeni eşleşme aranıyor...');
        resetCall();
        // Backend otomatik olarak her iki kullanıcıyı da bekleme listesine ekleyip yeni match arayacak
    }
});

// Görüşmeyi sonlandır
endCallBtn.addEventListener('click', () => {
    if (currentRoomId && socket) {
        socket.emit('end-call', { roomId: currentRoomId });
    }
    endCall();
});

// Görüşmeyi sonlandır ve temizle
function endCall() {
    // Stream'leri durdur
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }

    // Peer connection'ı kapat
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    // Video elementlerini temizle
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;

    // Socket bağlantısını kapat
    if (socket) {
        socket.disconnect();
        socket = null;
    }

    currentRoomId = null;
    showScreen(registerScreen);
    resetCall();
}

// Call state'i sıfırla
function resetCall() {
    chatMessages.innerHTML = '';
    messageInput.value = '';
    partnerName.textContent = 'Eşleşme yapılıyor...';
    isVideoEnabled = true;
    isAudioEnabled = true;
    toggleVideoBtn.style.opacity = '1';
    toggleAudioBtn.classList.remove('muted');
    chatPanelOpen = false;
    chatPanel.classList.remove('open');
    unreadCount = 0;
    updateUnreadCount();
    
    // Peer connection'ı kapat
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    // Remote video'yu temizle (local video kalacak)
    remoteVideo.srcObject = null;
    
    // Local video'yu tekrar ayarla (eğer stream varsa)
    if (localStream) {
        localVideo.srcObject = localStream;
    }
}

// Chat panel toggle
toggleChatBtn.addEventListener('click', () => {
    chatPanelOpen = !chatPanelOpen;
    chatPanel.classList.toggle('open', chatPanelOpen);
    
    if (chatPanelOpen) {
        unreadCount = 0;
        updateUnreadCount();
    }
});

// Çıkış butonu
logoutBtn.addEventListener('click', () => {
    if (confirm('Çıkış yapmak istediğinize emin misiniz?')) {
        if (currentRoomId && socket) {
            socket.emit('end-call', { roomId: currentRoomId });
        }
        endCall();
    }
});

// Unread count güncelle
function updateUnreadCount() {
    const unreadElement = document.getElementById('unreadCount');
    if (unreadCount > 0 && !chatPanelOpen) {
        unreadElement.textContent = unreadCount > 99 ? '99+' : unreadCount;
        unreadElement.style.display = 'flex';
    } else {
        unreadElement.style.display = 'none';
    }
}

