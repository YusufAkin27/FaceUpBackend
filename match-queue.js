/**
 * Match Queue Manager
 * Bekleyen kullanıcıları yönetir ve rastgele eşleştirme yapar
 */

class MatchQueue {
  constructor() {
    // Bekleyen kullanıcılar: { userId: { socketId, name, joinedAt } }
    this.waitingUsers = new Map();
    
    // Aktif eşleşmeler: { userId: partnerUserId }
    this.activeMatches = new Map();
    
    // Son eşleşmeler (swipe için): { userId: Set([partnerId1, partnerId2, ...]) }
    this.recentMatches = new Map();
  }

  /**
   * Kullanıcıyı bekleme listesine ekle
   */
  addToQueue(userId, socketId, name) {
    if (this.activeMatches.has(userId)) {
      return false; // Zaten eşleşmiş
    }

    // Eğer zaten bekliyorsa, socket ID'yi güncelle
    if (this.waitingUsers.has(userId)) {
      const existing = this.waitingUsers.get(userId);
      existing.socketId = socketId; // Socket ID'yi güncelle
      return true;
    }

    this.waitingUsers.set(userId, {
      socketId,
      name,
      joinedAt: Date.now()
    });

    return true;
  }

  /**
   * Socket ID'yi güncelle (yeniden bağlanma durumunda)
   */
  updateSocketId(userId, newSocketId) {
    if (this.waitingUsers.has(userId)) {
      const userData = this.waitingUsers.get(userId);
      userData.socketId = newSocketId;
      return true;
    }
    return false;
  }

  /**
   * Kullanıcıyı bekleme listesinden çıkar
   */
  removeFromQueue(userId) {
    return this.waitingUsers.delete(userId);
  }

  /**
   * Rastgele bir eşleşme bul
   * @returns {Object|null} { user1, user2 } veya null
   */
  findMatch(userId) {
    if (this.waitingUsers.size < 2) {
      return null;
    }

    // Kendisi hariç bekleyen kullanıcıları al
    let availableUsers = Array.from(this.waitingUsers.entries())
      .filter(([id]) => id !== userId);

    if (availableUsers.length === 0) {
      return null;
    }

    // Son eşleşmeleri filtrele (aynı kişiyle tekrar eşleşmesin)
    const recentPartners = this.recentMatches.get(userId) || new Set();
    if (recentPartners.size > 0) {
      availableUsers = availableUsers.filter(([id]) => !recentPartners.has(id));
      
      // Eğer filtreden sonra kimse kalmadıysa, recent matches'i temizle ve tekrar dene
      if (availableUsers.length === 0) {
        this.recentMatches.delete(userId);
        availableUsers = Array.from(this.waitingUsers.entries())
          .filter(([id]) => id !== userId);
      }
    }

    if (availableUsers.length === 0) {
      return null;
    }

    // Rastgele bir kullanıcı seç
    const randomIndex = Math.floor(Math.random() * availableUsers.length);
    const [matchedUserId, matchedUserData] = availableUsers[randomIndex];

    const currentUserData = this.waitingUsers.get(userId);

    // Her iki kullanıcıyı da bekleme listesinden çıkar
    this.waitingUsers.delete(userId);
    this.waitingUsers.delete(matchedUserId);

    // Aktif eşleşmeleri kaydet
    this.activeMatches.set(userId, matchedUserId);
    this.activeMatches.set(matchedUserId, userId);

    // Son eşleşmeleri kaydet
    if (!this.recentMatches.has(userId)) {
      this.recentMatches.set(userId, new Set());
    }
    if (!this.recentMatches.has(matchedUserId)) {
      this.recentMatches.set(matchedUserId, new Set());
    }
    
    this.recentMatches.get(userId).add(matchedUserId);
    this.recentMatches.get(matchedUserId).add(userId);

    return {
      user1: {
        userId,
        socketId: currentUserData.socketId,
        name: currentUserData.name
      },
      user2: {
        userId: matchedUserId,
        socketId: matchedUserData.socketId,
        name: matchedUserData.name
      }
    };
  }

  /**
   * Aktif eşleşmeyi sonlandır
   */
  endMatch(userId) {
    const partnerId = this.activeMatches.get(userId);
    
    if (partnerId) {
      this.activeMatches.delete(userId);
      this.activeMatches.delete(partnerId);
      return partnerId;
    }

    return null;
  }

  /**
   * Kullanıcının partner'ını bul
   */
  getPartner(userId) {
    return this.activeMatches.get(userId);
  }

  /**
   * Kullanıcı bekleme listesinde mi?
   */
  isWaiting(userId) {
    return this.waitingUsers.has(userId);
  }

  /**
   * Kullanıcı eşleşmiş mi?
   */
  isMatched(userId) {
    return this.activeMatches.has(userId);
  }

  /**
   * Bekleyen kullanıcı sayısı
   */
  getWaitingCount() {
    return this.waitingUsers.size;
  }

  /**
   * Aktif eşleşme sayısı
   */
  getActiveMatchCount() {
    return this.activeMatches.size / 2; // Her eşleşme 2 kullanıcı
  }

  /**
   * Kullanıcıyı tamamen temizle (disconnect)
   */
  removeUser(userId) {
    this.waitingUsers.delete(userId);
    const partnerId = this.activeMatches.get(userId);
    if (partnerId) {
      this.activeMatches.delete(userId);
      this.activeMatches.delete(partnerId);
    }
    // Recent matches'i temizleme (kullanıcı geri geldiğinde aynı kişilerle eşleşebilir)
  }
}

module.exports = MatchQueue;
