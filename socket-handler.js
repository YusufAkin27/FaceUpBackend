/**
 * Socket.io Event Handlers
 */

const MatchQueue = require('./match-queue');

class SocketHandler {
  constructor(io) {
    this.io = io;
    this.matchQueue = new MatchQueue();
    
    // Kullanıcı bilgileri: { socketId: { userId, name } }
    this.userSessions = new Map();
    
    // Periyodik eşleştirme timer'ı
    this.matchingInterval = null;
    this.startPeriodicMatching();
  }

  /**
   * Periyodik eşleştirme başlat (her 1 saniyede bir - daha hızlı)
   */
  startPeriodicMatching() {
    this.matchingInterval = setInterval(() => {
      this.tryMatchAll();
    }, 1000); // 1 saniyede bir dene - daha hızlı eşleşme
  }

  /**
   * Tüm bekleyen kullanıcılar için eşleştirme dene
   */
  tryMatchAll() {
    // Bekleyen kullanıcıları al (match queue'dan)
    const waitingCount = this.matchQueue.getWaitingCount();
    
    if (waitingCount < 2) {
      return; // En az 2 bekleyen kullanıcı gerekli
    }

    // Tüm session'lardan bekleyen kullanıcıları bul
    const waitingUserIds = [];
    for (const [socketId, session] of this.userSessions.entries()) {
      const userId = session.userId;
      if (this.matchQueue.isWaiting(userId) && !this.matchQueue.isMatched(userId)) {
        waitingUserIds.push(userId);
      }
    }
    
    // Eğer 2 veya daha fazla bekleyen varsa, çiftler halinde eşleştir
    if (waitingUserIds.length >= 2) {
      // Rastgele sırayla dene (karıştır)
      const shuffled = waitingUserIds.sort(() => Math.random() - 0.5);
      
      // Çiftler halinde eşleştir
      for (let i = 0; i < shuffled.length - 1; i += 2) {
        const userId1 = shuffled[i];
        const userId2 = shuffled[i + 1];
        
        // Her iki kullanıcı da hala bekliyor ve eşleşmemişse
        if (this.matchQueue.isWaiting(userId1) && !this.matchQueue.isMatched(userId1) &&
            this.matchQueue.isWaiting(userId2) && !this.matchQueue.isMatched(userId2)) {
          // Direkt eşleştir
          const match = this.matchQueue.findMatch(userId1);
          if (match) {
            const { user1, user2 } = match;
            console.log(`🎯 Eşleşme bulundu: ${user1.name} <-> ${user2.name}`);
            console.log(`🔌 Socket ID'ler: ${user1.socketId} <-> ${user2.socketId}`);
            
            // Socket ID'lerin geçerli olduğundan emin ol
            const socket1Exists = this.userSessions.has(user1.socketId);
            const socket2Exists = this.userSessions.has(user2.socketId);
            
            console.log(`🔌 Socket 1 var mı: ${socket1Exists}, Socket 2 var mı: ${socket2Exists}`);
            
            // Her iki kullanıcıya da eşleşme bildir
            const matchedData1 = {
              partnerId: user2.userId,
              partnerName: user2.name,
              message: 'Eşleşme bulundu!'
            };
            
            const matchedData2 = {
              partnerId: user1.userId,
              partnerName: user1.name,
              message: 'Eşleşme bulundu!'
            };
            
            console.log(`📤 User1'e gönderiliyor: ${JSON.stringify(matchedData1)}`);
            console.log(`📤 User2'ye gönderiliyor: ${JSON.stringify(matchedData2)}`);
            
            // Socket nesnelerini al ve kontrol et
            const socket1 = this.io.sockets.sockets.get(user1.socketId);
            const socket2 = this.io.sockets.sockets.get(user2.socketId);
            
            if (socket1 && socket1.connected) {
              socket1.emit('matched', matchedData1);
            } else {
              console.log(`❌ Socket1 bulunamadı veya bağlı değil: ${user1.socketId}`);
            }
            
            if (socket2 && socket2.connected) {
              socket2.emit('matched', matchedData2);
            } else {
              console.log(`❌ Socket2 bulunamadı veya bağlı değil: ${user2.socketId}`);
            }
            
            console.log(`✅ Matched event'leri gönderildi`);
          }
        }
      }
    }
  }

  /**
   * Socket bağlantısı kurulduğunda
   */
  handleConnection(socket) {
    console.log(`✅ Yeni bağlantı: ${socket.id}`);

    // Kullanıcı ad soyad ile giriş yapar
    socket.on('join', (data) => {
      this.handleJoin(socket, data);
    });

    // Eşleştirme başlat
    socket.on('start-matching', () => {
      this.handleStartMatching(socket);
    });

    // Sonraki kişiye geç (swipe)
    socket.on('next-partner', () => {
      this.handleNextPartner(socket);
    });

    // Video frame gönder
    socket.on('video-frame', (data) => {
      this.handleVideoFrame(socket, data);
    });

    // Audio frame gönder
    socket.on('audio-frame', (data) => {
      this.handleAudioFrame(socket, data);
    });

    // Mesaj gönder (emoji veya metin)
    socket.on('send-message', (data) => {
      this.handleMessage(socket, data);
    });

    // Bağlantı kesildiğinde
    socket.on('disconnect', () => {
      this.handleDisconnect(socket);
    });
  }

  /**
   * Kullanıcı girişi (ad soyad)
   */
  handleJoin(socket, data) {
    const { userId, name } = data;

    if (!userId || !name) {
      socket.emit('error', { message: 'Kullanıcı ID ve ad soyad gerekli' });
      return;
    }

    // Kullanıcı bilgilerini kaydet
    this.userSessions.set(socket.id, { userId, name });
    
    console.log(`👤 Kullanıcı giriş yaptı: ${name} (${userId})`);
    
    socket.emit('joined', { 
      success: true, 
      message: 'Başarıyla giriş yapıldı',
      userId,
      name
    });
  }

  /**
   * Eşleştirme başlat
   */
  handleStartMatching(socket) {
    const session = this.userSessions.get(socket.id);
    
    if (!session) {
      socket.emit('error', { message: 'Önce giriş yapmalısınız' });
      return;
    }

    const { userId, name } = session;

    // Zaten eşleşmiş mi kontrol et
    if (this.matchQueue.isMatched(userId)) {
      socket.emit('error', { message: 'Zaten eşleşmişsiniz' });
      return;
    }

    // Socket ID'yi güncelle (yeniden bağlanma durumunda)
    // Önce eski socket ID'yi kontrol et ve güncelle
    const existingWaiting = this.matchQueue.isWaiting(userId);
    if (existingWaiting) {
      // Kullanıcı zaten bekliyor, socket ID'yi güncelle
      this.matchQueue.updateSocketId(userId, socket.id);
    }

    // Bekleme listesine ekle
    const added = this.matchQueue.addToQueue(userId, socket.id, name);
    
    if (!added && !this.matchQueue.isWaiting(userId)) {
      // Eğer zaten bekliyorsa hata verme, sadece bilgilendir
      socket.emit('matching-started', { 
        message: 'Eşleştirme devam ediyor...',
        waitingCount: this.matchQueue.getWaitingCount()
      });
      return;
    }

    console.log(`🔍 Eşleştirme başlatıldı: ${name} (${userId}), Socket: ${socket.id}`);
    socket.emit('matching-started', { 
      message: 'Eşleştirme başlatıldı, bekleniyor...',
      waitingCount: this.matchQueue.getWaitingCount()
    });

    // Hemen eşleştirme dene
    setTimeout(() => {
      this.tryMatchAll(); // tryMatchAll kullan
    }, 100);
  }

  /**
   * Eşleştirme dene (artık kullanılmıyor, tryMatchAll kullanılıyor)
   */
  tryMatch(userId) {
    // tryMatchAll kullanılıyor, bu fonksiyon artık kullanılmıyor
    this.tryMatchAll();
  }

  /**
   * Sonraki kişiye geç (swipe)
   */
  handleNextPartner(socket) {
    const session = this.userSessions.get(socket.id);
    
    if (!session) {
      socket.emit('error', { message: 'Önce giriş yapmalısınız' });
      return;
    }

    const { userId, name } = session;

    // Mevcut partner'ı bul ve eşleşmeyi sonlandır
    const partnerId = this.matchQueue.getPartner(userId);

    if (partnerId) {
      // Eşleşmeyi sonlandır
      this.matchQueue.endMatch(userId);
      
      // Partner'ın socket ID'sini bul
      const partnerSocketId = this.findSocketIdByUserId(partnerId);
      if (partnerSocketId) {
        const partnerSession = this.userSessions.get(partnerSocketId);
        if (partnerSession) {
          // Socket nesnesini al ve kontrol et
          const partnerSocket = this.io.sockets.sockets.get(partnerSocketId);
          if (partnerSocket && partnerSocket.connected) {
            // Partner'a bildir
            partnerSocket.emit('partner-left', {
              message: 'Partner ayrıldı, yeni eşleşme aranıyor...'
            });
          }

          // Partner'ı otomatik olarak yeni eşleştirmeye başlat
          setTimeout(() => {
            if (!this.matchQueue.isMatched(partnerId)) {
              this.matchQueue.addToQueue(partnerId, partnerSocketId, partnerSession.name);
              this.tryMatch(partnerId);
            }
          }, 100);
        }
      }
    }

    // Mevcut kullanıcıyı bekleme listesine ekle ve yeni eşleşme ara
    this.matchQueue.removeFromQueue(userId);
    this.matchQueue.addToQueue(userId, socket.id, name);
    
    socket.emit('next-partner-started', {
      message: 'Yeni eşleşme aranıyor...'
    });

    // Hemen eşleştirme dene
    this.tryMatch(userId);
  }

  /**
   * Video frame işle
   */
  handleVideoFrame(socket, data) {
    const session = this.userSessions.get(socket.id);
    
    if (!session) {
      console.log(`❌ Video frame: Session bulunamadı (socket: ${socket.id})`);
      return;
    }

    const { userId } = session;
    const partnerId = this.matchQueue.getPartner(userId);

    if (!partnerId) {
      console.log(`❌ Video frame: Eşleşme yok (userId: ${userId})`);
      return; // Eşleşme yok
    }

    // Partner'ın socket ID'sini bul
    const partnerSocketId = this.findSocketIdByUserId(partnerId);
    
    if (!partnerSocketId) {
      console.log(`❌ Video frame: Partner socket ID bulunamadı (partnerId: ${partnerId})`);
      return;
    }

    // Socket nesnesini al ve kontrol et
    const partnerSocket = this.io.sockets.sockets.get(partnerSocketId);
    if (!partnerSocket) {
      console.log(`❌ Video frame: Partner socket bulunamadı (socketId: ${partnerSocketId})`);
      return;
    }

    if (!partnerSocket.connected) {
      console.log(`❌ Video frame: Partner socket bağlı değil (socketId: ${partnerSocketId})`);
      return;
    }

    // Frame verisi kontrolü
    if (!data || !data.frame) {
      console.log(`❌ Video frame: Frame verisi yok (userId: ${userId})`);
      return;
    }

    try {
      // Video frame'i partner'a gönder (base64 string olarak)
      partnerSocket.emit('video-frame', {
        frame: data.frame, // Base64 encoded string
        from: userId
      });
      
      // Debug: Frame gönderildi (her frame'de log - sorun tespiti için)
      const frameSize = typeof data.frame === 'string' ? data.frame.length : 'unknown';
      console.log(`📹 Video frame gönderildi: ${userId} -> ${partnerId} (size: ${frameSize} chars)`);
    } catch (error) {
      console.error(`❌ Video frame gönderme hatası: ${error.message}`);
    }
  }

  /**
   * Audio frame işle
   */
  handleAudioFrame(socket, data) {
    const session = this.userSessions.get(socket.id);
    
    if (!session) {
      return;
    }

    const { userId } = session;
    const partnerId = this.matchQueue.getPartner(userId);

    if (!partnerId) {
      return; // Eşleşme yok
    }

    // Partner'ın socket ID'sini bul
    const partnerSocketId = this.findSocketIdByUserId(partnerId);
    
    if (partnerSocketId) {
      // Socket nesnesini al ve kontrol et
      const partnerSocket = this.io.sockets.sockets.get(partnerSocketId);
      if (partnerSocket && partnerSocket.connected) {
        // Audio frame'i partner'a gönder
        partnerSocket.emit('audio-frame', {
          audio: data.audio,
          from: userId
        });
      }
    }
  }

  /**
   * Mesaj işle (emoji veya metin)
   */
  handleMessage(socket, data) {
    const session = this.userSessions.get(socket.id);
    
    if (!session) {
      return;
    }

    const { userId, name } = session;
    const partnerId = this.matchQueue.getPartner(userId);

    if (!partnerId) {
      return; // Eşleşme yok
    }

    // Partner'ın socket ID'sini bul
    const partnerSocketId = this.findSocketIdByUserId(partnerId);
    
    if (partnerSocketId) {
      // Socket nesnesini al ve kontrol et
      const partnerSocket = this.io.sockets.sockets.get(partnerSocketId);
      if (partnerSocket && partnerSocket.connected) {
        // Mesajı partner'a gönder
        partnerSocket.emit('message-received', {
          message: data.message,
          emoji: data.emoji,
          from: userId,
          fromName: name,
          timestamp: Date.now()
        });
      }
    }
  }

  /**
   * Bağlantı kesildiğinde
   */
  handleDisconnect(socket) {
    const session = this.userSessions.get(socket.id);
    
    if (session) {
      const { userId } = session;
      
      // Partner'ı bul ve bildir
      const partnerId = this.matchQueue.getPartner(userId);
      
      if (partnerId) {
        const partnerSocketId = this.findSocketIdByUserId(partnerId);
        if (partnerSocketId) {
          // Socket nesnesini al ve kontrol et
          const partnerSocket = this.io.sockets.sockets.get(partnerSocketId);
          if (partnerSocket && partnerSocket.connected) {
            partnerSocket.emit('partner-disconnected', {
              message: 'Partner bağlantısı kesildi'
            });
          }
          
          // Partner'ı bekleme listesine ekle
          const partnerSession = this.userSessions.get(partnerSocketId);
          if (partnerSession) {
            this.matchQueue.endMatch(userId);
            this.matchQueue.addToQueue(partnerId, partnerSocketId, partnerSession.name);
          }
        }
      }

      // Kullanıcıyı temizle
      this.matchQueue.removeUser(userId);
      this.userSessions.delete(socket.id);
      
      console.log(`❌ Kullanıcı ayrıldı: ${session.name} (${userId})`);
    }
  }

  /**
   * User ID ile Socket ID bul
   */
  findSocketIdByUserId(userId) {
    for (const [socketId, session] of this.userSessions.entries()) {
      if (session && session.userId === userId) {
        return socketId;
      }
    }
    return null;
  }

  /**
   * İstatistikler
   */
  getStats() {
    return {
      waitingUsers: this.matchQueue.getWaitingCount(),
      activeMatches: this.matchQueue.getActiveMatchCount(),
      totalConnections: this.userSessions.size
    };
  }
}

module.exports = SocketHandler;
