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
    
    // UserId -> SocketId mapping (O(1) lookup için)
    this.userIdToSocketId = new Map();
    
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
            
            // Socket nesnelerini al ve kontrol et (atomic check + double-check)
            const socket1 = this.io.sockets.sockets.get(user1.socketId);
            const socket2 = this.io.sockets.sockets.get(user2.socketId);
            
            // Double-check: Her iki kullanıcı da hala eşleşmemiş ve bekliyor mu?
            if (!this.matchQueue.isWaiting(userId1) || this.matchQueue.isMatched(userId1) ||
                !this.matchQueue.isWaiting(userId2) || this.matchQueue.isMatched(userId2)) {
              // Eşleşme durumu değişmiş, işlemi iptal et
              return;
            }
            
            // Her iki socket de bağlı mı kontrol et
            if (!socket1 || !socket1.connected || !socket2 || !socket2.connected) {
              // Socket'ler bağlı değil, eşleşmeyi geri al
              this.matchQueue.endMatch(userId1);
              return;
            }
            
            try {
              // Her iki kullanıcıya da eşleşme bildir
              socket1.emit('matched', matchedData1);
              socket2.emit('matched', matchedData2);
            } catch (error) {
              // Hata durumunda eşleşmeyi geri al
              this.matchQueue.endMatch(userId1);
            }
          }
        }
      }
    }
  }

  /**
   * Socket bağlantısı kurulduğunda
   */
  handleConnection(socket) {
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
    // UserId -> SocketId mapping'i güncelle
    this.userIdToSocketId.set(userId, socket.id);
    
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
      // UserId -> SocketId mapping'i güncelle
      this.userIdToSocketId.set(userId, socket.id);
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
          // Socket nesnesini al ve kontrol et (atomic check)
          const partnerSocket = this.io.sockets.sockets.get(partnerSocketId);
          if (partnerSocket && partnerSocket.connected) {
            try {
              // Partner'a bildir
              partnerSocket.emit('partner-left', {
                message: 'Partner ayrıldı, yeni eşleşme aranıyor...'
              });
            } catch (error) {
              // Hata sessizce yok sayılıyor
            }
          }

          // Partner'ı otomatik olarak yeni eşleştirmeye başlat
          setTimeout(() => {
            // Double-check: Partner hala bağlı ve eşleşmemiş mi?
            const currentPartnerSocket = this.io.sockets.sockets.get(partnerSocketId);
            if (currentPartnerSocket && currentPartnerSocket.connected && 
                !this.matchQueue.isMatched(partnerId)) {
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
      return; // Session bulunamadı, sessizce çık
    }

    const { userId } = session;
    const partnerId = this.matchQueue.getPartner(userId);

    if (!partnerId) {
      return; // Eşleşme yok, sessizce çık
    }

    // Partner'ın socket ID'sini bul
    const partnerSocketId = this.findSocketIdByUserId(partnerId);
    
    if (!partnerSocketId) {
      return; // Partner socket ID bulunamadı, sessizce çık
    }

    // Socket nesnesini al ve kontrol et (atomic check)
    const partnerSocket = this.io.sockets.sockets.get(partnerSocketId);
    if (!partnerSocket || !partnerSocket.connected) {
      return; // Socket bulunamadı veya bağlı değil, sessizce çık
    }

    // Frame verisi kontrolü
    if (!data || !data.frame) {
      return; // Frame verisi yok, sessizce çık
    }

    // Frame buffer size kontrolü (max 10MB)
    const MAX_FRAME_SIZE = 10 * 1024 * 1024; // 10MB
    const frameSize = typeof data.frame === 'string' ? Buffer.byteLength(data.frame, 'utf8') : 0;
    
    if (frameSize > MAX_FRAME_SIZE) {
      return;
    }

    try {
      // Video frame'i partner'a gönder (base64 string olarak)
      partnerSocket.emit('video-frame', {
        frame: data.frame, // Base64 encoded string
        from: userId
      });
    } catch (error) {
      // Hata sessizce yok sayılıyor
    }
  }

  /**
   * Audio frame işle
   */
  handleAudioFrame(socket, data) {
    try {
      const session = this.userSessions.get(socket.id);
      
      if (!session) {
        return;
      }

      const { userId } = session;
      const partnerId = this.matchQueue.getPartner(userId);

      if (!partnerId) {
        return; // Eşleşme yok
      }

      // Audio verisi kontrolü
      if (!data || !data.audio) {
        return;
      }

      // Audio buffer size kontrolü (max 1MB)
      const MAX_AUDIO_SIZE = 1024 * 1024; // 1MB
      const audioSize = typeof data.audio === 'string' ? Buffer.byteLength(data.audio, 'utf8') : 
                        Buffer.isBuffer(data.audio) ? data.audio.length : 0;
      
      if (audioSize > MAX_AUDIO_SIZE) {
        return;
      }

      // Partner'ın socket ID'sini bul
      const partnerSocketId = this.findSocketIdByUserId(partnerId);
      
      if (!partnerSocketId) {
        return;
      }

      // Socket nesnesini al ve kontrol et (atomic check)
      const partnerSocket = this.io.sockets.sockets.get(partnerSocketId);
      if (!partnerSocket || !partnerSocket.connected) {
        return;
      }

      // Audio frame'i partner'a gönder
      partnerSocket.emit('audio-frame', {
        audio: data.audio,
        from: userId
      });
    } catch (error) {
      // Hata sessizce yok sayılıyor
    }
  }

  /**
   * Mesaj işle (emoji veya metin)
   */
  handleMessage(socket, data) {
    try {
      const session = this.userSessions.get(socket.id);
      
      if (!session) {
        return;
      }

      const { userId, name } = session;
      const partnerId = this.matchQueue.getPartner(userId);

      if (!partnerId) {
        return; // Eşleşme yok
      }

      // Mesaj verisi kontrolü
      if (!data || (!data.message && !data.emoji)) {
        return;
      }

      // Partner'ın socket ID'sini bul
      const partnerSocketId = this.findSocketIdByUserId(partnerId);
      
      if (!partnerSocketId) {
        return;
      }

      // Socket nesnesini al ve kontrol et (atomic check)
      const partnerSocket = this.io.sockets.sockets.get(partnerSocketId);
      if (!partnerSocket || !partnerSocket.connected) {
        return;
      }

      // Mesajı partner'a gönder
      partnerSocket.emit('message-received', {
        message: data.message,
        emoji: data.emoji,
        from: userId,
        fromName: name,
        timestamp: Date.now()
      });
    } catch (error) {
      // Hata sessizce yok sayılıyor
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
          // Socket nesnesini al ve kontrol et (atomic check)
          const partnerSocket = this.io.sockets.sockets.get(partnerSocketId);
          if (partnerSocket && partnerSocket.connected) {
            try {
              partnerSocket.emit('partner-disconnected', {
                message: 'Partner bağlantısı kesildi'
              });
            } catch (error) {
              // Hata sessizce yok sayılıyor
            }
          }
          
          // Partner'ı bekleme listesine ekle
          const partnerSession = this.userSessions.get(partnerSocketId);
          if (partnerSession) {
            this.matchQueue.endMatch(userId);
            // Double-check: Partner socket hala geçerli mi?
            const currentPartnerSocket = this.io.sockets.sockets.get(partnerSocketId);
            if (currentPartnerSocket && currentPartnerSocket.connected) {
              this.matchQueue.addToQueue(partnerId, partnerSocketId, partnerSession.name);
            }
          }
        }
      }

      // Kullanıcıyı temizle
      this.matchQueue.removeUser(userId);
      this.userSessions.delete(socket.id);
      this.userIdToSocketId.delete(userId);
    }
  }

  /**
   * User ID ile Socket ID bul (O(1) lookup)
   */
  findSocketIdByUserId(userId) {
    return this.userIdToSocketId.get(userId) || null;
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

  /**
   * Cleanup - interval'ları temizle ve kaynakları serbest bırak
   */
  cleanup() {
    if (this.matchingInterval) {
      clearInterval(this.matchingInterval);
      this.matchingInterval = null;
    }
  }
}

module.exports = SocketHandler;
