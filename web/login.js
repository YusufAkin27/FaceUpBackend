// Socket.io yapılandırması
const SERVER_URL = 'https://api.yusufakin.xyz';
let socket = null;
let localStream = null;
let permissionRetryCount = 0;
const MAX_PERMISSION_RETRIES = 3;

// DOM Elementleri
const loginScreen = document.getElementById('loginScreen');
const loginForm = document.getElementById('loginForm');
const submitBtn = document.getElementById('submitBtn');
const errorToast = document.getElementById('errorToast');

// DOM elementlerinin yüklendiğini kontrol et
console.log('🔍 DOM Elementleri kontrol ediliyor:', {
    loginScreen: !!loginScreen,
    loginForm: !!loginForm,
    submitBtn: !!submitBtn,
    errorToast: !!errorToast
});

if (!loginScreen) {
    console.error('❌ loginScreen elementi bulunamadı!');
}


// Toast mesajı göster
function showToast(message, type = 'info') {
    if (errorToast) {
        errorToast.textContent = message;
        errorToast.className = `toast ${type} show`;
        setTimeout(() => {
            errorToast.classList.remove('show');
        }, 4000);
    }
}

// Protokol kontrolü - HTTP/HTTPS/localhost
function checkProtocol() {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || 
                       hostname === '127.0.0.1' || 
                       hostname === '[::1]' ||
                       hostname.startsWith('192.168.') ||
                       hostname.startsWith('10.') ||
                       hostname.startsWith('172.');
    
    // HTTPS veya localhost ise sorun yok
    if (protocol === 'https:' || isLocalhost) {
        return { valid: true, message: null };
    }
    
    // HTTP üzerindeyse uyar
    if (protocol === 'http:') {
        const message = '⚠️ Güvenlik nedeniyle kamera ve mikrofon erişimi için HTTPS veya localhost gereklidir. ' +
                       'Lütfen uygulamayı https:// ile açın veya localhost kullanın.';
        return { valid: false, message: message };
    }
    
    // Diğer protokoller (file:// gibi)
    return { valid: false, message: 'Kamera ve mikrofon erişimi için HTTPS veya localhost gereklidir.' };
}

// Sayfa yüklendiğinde protokol kontrolü yap
window.addEventListener('DOMContentLoaded', () => {
    const protocolCheck = checkProtocol();
    if (!protocolCheck.valid && protocolCheck.message) {
        showToast(protocolCheck.message, 'error');
        console.warn('Protokol uyarısı:', protocolCheck.message);
        
        // HTML'deki protokol uyarısını göster
        const protocolWarning = document.getElementById('protocolWarning');
        if (protocolWarning) {
            protocolWarning.style.display = 'block';
        }
    }
});

// İzin durumunu kontrol et (Permissions API)
async function checkPermissions() {
    try {
        if (navigator.permissions && navigator.permissions.query) {
            const cameraPermission = await navigator.permissions.query({ name: 'camera' });
            const microphonePermission = await navigator.permissions.query({ name: 'microphone' });
            
            return {
                camera: cameraPermission.state,
                microphone: microphonePermission.state
            };
        }
    } catch (error) {
        console.log('Permissions API desteklenmiyor veya hata:', error);
    }
    return null;
}

// Kamera ve mikrofon erişimi - izin verilene kadar dene
async function getLocalStream(retryCount = 0) {
    try {
        // Protokol kontrolü
        const protocolCheck = checkProtocol();
        if (!protocolCheck.valid) {
            const errorMsg = protocolCheck.message || 'Kamera ve mikrofon erişimi için HTTPS veya localhost gereklidir.';
            showToast(errorMsg, 'error');
            throw new Error('INVALID_PROTOCOL');
        }

        // Tarayıcı desteği kontrolü
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showToast('Tarayıcınız kamera ve mikrofon erişimini desteklemiyor. Lütfen Chrome, Firefox veya Edge kullanın.', 'error');
            return false;
        }

        // İzin durumunu kontrol et
        const permissions = await checkPermissions();
        if (permissions) {
            console.log('İzin durumu:', permissions);
            if (permissions.camera === 'denied' || permissions.microphone === 'denied') {
                showToast('Kamera veya mikrofon erişimi tarayıcı ayarlarından reddedilmiş. Lütfen ayarlardan izin verin.', 'error');
                return false;
            }
        }

        // Önce basit constraints ile dene (en uyumlu)
        let constraints = {
            video: true,
            audio: true
        };

        try {
            localStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (simpleError) {
            console.log('Basit constraints başarısız, gelişmiş constraints deneniyor...', simpleError);
            
            // Basit constraints başarısız olursa, gelişmiş constraints dene
            constraints = {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            };
            
            localStream = await navigator.mediaDevices.getUserMedia(constraints);
        }
        
        if (!localStream || localStream.getTracks().length === 0) {
            if (retryCount < MAX_PERMISSION_RETRIES) {
                console.log(`Stream alınamadı, tekrar deneniyor... (${retryCount + 1}/${MAX_PERMISSION_RETRIES})`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                return getLocalStream(retryCount + 1);
            }
            showToast('Kamera veya mikrofon erişilemedi. Lütfen cihazlarınızı kontrol edin.', 'error');
            return false;
        }

        console.log('✅ Kamera ve mikrofon erişimi başarılı');
        permissionRetryCount = 0;
        return true;
    } catch (error) {
        console.error('Medya erişim hatası:', error);
        
        // Protokol hatası
        if (error.message === 'INVALID_PROTOCOL') {
            return false;
        }
        
        // İzin reddedildiyse
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            const protocolCheck = checkProtocol();
            let errorMsg = 'Kamera ve mikrofon erişimi reddedildi. ';
            
            if (!protocolCheck.valid) {
                errorMsg += '⚠️ HTTP üzerinde çalışıyorsunuz. Lütfen HTTPS veya localhost kullanın. ';
            }
            
            errorMsg += 'Tarayıcı ayarlarından izin verin ve sayfayı yenileyin.';
            showToast(errorMsg, 'error');
            return false;
        } 
        // Cihaz bulunamadı
        else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            showToast('Kamera veya mikrofon bulunamadı. Lütfen cihazlarınızın bağlı olduğundan emin olun.', 'error');
            return false;
        } 
        // Cihaz başka uygulama tarafından kullanılıyor
        else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            showToast('Kamera veya mikrofon başka bir uygulama tarafından kullanılıyor. Lütfen diğer uygulamaları kapatın.', 'error');
            return false;
        } 
        // Constraints hatası
        else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
            showToast('Kamera veya mikrofon ayarları desteklenmiyor. Lütfen farklı bir cihaz deneyin.', 'error');
            return false;
        } 
        // SecurityError - genellikle HTTP protokolü nedeniyle
        else if (error.name === 'SecurityError' || error.name === 'NotSupportedError') {
            const protocolCheck = checkProtocol();
            let errorMsg = 'Güvenlik hatası: ';
            
            if (!protocolCheck.valid) {
                errorMsg += 'HTTP üzerinde çalışıyorsunuz. Kamera ve mikrofon erişimi için HTTPS veya localhost gereklidir. ';
                errorMsg += 'Lütfen uygulamayı https:// ile açın veya localhost kullanın.';
            } else {
                errorMsg += 'Tarayıcınız bu özelliği desteklemiyor. Lütfen Chrome, Firefox veya Edge kullanın.';
            }
            
            showToast(errorMsg, 'error');
            return false;
        } 
        // Diğer hatalar
        else {
            const protocolCheck = checkProtocol();
            let errorMsg = 'Kamera ve mikrofon erişimi alınamadı. ';
            
            if (!protocolCheck.valid) {
                errorMsg += '⚠️ HTTP üzerinde çalışıyorsunuz. HTTPS veya localhost kullanın. ';
            }
            
            errorMsg += 'Lütfen sayfayı yenileyin ve tekrar deneyin.';
            
            if (retryCount < MAX_PERMISSION_RETRIES) {
                console.log(`Hata oluştu, tekrar deneniyor... (${retryCount + 1}/${MAX_PERMISSION_RETRIES})`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                return getLocalStream(retryCount + 1);
            }
            
            showToast(errorMsg, 'error');
            return false;
        }
    }
}

// Kullanıcı bilgilerini localStorage'a kaydet
function saveUserInfo(name, surname) {
    localStorage.setItem('userName', name);
    localStorage.setItem('userSurname', surname || '');
}

// Ad soyadı ayır (ilk kelime ad, geri kalanı soyad - soyad opsiyonel)
function parseFullName(fullName) {
    const trimmed = fullName.trim();
    if (!trimmed) {
        return { name: '', surname: '' };
    }
    
    const parts = trimmed.split(/\s+/).filter(p => p.length > 0);
    if (parts.length === 1) {
        // Sadece bir kelime varsa, sadece ad olarak kullan, soyad boş
        return { name: parts[0], surname: '' };
    }
    
    // İlk kelime ad, geri kalanı soyad
    const name = parts[0];
    const surname = parts.slice(1).join(' ');
    return { name, surname };
}

// Giriş formu gönderimi
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fullNameInput = document.getElementById('fullName').value.trim();

    if (!fullNameInput) {
        showToast('Lütfen adınızı girin', 'error');
        return;
    }

    const { name, surname } = parseFullName(fullNameInput);

    if (!name) {
        showToast('Lütfen geçerli bir ad girin', 'error');
        return;
    }

    // Butonu devre dışı bırak
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>İzinler isteniyor...</span>';

    // Kamera ve mikrofon erişimi - izin verilene kadar dene
    const streamSuccess = await getLocalStream();
    if (!streamSuccess) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Başla</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>';
        return;
    }

    // Kullanıcı bilgilerini kaydet
    saveUserInfo(name, surname);

    // Buton metnini güncelle
    submitBtn.innerHTML = '<span>Bağlanıyor...</span>';

    // Socket bağlantısı
    console.log('Socket bağlantısı başlatılıyor:', SERVER_URL);
    socket = io(SERVER_URL, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 10000
    });

    // Bağlantı timeout kontrolü
    const connectionTimeout = setTimeout(() => {
        if (!socket.connected) {
            console.error('Socket bağlantısı zaman aşımına uğradı');
            showToast('Backend\'e bağlanılamadı. Lütfen backend\'in çalıştığından emin olun.', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Başla</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>';
            if (socket) {
                socket.disconnect();
                socket = null;
            }
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
                localStream = null;
            }
        }
    }, 10000);

    socket.on('connect', () => {
        console.log('✅ Socket bağlandı, ID:', socket.id);
        clearTimeout(connectionTimeout);
        console.log('📤 Register event gönderiliyor:', { name, surname: surname || '' });
        socket.emit('register', { name, surname: surname || '' });
    });

    socket.on('connect_error', (error) => {
        console.error('Socket bağlantı hatası:', error);
        clearTimeout(connectionTimeout);
        showToast('Backend\'e bağlanılamadı. Lütfen backend\'in çalıştığından emin olun.', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Başla</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>';
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }
    });

    socket.on('registered', (data) => {
        console.log('✅ Kayıt başarılı, data:', data);
        clearTimeout(connectionTimeout);
        
        // Socket bağlantısını kapat (waiting.html'de yeniden bağlanacak)
        if (socket) {
            socket.disconnect();
            socket = null;
        }
        
        // Stream'i durdur (waiting.html'de gerek yok)
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }
        
        // waiting.html'e yönlendir
        console.log('🔄 Bekleme ekranına yönlendiriliyor...');
        setTimeout(() => {
            window.location.href = 'waiting.html';
        }, 500);
    });

    // matched event'i artık waiting.html'de dinlenecek

    socket.on('error', (data) => {
        console.error('Socket hatası:', data);
        clearTimeout(connectionTimeout);
        showToast(data.message || 'Bir hata oluştu', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Başla</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>';
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }
    });

    socket.on('disconnect', (reason) => {
        console.log('Socket bağlantısı kesildi:', reason);
        clearTimeout(connectionTimeout);
        if (reason !== 'io client disconnect') {
            showToast('Bağlantı kesildi', 'error');
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
                localStream = null;
            }
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Başla</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>';
        }
    });
});

