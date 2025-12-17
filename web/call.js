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

// URL parametrelerinden bilgileri al
const urlParams = new URLSearchParams(window.location.search);
currentRoomId = urlParams.get('roomId');
isInitiator = urlParams.get('isInitiator') === 'true';
const partnerName = urlParams.get('partnerName') || 'Bilinmeyen';

console.log('URL Parametreleri:', {
    roomId: currentRoomId,
    isInitiator: isInitiator,
    partnerName: partnerName
});

// Eğer gerekli parametreler yoksa index.html'e yönlendir
if (!currentRoomId) {
    console.error('RoomId bulunamadı, index.html\'e yönlendiriliyor');
    window.location.href = 'index.html';
}

// DOM Elementleri
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const partnerNameElement = document.getElementById('partnerName');
const messageInput = document.getElementById('messageInput');
const sendMessageBtn = document.getElementById('sendMessage');
const chatMessages = document.getElementById('chatMessages');
const toggleVideoBtn = document.getElementById('toggleVideo');
const toggleAudioBtn = document.getElementById('toggleAudio');
const endCallBtn = document.getElementById('endCallBtn');
const logoutBtn = document.getElementById('logoutBtn');
const errorToast = document.getElementById('errorToast');
const menuToggleBtn = document.getElementById('menuToggleBtn');
const controlButtonsWrapper = document.querySelector('.control-buttons-wrapper');
const toggleMessageBtn = document.getElementById('toggleMessageBtn');
const chatInputOverlay = document.getElementById('chatInputOverlay');

// Partner adını göster
if (partnerNameElement) {
    partnerNameElement.textContent = partnerName;
}

// Toast mesajı göster
function showToast(message, type = 'info') {
    if (errorToast) {
        errorToast.textContent = message;
        errorToast.className = `toast ${type} show`;
        setTimeout(() => {
            errorToast.classList.remove('show');
        }, 3000);
    }
}

// Kamera ve mikrofon erişimi
async function getLocalStream() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        
        if (!localStream || localStream.getTracks().length === 0) {
            showToast('Kamera veya mikrofon erişilemedi.', 'error');
            return false;
        }

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
    if (peerConnection) {
        console.log('PeerConnection zaten var, kapatılıyor...');
        peerConnection.close();
    }

    console.log('Yeni PeerConnection oluşturuluyor...');
    peerConnection = new RTCPeerConnection(rtcConfiguration);

    // Local stream'i ekle
    if (localStream) {
        localStream.getTracks().forEach(track => {
            console.log('Local track ekleniyor:', track.kind);
            peerConnection.addTrack(track, localStream);
        });
    }

    // Remote stream'i al
    peerConnection.ontrack = (event) => {
        console.log('=== REMOTE TRACK ALINDI ===');
        console.log('Event:', event);
        console.log('Streams:', event.streams.length);
        console.log('Track:', event.track.kind);
        console.log('Track ID:', event.track.id);
        console.log('Track enabled:', event.track.enabled);
        
        // Eğer stream varsa kullan, yoksa yeni stream oluştur
        if (event.streams && event.streams.length > 0) {
            remoteStream = event.streams[0];
            console.log('Remote stream mevcut stream kullanılıyor:', remoteStream.id);
        } else {
            // Stream yoksa, mevcut remoteStream'i kullan veya yeni oluştur
            if (!remoteStream) {
                remoteStream = new MediaStream();
                console.log('Yeni remote stream oluşturuldu');
            }
            remoteStream.addTrack(event.track);
            console.log('Track remote stream\'e eklendi');
        }
        
        // Video element'e stream'i ata
        if (remoteVideo && remoteStream) {
            // Eğer srcObject zaten aynı stream ise, tekrar atama
            if (remoteVideo.srcObject !== remoteStream) {
                remoteVideo.srcObject = remoteStream;
                console.log('Remote video stream video element\'e atandı');
            }
            
            // Remote video için mirror efekti uygula (ayna görüntüsü)
            remoteVideo.style.transform = 'scaleX(-1)';
            remoteVideo.style.webkitTransform = 'scaleX(-1)';
            remoteVideo.style.mozTransform = 'scaleX(-1)';
            remoteVideo.style.msTransform = 'scaleX(-1)';
            remoteVideo.style.oTransform = 'scaleX(-1)';
            
            // Remote video wrapper için transform yok (sadece video element'ine uygulanıyor)
            const remoteVideoWrapper = remoteVideo.closest('.video-wrapper.remote');
            if (remoteVideoWrapper) {
                remoteVideoWrapper.style.transform = 'none';
                remoteVideoWrapper.style.webkitTransform = 'none';
                remoteVideoWrapper.style.mozTransform = 'none';
                remoteVideoWrapper.style.msTransform = 'none';
                remoteVideoWrapper.style.oTransform = 'none';
            }
            
            // Video element attribute'larını kontrol et
            if (remoteVideo.muted) {
                remoteVideo.muted = false;
                console.log('Remote video muted attribute kaldırıldı');
            }
            
            // Video oynatmayı dene
            const playPromise = remoteVideo.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log('✅ Remote video başarıyla oynatılıyor');
                }).catch(err => {
                    console.error('❌ Remote video oynatma hatası:', err);
                    // Autoplay policy nedeniyle başarısız olabilir, kullanıcı etkileşimi beklenebilir
                    console.log('Video oynatma için kullanıcı etkileşimi gerekebilir');
                });
            }
        } else {
            console.error('remoteVideo element veya remoteStream bulunamadı!');
        }
    };

    // ICE Candidate gönder
    peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket) {
            console.log('ICE candidate gönderiliyor');
            socket.emit('ice-candidate', {
                roomId: currentRoomId,
                candidate: event.candidate
            });
        } else if (!event.candidate) {
            console.log('ICE candidate toplama tamamlandı');
        }
    };

    // Connection state değişiklikleri
    peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
            console.log('✅ WebRTC bağlantısı kuruldu!');
            showToast('Bağlantı kuruldu', 'success');
        } else if (peerConnection.connectionState === 'failed') {
            console.error('❌ WebRTC bağlantısı başarısız!');
            showToast('Bağlantı hatası oluştu', 'error');
            // Bağlantı başarısız olduğunda yeni eşleşme ara
            handleConnectionLost();
        } else if (peerConnection.connectionState === 'disconnected') {
            console.log('⚠️ WebRTC bağlantısı kesildi');
            // Bağlantı kesildiğinde yeni eşleşme ara
            handleConnectionLost();
        }
    };

    // ICE connection state
    peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', peerConnection.iceConnectionState);
        if (peerConnection.iceConnectionState === 'connected' || peerConnection.iceConnectionState === 'completed') {
            console.log('✅ ICE bağlantısı başarılı!');
        } else if (peerConnection.iceConnectionState === 'failed') {
            console.error('❌ ICE bağlantısı başarısız!');
            // ICE bağlantısı başarısız olduğunda yeni eşleşme ara
            handleConnectionLost();
        } else if (peerConnection.iceConnectionState === 'disconnected') {
            console.log('⚠️ ICE bağlantısı kesildi');
            // ICE bağlantısı kesildiğinde yeni eşleşme ara
            handleConnectionLost();
        }
    };

    console.log('PeerConnection oluşturuldu');
}

// Socket bağlantısını başlat
async function initializeCall() {
    // Kullanıcı bilgilerini localStorage'dan al
    const userName = localStorage.getItem('userName');
    const userSurname = localStorage.getItem('userSurname');

    if (!userName) {
        showToast('Kullanıcı bilgileri bulunamadı', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }

    // Kamera ve mikrofon erişimi
    const streamSuccess = await getLocalStream();
    if (!streamSuccess) {
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }

    // Socket bağlantısı
    console.log('Socket bağlantısı başlatılıyor:', SERVER_URL);
    socket = io(SERVER_URL);

    // Room'a join işlemi için retry mekanizması
    let roomJoined = false;
    let retryCount = 0;
    const maxRetries = 3;
    
    async function joinRoomWithRetry() {
        while (!roomJoined && retryCount < maxRetries) {
            if (retryCount > 0) {
                console.log(`Room'a join retry: ${retryCount}/${maxRetries}`);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            return new Promise((resolve) => {
                // room-joined event'ini dinle
                const roomJoinedHandler = (data) => {
                    console.log('✅ Room\'a join olundu:', data);
                    roomJoined = true;
                    socket.off('room-joined', roomJoinedHandler);
                    socket.off('error', errorHandler);
                    resolve(true);
                };
                
                // error event'ini dinle (sadece room ile ilgili hatalar için)
                const errorHandler = (data) => {
                    const errorMsg = data.message || 'Bir hata oluştu';
                    if (errorMsg.includes('Oda bulunamadı') || errorMsg.includes('Geçersiz oda') || errorMsg.includes('Oda dolu')) {
                        console.error('Room hatası:', errorMsg);
                        retryCount++;
                        if (retryCount < maxRetries) {
                            socket.off('room-joined', roomJoinedHandler);
                            socket.off('error', errorHandler);
                            resolve(false);
                        } else {
                            socket.off('room-joined', roomJoinedHandler);
                            socket.off('error', errorHandler);
                            showToast('Odaya katılamadı, lütfen tekrar deneyin', 'error');
                            setTimeout(() => {
                                window.location.href = 'index.html';
                            }, 2000);
                            resolve(false);
                        }
                    }
                };
                
                socket.once('room-joined', roomJoinedHandler);
                socket.once('error', errorHandler);
                
                // Timeout kontrolü (5 saniye)
                setTimeout(() => {
                    if (!roomJoined) {
                        socket.off('room-joined', roomJoinedHandler);
                        socket.off('error', errorHandler);
                        retryCount++;
                        if (retryCount < maxRetries) {
                            resolve(false);
                        } else {
                            showToast('Odaya katılamadı, lütfen tekrar deneyin', 'error');
                            setTimeout(() => {
                                window.location.href = 'index.html';
                            }, 2000);
                            resolve(false);
                        }
                    }
                }, 5000);
                
                // Room'a join et
                console.log('join-room event gönderiliyor...');
                socket.emit('join-room', {
                    roomId: currentRoomId,
                    name: userName,
                    surname: userSurname || ''
                });
            });
        }
    }

    socket.on('connect', async () => {
        console.log('✅ Socket bağlandı, roomId:', currentRoomId);
        console.log('Kullanıcı:', userName, userSurname || '');
        console.log('isInitiator:', isInitiator);
        
        // Room'a join et (retry ile)
        const joined = await joinRoomWithRetry();
        if (!joined) {
            return; // Retry mekanizması hata mesajını zaten gösterdi
        }
        
        // Peer connection oluştur
        createPeerConnection();

        // Initiator ise offer gönder
        if (isInitiator) {
            console.log('Initiator olarak offer gönderiliyor...');
            setTimeout(async () => {
                try {
                    const offer = await peerConnection.createOffer({
                        offerToReceiveAudio: true,
                        offerToReceiveVideo: true
                    });
                    await peerConnection.setLocalDescription(offer);
                    console.log('Offer oluşturuldu, gönderiliyor...');
                    socket.emit('offer', {
                        roomId: currentRoomId,
                        offer: offer
                    });
                    console.log('✅ Offer gönderildi');
                } catch (error) {
                    console.error('❌ Offer oluşturma hatası:', error);
                    showToast('Bağlantı kurulurken hata oluştu', 'error');
                }
            }, 500);
        } else {
            console.log('Initiator değil, offer bekleniyor...');
        }
    });

    socket.on('connect_error', (error) => {
        console.error('❌ Socket bağlantı hatası:', error);
        showToast('Backend\'e bağlanılamadı', 'error');
    });

    socket.on('error', (data) => {
        // Retry mekanizması dışındaki hatalar için
        const errorMsg = data.message || 'Bir hata oluştu';
        if (!errorMsg.includes('Oda bulunamadı') && !errorMsg.includes('Geçersiz oda') && !errorMsg.includes('Oda dolu')) {
            console.error('Socket error event:', data);
            showToast(errorMsg, 'error');
        }
    });

    socket.on('offer', async (data) => {
        try {
            console.log('📥 Offer alındı, answer oluşturuluyor...');
            if (!peerConnection) {
                console.log('PeerConnection yok, oluşturuluyor...');
                createPeerConnection();
            }
            
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            console.log('Remote description ayarlandı');
            
            const answer = await peerConnection.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await peerConnection.setLocalDescription(answer);
            console.log('Answer oluşturuldu, gönderiliyor...');
            
            socket.emit('answer', {
                roomId: currentRoomId,
                answer: answer
            });
            console.log('✅ Answer gönderildi');
        } catch (error) {
            console.error('❌ Answer oluşturma hatası:', error);
            showToast('Bağlantı kurulurken hata oluştu', 'error');
        }
    });

    socket.on('answer', async (data) => {
        try {
            console.log('📥 Answer alındı, remote description ayarlanıyor...');
            if (!peerConnection) {
                console.error('❌ PeerConnection yok!');
                return;
            }
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
            console.log('✅ Answer başarıyla ayarlandı');
        } catch (error) {
            console.error('❌ Answer ayarlama hatası:', error);
            showToast('Bağlantı kurulurken hata oluştu', 'error');
        }
    });

    socket.on('ice-candidate', async (data) => {
        try {
            console.log('📥 ICE candidate alındı, ekleniyor...');
            if (!peerConnection) {
                console.error('❌ PeerConnection yok, ICE candidate eklenemiyor!');
                return;
            }
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            console.log('✅ ICE candidate başarıyla eklendi');
        } catch (error) {
            console.error('❌ ICE candidate ekleme hatası:', error);
        }
    });

    socket.on('message', (data) => {
        // senderName'i temizle (fazla boşlukları kaldır)
        const senderName = data.senderName ? data.senderName.trim() : 'Bilinmeyen';
        
        // Kendi mesajı mı kontrol et
        const isOwn = data.sender === socket.id;
        
        // Mesajı ekle (kendi mesajı ise "Siz", değilse senderName)
        addMessage(data.text, isOwn ? 'Siz' : senderName, isOwn);
    });

    socket.on('call-ended', (data) => {
        console.log('Call ended event alındı:', data);
        
        // WebRTC bağlantısını kapat ve stream'leri durdur
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }
        
        if (remoteStream) {
            remoteStream.getTracks().forEach(track => track.stop());
            remoteStream = null;
        }
        
        // Peer connection'ı kapat
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }
        
        // Video element'lerini temizle
        if (localVideo) {
            localVideo.srcObject = null;
        }
        if (remoteVideo) {
            remoteVideo.srcObject = null;
        }
        
        // Kullanıcıya bildir
        const reason = data.reason === 'swipe' ? 'Karşı taraf yeni eşleşme aradı' : 'Görüşme sonlandı';
        showToast(reason, 'error');
        
        // Swipe veya end-call nedeniyle geldiyse, yeni eşleşme ara (waiting.html'e git)
        // Bu event sadece sonlandırılan tarafa gönderilir, sonlandıran taraf endCall() fonksiyonunu kullanır
        if (data.reason === 'swipe' || data.reason === 'end-call') {
            showToast('Yeni eşleşme aranıyor...', 'info');
            setTimeout(() => {
                window.location.href = 'waiting.html';
            }, 1000);
        } else {
            // Diğer nedenlerle sonlandıysa index.html'e yönlendir
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        }
    });

    // matched event'i artık waiting.html'de dinlenecek

    socket.on('disconnect', () => {
        console.log('Socket bağlantısı kesildi');
        showToast('Bağlantı kesildi, yeni eşleşme aranıyor...', 'info');
        // Socket bağlantısı kesildiğinde yeni eşleşme ara
        handleConnectionLost();
    });
}

// Bağlantı kesildiğinde yeni eşleşme aramak için bekleme sayfasına yönlendir
let isHandlingConnectionLost = false;
function handleConnectionLost() {
    // Çoklu çağrıları önle
    if (isHandlingConnectionLost) {
        return;
    }
    isHandlingConnectionLost = true;

    console.log('🔄 Bağlantı kesildi, yeni eşleşme aranıyor...');

    // Stream'leri durdur
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }

    if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
        remoteStream = null;
    }

    // Peer connection'ı kapat
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    // Video element'lerini temizle
    if (localVideo) {
        localVideo.srcObject = null;
    }
    if (remoteVideo) {
        remoteVideo.srcObject = null;
    }

    // Socket bağlantısını kapat (waiting.html'de yeniden bağlanacak)
    if (socket) {
        socket.disconnect();
        socket = null;
    }

    // waiting.html'e yönlendir (yeni eşleşme arayacak)
    setTimeout(() => {
        window.location.href = 'waiting.html';
    }, 1000);
}

// Mesaj gönder
function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || !currentRoomId || !socket) return;

    // Mesajı backend'e gönder (socket event'inden gelecek ve doğru şekilde gösterilecek)
    socket.emit('message', {
        roomId: currentRoomId,
        message: message
    });

    messageInput.value = '';
    
    // Mesaj gönderildikten sonra input alanını kapat
    if (chatInputOverlay) {
        setTimeout(() => {
            chatInputOverlay.classList.remove('active');
            if (messageInput) {
                messageInput.blur();
            }
        }, 100);
    }
}

if (sendMessageBtn) {
    sendMessageBtn.addEventListener('click', sendMessage);
}
if (messageInput) {
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Input alanına focus olduğunda menüyü kapat
    messageInput.addEventListener('focus', () => {
        if (controlButtonsWrapper && controlButtonsWrapper.classList.contains('active')) {
            controlButtonsWrapper.classList.remove('active');
            if (menuToggleBtn) menuToggleBtn.classList.remove('active');
        }
    });
}

// Input alanının dışına tıklandığında kapat (mesaj gönderme butonu hariç)
document.addEventListener('click', (e) => {
    if (chatInputOverlay && chatInputOverlay.classList.contains('active')) {
        const isClickInside = chatInputOverlay.contains(e.target) || 
                             (toggleMessageBtn && toggleMessageBtn.contains(e.target));
        if (!isClickInside) {
            chatInputOverlay.classList.remove('active');
            if (messageInput) {
                messageInput.blur();
            }
        }
    }
});

// Mesaj ekle
function addMessage(text, sender, isOwn) {
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;
    
    const senderDiv = document.createElement('div');
    senderDiv.className = 'message-sender';
    senderDiv.textContent = isOwn ? 'Siz' : sender;
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';
    
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.textContent = text;
    
    bubbleDiv.appendChild(textDiv);
    messageDiv.appendChild(senderDiv);
    messageDiv.appendChild(bubbleDiv);
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom (yeni mesaj geldiğinde en alta kaydır)
    setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 100);
}

// Video toggle
if (toggleVideoBtn) {
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
}

// Audio toggle
if (toggleAudioBtn) {
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
}

// Swipe fonksiyonu (sonraki kişi)
function performSwipe() {
    if (currentRoomId && socket) {
        // WebRTC bağlantısını kapat ve stream'leri durdur
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }
        
        if (remoteStream) {
            remoteStream.getTracks().forEach(track => track.stop());
            remoteStream = null;
        }
        
        // Peer connection'ı kapat
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }
        
        // Video element'lerini temizle
        if (localVideo) {
            localVideo.srcObject = null;
        }
        if (remoteVideo) {
            remoteVideo.srcObject = null;
        }
        
        // Backend'e swipe event'i gönder
        socket.emit('swipe', { roomId: currentRoomId });
        showToast('Yeni eşleşme aranıyor...', 'info');
        
        // Socket bağlantısını kapat (waiting.html'de yeniden bağlanacak)
        if (socket) {
            socket.disconnect();
            socket = null;
        }
        
        // waiting.html'e yönlendir
        setTimeout(() => {
            window.location.href = 'waiting.html';
        }, 500);
    }
}

// Menü Toggle Fonksiyonu
function toggleMenu() {
    if (!controlButtonsWrapper || !menuToggleBtn) return;
    
    const isActive = controlButtonsWrapper.classList.contains('active');
    
    if (isActive) {
        // Menüyü kapat
        controlButtonsWrapper.classList.remove('active');
        menuToggleBtn.classList.remove('active');
    } else {
        // Menüyü aç
        controlButtonsWrapper.classList.add('active');
        menuToggleBtn.classList.add('active');
    }
}

// Menü toggle butonu event listener
if (menuToggleBtn) {
    menuToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu();
    });
}

// Menü dışına tıklandığında kapat
document.addEventListener('click', (e) => {
    if (controlButtonsWrapper && menuToggleBtn) {
        const isClickInside = controlButtonsWrapper.contains(e.target) || menuToggleBtn.contains(e.target);
        if (!isClickInside && controlButtonsWrapper.classList.contains('active')) {
            controlButtonsWrapper.classList.remove('active');
            menuToggleBtn.classList.remove('active');
        }
    }
});

// Kontrol butonlarına tıklandığında menüyü kapat
if (toggleVideoBtn) {
    toggleVideoBtn.addEventListener('click', () => {
        setTimeout(() => {
            if (controlButtonsWrapper && controlButtonsWrapper.classList.contains('active')) {
                controlButtonsWrapper.classList.remove('active');
                if (menuToggleBtn) menuToggleBtn.classList.remove('active');
            }
        }, 200);
    });
}

if (toggleAudioBtn) {
    toggleAudioBtn.addEventListener('click', () => {
        setTimeout(() => {
            if (controlButtonsWrapper && controlButtonsWrapper.classList.contains('active')) {
                controlButtonsWrapper.classList.remove('active');
                if (menuToggleBtn) menuToggleBtn.classList.remove('active');
            }
        }, 200);
    });
}

// Mesaj butonuna tıklandığında input alanını aç/kapat
if (toggleMessageBtn && chatInputOverlay) {
    toggleMessageBtn.addEventListener('click', () => {
        const isActive = chatInputOverlay.classList.contains('active');
        
        if (isActive) {
            // Input alanını kapat
            chatInputOverlay.classList.remove('active');
            if (messageInput) {
                messageInput.blur();
            }
        } else {
            // Input alanını aç
            chatInputOverlay.classList.add('active');
            setTimeout(() => {
                if (messageInput) {
                    messageInput.focus();
                }
            }, 300);
        }
        
        // Menüyü kapat
        setTimeout(() => {
            if (controlButtonsWrapper && controlButtonsWrapper.classList.contains('active')) {
                controlButtonsWrapper.classList.remove('active');
                if (menuToggleBtn) menuToggleBtn.classList.remove('active');
            }
        }, 200);
    });
}



// Swipe gesture detection (sağa ve sola kaydırma)
let swipeStartX = null;
let swipeStartY = null;
let swipeStartTime = null;
let isSwipeActive = false;
const SWIPE_THRESHOLD = 50; // Minimum kaydırma mesafesi (px)
const SWIPE_VELOCITY_THRESHOLD = 0.3; // Minimum hız (px/ms)
const SWIPE_MAX_VERTICAL = 100; // Maksimum dikey kaydırma (yanlışlıkla scroll ile karışmaması için)

function initSwipeGesture() {
    const videoContainer = document.querySelector('.video-container');
    if (!videoContainer) return;

    // Swipe'ın tetiklenmemesi gereken elementleri kontrol et
    function shouldIgnoreSwipe(target) {
        // Butonlar, input'lar, mesaj alanları ve local video wrapper'ı hariç tut
        return target.closest('button') || 
               target.closest('input') || 
               target.closest('.chat-messages-overlay') ||
               target.closest('.chat-input-overlay') ||
               target.closest('.video-wrapper.local') ||
               target.closest('.controls') ||
               target.closest('.top-bar');
    }

    // Touch events (mobil)
    videoContainer.addEventListener('touchstart', (e) => {
        // Eğer local video sürükleniyorsa veya swipe'ı ignore etmemiz gereken bir elemente dokunulduysa
        if (isDragging || shouldIgnoreSwipe(e.target)) return;
        
        const touch = e.touches[0];
        swipeStartX = touch.clientX;
        swipeStartY = touch.clientY;
        swipeStartTime = Date.now();
        isSwipeActive = true;
    }, { passive: true });

    videoContainer.addEventListener('touchmove', (e) => {
        if (!isSwipeActive || isDragging) return;
        
        const touch = e.touches[0];
        const deltaX = touch.clientX - swipeStartX;
        const deltaY = Math.abs(touch.clientY - swipeStartY);
        
        // Eğer dikey kaydırma çok fazlaysa (scroll), swipe'ı iptal et
        if (deltaY > SWIPE_MAX_VERTICAL) {
            isSwipeActive = false;
            return;
        }
        
        // Yatay kaydırma yeterliyse, görsel geri bildirim göster
        if (Math.abs(deltaX) > 20) {
            e.preventDefault();
        }
    }, { passive: false });

    videoContainer.addEventListener('touchend', (e) => {
        if (!isSwipeActive || isDragging) return;
        
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - swipeStartX;
        const deltaY = Math.abs(touch.clientY - swipeStartY);
        const deltaTime = Date.now() - swipeStartTime;
        const velocity = Math.abs(deltaX) / deltaTime;
        
        // Swipe kontrolü
        if (deltaY < SWIPE_MAX_VERTICAL && 
            Math.abs(deltaX) > SWIPE_THRESHOLD && 
            velocity > SWIPE_VELOCITY_THRESHOLD) {
            
            // Sağa veya sola kaydırma
            if (deltaX > 0) {
                // Sağa kaydırma
                console.log('👉 Sağa swipe algılandı');
                performSwipe();
            } else {
                // Sola kaydırma
                console.log('👈 Sola swipe algılandı');
                performSwipe();
            }
        }
        
        // Reset
        swipeStartX = null;
        swipeStartY = null;
        swipeStartTime = null;
        isSwipeActive = false;
    }, { passive: true });

    // Mouse events (desktop - drag ile)
    let mouseStartX = null;
    let mouseStartY = null;
    let mouseStartTime = null;
    let isMouseSwipeActive = false;

    videoContainer.addEventListener('mousedown', (e) => {
        // Eğer local video sürükleniyorsa veya swipe'ı ignore etmemiz gereken bir elemente tıklanıyorsa
        if (isDragging || shouldIgnoreSwipe(e.target)) return;
        
        mouseStartX = e.clientX;
        mouseStartY = e.clientY;
        mouseStartTime = Date.now();
        isMouseSwipeActive = true;
    });

    videoContainer.addEventListener('mousemove', (e) => {
        if (!isMouseSwipeActive || isDragging) return;
        
        const deltaX = e.clientX - mouseStartX;
        const deltaY = Math.abs(e.clientY - mouseStartY);
        
        // Eğer dikey kaydırma çok fazlaysa, swipe'ı iptal et
        if (deltaY > SWIPE_MAX_VERTICAL) {
            isMouseSwipeActive = false;
            return;
        }
    });

    videoContainer.addEventListener('mouseup', (e) => {
        if (!isMouseSwipeActive || isDragging) return;
        
        const deltaX = e.clientX - mouseStartX;
        const deltaY = Math.abs(e.clientY - mouseStartY);
        const deltaTime = Date.now() - mouseStartTime;
        const velocity = Math.abs(deltaX) / deltaTime;
        
        // Swipe kontrolü
        if (deltaY < SWIPE_MAX_VERTICAL && 
            Math.abs(deltaX) > SWIPE_THRESHOLD && 
            velocity > SWIPE_VELOCITY_THRESHOLD) {
            
            // Sağa veya sola kaydırma
            if (deltaX > 0) {
                // Sağa kaydırma
                console.log('👉 Sağa swipe algılandı (mouse)');
                performSwipe();
            } else {
                // Sola kaydırma
                console.log('👈 Sola swipe algılandı (mouse)');
                performSwipe();
            }
        }
        
        // Reset
        mouseStartX = null;
        mouseStartY = null;
        mouseStartTime = null;
        isMouseSwipeActive = false;
    });

    // Mouse leave durumunda reset
    videoContainer.addEventListener('mouseleave', () => {
        isMouseSwipeActive = false;
        mouseStartX = null;
        mouseStartY = null;
        mouseStartTime = null;
    });
}

// Görüşmeyi sonlandır
if (endCallBtn) {
    endCallBtn.addEventListener('click', () => {
        // Menüyü kapat
        if (controlButtonsWrapper && controlButtonsWrapper.classList.contains('active')) {
            controlButtonsWrapper.classList.remove('active');
            if (menuToggleBtn) menuToggleBtn.classList.remove('active');
        }
        
        if (currentRoomId && socket) {
            socket.emit('end-call', { roomId: currentRoomId });
        }
        endCall();
    });
}

// Görüşmeyi sonlandır ve temizle
// Bu fonksiyon sadece sonlandıran taraf tarafından çağrılır
function endCall() {
    // Stream'leri durdur
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }

    if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
        remoteStream = null;
    }

    // Peer connection'ı kapat
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    // Video element'lerini temizle
    if (localVideo) {
        localVideo.srcObject = null;
    }
    if (remoteVideo) {
        remoteVideo.srcObject = null;
    }

    // Socket bağlantısını kapat
    if (socket) {
        socket.disconnect();
        socket = null;
    }

    // Sonlandıran taraf login sayfasına gider
    window.location.href = 'index.html';
}


// Çıkış butonu
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        if (confirm('Çıkış yapmak istediğinize emin misiniz?')) {
            if (currentRoomId && socket) {
                socket.emit('end-call', { roomId: currentRoomId });
            }
            endCall();
        }
    });
}


// Local video sürükle-bırak fonksiyonalitesi
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

function initLocalVideoDrag() {
    const localVideoWrapper = document.querySelector('.video-wrapper.local');
    if (!localVideoWrapper) return;

    // Kaydedilmiş pozisyonu yükle
    const savedPosition = localStorage.getItem('localVideoPosition');
    if (savedPosition) {
        try {
            const { top, right, bottom, left } = JSON.parse(savedPosition);
            if (top !== undefined) localVideoWrapper.style.top = top;
            if (right !== undefined) localVideoWrapper.style.right = right;
            if (bottom !== undefined) localVideoWrapper.style.bottom = bottom;
            if (left !== undefined) localVideoWrapper.style.left = left;
        } catch (e) {
            console.error('Pozisyon yükleme hatası:', e);
        }
    }

    // Mouse events
    localVideoWrapper.addEventListener('mousedown', (e) => {
        isDragging = true;
        localVideoWrapper.classList.add('dragging');
        
        const rect = localVideoWrapper.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const container = document.querySelector('.video-container');
        const containerRect = container.getBoundingClientRect();
        
        // Yeni pozisyonu hesapla
        let newLeft = e.clientX - containerRect.left - dragOffset.x;
        let newTop = e.clientY - containerRect.top - dragOffset.y;
        
        // Sınırları kontrol et
        const wrapperWidth = localVideoWrapper.offsetWidth;
        const wrapperHeight = localVideoWrapper.offsetHeight;
        
        newLeft = Math.max(0, Math.min(newLeft, containerRect.width - wrapperWidth));
        newTop = Math.max(0, Math.min(newTop, containerRect.height - wrapperHeight));
        
        // Pozisyonu ayarla
        localVideoWrapper.style.left = newLeft + 'px';
        localVideoWrapper.style.top = newTop + 'px';
        localVideoWrapper.style.right = 'auto';
        localVideoWrapper.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            localVideoWrapper.classList.remove('dragging');
            
            // Pozisyonu kaydet
            const position = {
                top: localVideoWrapper.style.top,
                left: localVideoWrapper.style.left,
                right: localVideoWrapper.style.right,
                bottom: localVideoWrapper.style.bottom
            };
            localStorage.setItem('localVideoPosition', JSON.stringify(position));
        }
    });

    // Touch events (mobil için)
    localVideoWrapper.addEventListener('touchstart', (e) => {
        isDragging = true;
        localVideoWrapper.classList.add('dragging');
        
        const touch = e.touches[0];
        const rect = localVideoWrapper.getBoundingClientRect();
        dragOffset.x = touch.clientX - rect.left;
        dragOffset.y = touch.clientY - rect.top;
        
        e.preventDefault();
    });

    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        
        const touch = e.touches[0];
        const container = document.querySelector('.video-container');
        const containerRect = container.getBoundingClientRect();
        
        let newLeft = touch.clientX - containerRect.left - dragOffset.x;
        let newTop = touch.clientY - containerRect.top - dragOffset.y;
        
        const wrapperWidth = localVideoWrapper.offsetWidth;
        const wrapperHeight = localVideoWrapper.offsetHeight;
        
        newLeft = Math.max(0, Math.min(newLeft, containerRect.width - wrapperWidth));
        newTop = Math.max(0, Math.min(newTop, containerRect.height - wrapperHeight));
        
        localVideoWrapper.style.left = newLeft + 'px';
        localVideoWrapper.style.top = newTop + 'px';
        localVideoWrapper.style.right = 'auto';
        localVideoWrapper.style.bottom = 'auto';
        
        e.preventDefault();
    });

    document.addEventListener('touchend', () => {
        if (isDragging) {
            isDragging = false;
            localVideoWrapper.classList.remove('dragging');
            
            const position = {
                top: localVideoWrapper.style.top,
                left: localVideoWrapper.style.left,
                right: localVideoWrapper.style.right,
                bottom: localVideoWrapper.style.bottom
            };
            localStorage.setItem('localVideoPosition', JSON.stringify(position));
        }
    });
}

// Responsive ayarlamalar
function handleResponsiveLayout() {
    const isMobile = window.innerWidth <= 768;
    const isSmallMobile = window.innerWidth <= 480;
    const isLandscape = window.innerWidth > window.innerHeight;
    
    // Local video wrapper'ı al
    const localVideoWrapper = document.querySelector('.video-wrapper.local');
    if (localVideoWrapper) {
        // Mobilde kaydedilmiş pozisyonu kontrol et ve sınırları ayarla
        const savedPosition = localStorage.getItem('localVideoPosition');
        if (savedPosition && isMobile) {
            try {
                const position = JSON.parse(savedPosition);
                // Eğer kaydedilmiş pozisyon varsa ve ekran boyutu değiştiyse, sınırları kontrol et
                const container = document.querySelector('.video-container');
                if (container) {
                    const containerRect = container.getBoundingClientRect();
                    const wrapperWidth = localVideoWrapper.offsetWidth;
                    const wrapperHeight = localVideoWrapper.offsetHeight;
                    
                    // Eğer pozisyon container dışındaysa, varsayılan pozisyona getir
                    if (position.left) {
                        const left = parseInt(position.left);
                        if (left < 0 || left > containerRect.width - wrapperWidth) {
                            // Varsayılan pozisyona getir
                            localVideoWrapper.style.left = 'auto';
                            localVideoWrapper.style.right = isSmallMobile ? '10px' : '15px';
                            localVideoWrapper.style.top = '50px';
                            localStorage.removeItem('localVideoPosition');
                        }
                    }
                }
            } catch (e) {
                console.error('Pozisyon kontrolü hatası:', e);
            }
        }
    }
    
    // Video element'lerini optimize et
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    
    if (localVideo && isMobile) {
        // Mobilde video kalitesini optimize et
        localVideo.setAttribute('playsinline', 'true');
    }
    
    if (remoteVideo && isMobile) {
        remoteVideo.setAttribute('playsinline', 'true');
    }
    
    // Toast mesajlarını mobilde daha iyi konumlandır
    const toast = document.getElementById('errorToast');
    if (toast && isMobile) {
        toast.style.top = isSmallMobile ? '10px' : '15px';
        toast.style.right = isSmallMobile ? '10px' : '15px';
        toast.style.left = isSmallMobile ? '10px' : 'auto';
        toast.style.maxWidth = isSmallMobile ? 'calc(100% - 20px)' : '280px';
    }
}

// Orientation değişikliğini handle et
function handleOrientationChange() {
    // Orientation değiştiğinde layout'u yeniden hesapla
    setTimeout(() => {
        handleResponsiveLayout();
        // Local video pozisyonunu yeniden ayarla
        const localVideoWrapper = document.querySelector('.video-wrapper.local');
        if (localVideoWrapper) {
            const savedPosition = localStorage.getItem('localVideoPosition');
            if (savedPosition) {
                // Orientation değiştiğinde pozisyonu sıfırla
                localStorage.removeItem('localVideoPosition');
                localVideoWrapper.style.left = 'auto';
                localVideoWrapper.style.right = window.innerWidth <= 480 ? '10px' : '15px';
                localVideoWrapper.style.top = '50px';
            }
        }
    }, 100);
}

// Viewport değişikliklerini dinle
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        handleResponsiveLayout();
    }, 250);
});

// Orientation değişikliğini dinle
window.addEventListener('orientationchange', handleOrientationChange);

// Visual viewport değişikliklerini dinle (mobil klavye için)
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        handleResponsiveLayout();
    });
}

// Sayfa yüklendiğinde çağrıyı başlat
window.addEventListener('load', () => {
    console.log('Sayfa yüklendi, görüşme başlatılıyor...');
    initializeCall();
    // Local video drag fonksiyonalitesini başlat
    setTimeout(() => {
        initLocalVideoDrag();
        handleResponsiveLayout();
        initSwipeGesture();
    }, 500);
});

// DOMContentLoaded'da da responsive ayarlamaları yap
document.addEventListener('DOMContentLoaded', () => {
    handleResponsiveLayout();
});
