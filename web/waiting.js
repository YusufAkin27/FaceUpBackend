// Socket.io yapılandırması
const SERVER_URL = 'https://api.yusufakin.xyz';
let socket = null;

// DOM Elementleri
const cancelBtn = document.getElementById('cancelBtn');
const errorToast = document.getElementById('errorToast');

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

// Kullanıcı bilgilerini localStorage'dan al
function getUserInfo() {
    const userName = localStorage.getItem('userName');
    const userSurname = localStorage.getItem('userSurname') || '';
    return { userName, userSurname };
}

// Socket bağlantısını başlat ve kayıt ol
function initializeWaiting() {
    const { userName, userSurname } = getUserInfo();

    if (!userName) {
        showToast('Kullanıcı bilgileri bulunamadı', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }

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
            if (socket) {
                socket.disconnect();
                socket = null;
            }
        }
    }, 10000);

    socket.on('connect', () => {
        console.log('✅ Socket bağlandı, ID:', socket.id);
        clearTimeout(connectionTimeout);
        console.log('📤 Register event gönderiliyor:', { name: userName, surname: userSurname });
        socket.emit('register', { name: userName, surname: userSurname });
    });

    socket.on('connect_error', (error) => {
        console.error('Socket bağlantı hatası:', error);
        clearTimeout(connectionTimeout);
        showToast('Backend\'e bağlanılamadı. Lütfen backend\'in çalıştığından emin olun.', 'error');
    });

    socket.on('registered', (data) => {
        console.log('✅ Kayıt başarılı, data:', data);
        clearTimeout(connectionTimeout);
        showToast('Kayıt başarılı, eşleşme aranıyor...', 'success');
    });

    socket.on('matched', (data) => {
        console.log('✅ Eşleşme yapıldı:', data);
        
        // Partner adını oluştur (soyad boş olabilir)
        let partnerName = 'Bilinmeyen';
        if (data.partner) {
            partnerName = data.partner.surname 
                ? `${data.partner.name} ${data.partner.surname}` 
                : data.partner.name;
        }
        
        // Eşleşme bilgilerini URL parametreleri ile call.html'e gönder
        const params = new URLSearchParams({
            roomId: data.roomId,
            isInitiator: data.isInitiator,
            partnerName: partnerName,
            partnerNameOnly: data.partner ? data.partner.name : '',
            partnerSurname: data.partner ? (data.partner.surname || '') : ''
        });

        // Socket bağlantısını kapat (call.html'de yeniden bağlanacak)
        if (socket) {
            socket.disconnect();
            socket = null;
        }

        // call.html'e yönlendir
        console.log('🔄 Call ekranına yönlendiriliyor...');
        setTimeout(() => {
            window.location.href = `call.html?${params.toString()}`;
        }, 500);
    });

    socket.on('error', (data) => {
        console.error('Socket hatası:', data);
        clearTimeout(connectionTimeout);
        showToast(data.message || 'Bir hata oluştu', 'error');
    });

    socket.on('disconnect', (reason) => {
        console.log('Socket bağlantısı kesildi:', reason);
        clearTimeout(connectionTimeout);
        if (reason !== 'io client disconnect') {
            showToast('Bağlantı kesildi', 'error');
        }
    });
}

// İptal butonu - login sayfasına yönlendir
if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
        if (socket) {
            socket.disconnect();
            socket = null;
        }
        
        // localStorage'dan kullanıcı bilgilerini temizle
        localStorage.removeItem('userName');
        localStorage.removeItem('userSurname');
        
        // Login sayfasına yönlendir
        window.location.href = 'index.html';
    });
}

// Sayfa yüklendiğinde bekleme ekranını başlat
window.addEventListener('DOMContentLoaded', () => {
    console.log('Bekleme ekranı yüklendi');
    initializeWaiting();
});

