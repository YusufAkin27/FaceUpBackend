const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// CORS ayarları - web ve mobil uygulamalar için
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());

// Aktif kullanıcılar ve beklemede olanlar
const waitingUsers = [];
const activeRooms = new Map(); // roomId -> { users: [socketId1, socketId2] }

// Kullanıcı bilgilerini sakla
const userInfo = new Map(); // socketId -> { name, surname, status: 'waiting' | 'active' }

// Mesaj geçmişi (roomId -> messages[])
const roomMessages = new Map();

// Socket ID'den room ID bulma (kullanıcı hangi odada)
const userRoomMap = new Map(); // socketId -> roomId

// Fisher-Yates shuffle algoritması
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Socket'in hala bağlı olup olmadığını kontrol et
function isSocketConnected(socketId) {
  return io.sockets.sockets.has(socketId);
}

// Kullanıcıyı bekleme listesine ekle (duplicate kontrolü ile)
function addToWaitingList(socketId) {
  if (!isSocketConnected(socketId)) {
    return false;
  }

  // Zaten bekleme listesinde değilse ekle
  if (!waitingUsers.includes(socketId)) {
    waitingUsers.push(socketId);
    const user = userInfo.get(socketId);
    if (user) {
      user.status = 'waiting';
    }
    return true;
  }
  return false;
}

// Kullanıcıyı bekleme listesinden çıkar
function removeFromWaitingList(socketId) {
  const index = waitingUsers.indexOf(socketId);
  if (index > -1) {
    waitingUsers.splice(index, 1);
    return true;
  }
  return false;
}

// Odayı temizle ve kullanıcıları bekleme listesine ekle
function cleanupRoom(roomId, addToWaiting = true) {
  const room = activeRooms.get(roomId);
  if (!room) return;

  // Eğer matched users varsa, room'u temizlemeden önce kontrol et
  // Matched users varsa, kullanıcılar call screen'e geçiyor olabilir
  const hasMatchedUsers = room.matchedUsers && room.matchedUsers.length > 0;
  
  if (hasMatchedUsers) {
    // Matched users varsa, sadece gerçekten boş olduğunda temizle
    const hasConnectedUsers = room.users.some(id => id && isSocketConnected(id));
    if (hasConnectedUsers) {
      console.log(`Room ${roomId} temizlenmiyor (matched users var ve bağlı kullanıcı var)`);
      return; // Room'u koru
    }
  }

  // Her iki kullanıcıyı da bekleme listesine ekle
  if (addToWaiting) {
    room.users.forEach(socketId => {
      if (socketId && isSocketConnected(socketId)) {
        addToWaitingList(socketId);
        userRoomMap.delete(socketId);
      }
    });
    
    // Matched users varsa onları da bekleme listesine ekle
    if (room.matchedUsers) {
      room.matchedUsers.forEach(socketId => {
        if (socketId && isSocketConnected(socketId) && !room.users.includes(socketId)) {
          addToWaitingList(socketId);
          userRoomMap.delete(socketId);
        }
      });
    }
  } else {
    room.users.forEach(socketId => {
      if (socketId) {
        userRoomMap.delete(socketId);
      }
    });
    
    // Matched users varsa onları da temizle
    if (room.matchedUsers) {
      room.matchedUsers.forEach(socketId => {
        if (socketId) {
          userRoomMap.delete(socketId);
        }
      });
    }
  }

  // Odayı temizle
  activeRooms.delete(roomId);
  roomMessages.delete(roomId);
  console.log(`Room ${roomId} temizlendi`);
}

// Global matching fonksiyonu
function tryMatchUsers() {
  // Bağlantısı kopmuş kullanıcıları temizle
  const validWaitingUsers = waitingUsers.filter(id => isSocketConnected(id));
  waitingUsers.length = 0;
  waitingUsers.push(...validWaitingUsers);

  if (waitingUsers.length >= 2) {
    // Random shuffle
    const shuffled = shuffleArray(waitingUsers);
    
    // İlk iki kullanıcıyı al
    const user1 = shuffled.shift();
    const user2 = shuffled.shift();

    // Bekleme listesini güncelle
    waitingUsers.length = 0;
    waitingUsers.push(...shuffled);

    // Kullanıcıların hala bağlı olduğunu kontrol et
    if (!isSocketConnected(user1) || !isSocketConnected(user2)) {
      // Bağlantısı kopmuş kullanıcıları bekleme listesine geri ekleme
      if (isSocketConnected(user1)) addToWaitingList(user1);
      if (isSocketConnected(user2)) addToWaitingList(user2);
      // Tekrar dene
      if (waitingUsers.length >= 2) {
        tryMatchUsers();
      }
      return;
    }

    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Kullanıcı bilgilerini al
    const user1Info = userInfo.get(user1);
    const user2Info = userInfo.get(user2);
    
    // Odaya ekle - users array'ini null ile başlat (join-room event'i geldiğinde doldurulacak)
    activeRooms.set(roomId, {
      users: [null, null], // join-room event'i geldiğinde doldurulacak
      createdAt: Date.now(),
      matchedUsers: [user1, user2], // Eşleşen socket ID'leri sakla (referans için)
      matchedUserInfo: [
        user1Info ? { name: user1Info.name, surname: user1Info.surname } : null,
        user2Info ? { name: user2Info.name, surname: user2Info.surname } : null
      ] // Eşleşen kullanıcı bilgileri (join-room'da kullanılacak)
    });

    // Kullanıcı durumlarını güncelle
    if (user1Info) user1Info.status = 'active';
    if (user2Info) user2Info.status = 'active';

    // Kullanıcı-room mapping (waiting screen socket ID'leri için)
    userRoomMap.set(user1, roomId);
    userRoomMap.set(user2, roomId);

    // Mesaj geçmişi başlat
    roomMessages.set(roomId, []);

    // Her iki kullanıcıya da eşleşme bildir
    const user1MatchedData = {
      roomId,
      partner: user2Info ? { name: user2Info.name, surname: user2Info.surname } : null,
      isInitiator: true
    };
    const user2MatchedData = {
      roomId,
      partner: user1Info ? { name: user1Info.name, surname: user1Info.surname } : null,
      isInitiator: false
    };
    
    console.log(`[MATCH] User1 (${user1}) matched event gönderiliyor:`, user1MatchedData);
    console.log(`[MATCH] User2 (${user2}) matched event gönderiliyor:`, user2MatchedData);
    
    io.to(user1).emit('matched', user1MatchedData);
    io.to(user2).emit('matched', user2MatchedData);
    
    console.log(`[MATCH] User1 socket bağlı mı? ${isSocketConnected(user1)}`);
    console.log(`[MATCH] User2 socket bağlı mı? ${isSocketConnected(user2)}`);

    // Her iki kullanıcıyı da odaya ekle
    io.sockets.sockets.get(user1)?.join(roomId);
    io.sockets.sockets.get(user2)?.join(roomId);

    console.log(`Eşleşme yapıldı: ${user1} <-> ${user2} (Room: ${roomId})`);

    // Hala eşleşebilecek kullanıcılar varsa tekrar dene
    if (waitingUsers.length >= 2) {
      tryMatchUsers();
    }
  }
}

io.on('connection', (socket) => {
  console.log('Yeni kullanıcı bağlandı:', socket.id);

  // Kullanıcı kaydı - ad soyad ile
  socket.on('register', (data) => {
    try {
      const { name, surname } = data;
      if (!name) {
        socket.emit('error', { message: 'Ad gereklidir' });
        return;
      }

      // Soyad boş olabilir
      const userSurname = surname ? surname.trim() : '';

      // Kullanıcı bilgisini kaydet
      userInfo.set(socket.id, { 
        name: name.trim(), 
        surname: userSurname,
        status: 'waiting'
      });
      const displayName = userSurname ? `${name} ${userSurname}` : name;
      console.log(`Kullanıcı kaydedildi: ${displayName} (${socket.id})`);

      // Eşleşme için bekleme listesine ekle
      addToWaitingList(socket.id);
      socket.emit('registered', { success: true });

      // Eşleşme dene
      tryMatchUsers();
    } catch (error) {
      console.error('Register hatası:', error);
      socket.emit('error', { message: 'Kayıt sırasında hata oluştu' });
    }
  });

  // Room'a join (call.html'den yeni socket bağlantısı için)
  socket.on('join-room', (data) => {
    console.log(`[JOIN-ROOM] join-room event alındı! Socket: ${socket.id}, Data:`, data);
    try {
      const { roomId, name, surname } = data;
      if (!roomId || !name) {
        console.error(`[JOIN-ROOM] ❌ Eksik parametreler! roomId: ${roomId}, name: ${name}`);
        socket.emit('error', { message: 'Room ID ve ad gereklidir' });
        return;
      }
      
      // Soyad boş olabilir
      const userSurname = surname ? surname.trim() : '';
      const userName = name.trim();

      const room = activeRooms.get(roomId);
      if (!room) {
        console.error(`Room bulunamadı: ${roomId}, Aktif room'lar:`, Array.from(activeRooms.keys()));
        socket.emit('error', { message: 'Oda bulunamadı' });
        return;
      }
      
      console.log(`[JOIN-ROOM] Kullanıcı: ${userName} ${userSurname} (${socket.id}), Room: ${roomId}`);
      console.log(`[JOIN-ROOM] Room durumu - Kullanıcılar:`, room.users);
      console.log(`[JOIN-ROOM] Matched users:`, room.matchedUsers);
      console.log(`[JOIN-ROOM] Matched user info:`, room.matchedUserInfo);

      // Kullanıcı bilgisini kaydet
      userInfo.set(socket.id, { 
        name: userName, 
        surname: userSurname,
        status: 'active'
      });

      // Room'daki boş slot'u veya bağlantısı kopmuş socket'i bul
      // Öncelik: matchedUserInfo ile eşleşme (null veya bağlantısı kopmuş socket kontrolü ile) > null slot > bağlantısı kopmuş socket > kullanıcı adı eşleşmesi
      let slotIndex = -1;
      let oldSocketId = null;
      let foundBy = '';
      
      // Önce matchedUserInfo ile eşleşme kontrolü yap (en güvenilir yöntem)
      // Bu kontrol, slot null olsa da veya bağlantısı kopmuş socket olsa da eşleşmeyi bulur
      if (room.matchedUserInfo) {
        console.log(`[JOIN-ROOM] matchedUserInfo ile eşleşme kontrolü yapılıyor...`);
        console.log(`[JOIN-ROOM] Aranan: name="${userName}", surname="${userSurname}"`);
        for (let i = 0; i < room.matchedUserInfo.length; i++) {
          const matchedInfo = room.matchedUserInfo[i];
          console.log(`[JOIN-ROOM] Slot ${i}: matchedInfo=`, matchedInfo, `room.users[${i}]=`, room.users[i]);
          if (matchedInfo && 
              matchedInfo.name === userName && 
              matchedInfo.surname === userSurname) {
            // Bu slot'a ait olmalı - slot null ise veya bağlantısı kopmuş socket varsa kullan
            // Ayrıca, eğer slot zaten bu socket ID'ye aitse de kullan (aynı kullanıcı tekrar bağlanıyor olabilir)
            const currentSocketId = room.users[i];
            if (currentSocketId === null || 
                !isSocketConnected(currentSocketId) || 
                currentSocketId === socket.id) {
              slotIndex = i;
              oldSocketId = currentSocketId === socket.id ? null : currentSocketId;
              foundBy = `matchedUserInfo (slot ${i}, ${currentSocketId === null ? 'null' : (currentSocketId === socket.id ? 'same-socket' : 'disconnected')})`;
              console.log(`[JOIN-ROOM] ✅ ${foundBy} ile slot bulundu: ${i}, eski socket: ${oldSocketId || 'none'}`);
              break;
            } else {
              // Slot dolu ve bağlı bir socket var - bu kullanıcı için başka slot ara
              console.log(`[JOIN-ROOM] ⚠️ Slot ${i} dolu ve bağlı (${currentSocketId}), başka slot aranıyor...`);
            }
          } else {
            console.log(`[JOIN-ROOM] Slot ${i} eşleşmedi: matchedInfo.name="${matchedInfo?.name}", matchedInfo.surname="${matchedInfo?.surname}"`);
          }
        }
      }
      
      // Eğer matchedUserInfo ile bulunamadıysa, null slot ara
      // Bu, matchedUserInfo ile eşleşme bulunamadığında veya slot dolu olduğunda kullanılır
      if (slotIndex === -1) {
        slotIndex = room.users.findIndex(id => id === null);
        if (slotIndex !== -1) {
          foundBy = `null slot (${slotIndex})`;
          console.log(`[JOIN-ROOM] ${foundBy} bulundu (matchedUserInfo ile eşleşme bulunamadı)`);
        }
      }
      
      // Null slot yoksa, bağlantısı kopmuş socket ara
      if (slotIndex === -1) {
        slotIndex = room.users.findIndex(id => id && !isSocketConnected(id));
        if (slotIndex !== -1) {
          oldSocketId = room.users[slotIndex];
          foundBy = `disconnected socket (${slotIndex}, ${oldSocketId})`;
          console.log(`[JOIN-ROOM] ${foundBy} bulundu`);
        }
      }
      
      // Hala bulunamadıysa, kullanıcı adı-soyad eşleşmesi ile ara (fallback)
      if (slotIndex === -1) {
        for (let i = 0; i < room.users.length; i++) {
          const userId = room.users[i];
          if (userId) {
            const user = userInfo.get(userId);
            if (user && user.name === userName && user.surname === userSurname) {
              slotIndex = i;
              oldSocketId = userId;
              foundBy = `user name match (${i})`;
              console.log(`[JOIN-ROOM] ${foundBy} ile slot bulundu: ${i}`);
              break;
            }
          }
        }
      }
      
      // oldSocketId'yi ayarla (eğer null slot bulunduysa)
      if (slotIndex !== -1 && oldSocketId === null && room.users[slotIndex] !== null) {
        oldSocketId = room.users[slotIndex];
      }

      // Slot bulundu mu kontrol et
      if (slotIndex === -1) {
        // Room'da 2 geçerli kullanıcı var, yeni kullanıcı eklenemez
        console.error(`[JOIN-ROOM] Room ${roomId} dolu! Kullanıcı: ${userName} ${userSurname} (${socket.id})`);
        console.error(`[JOIN-ROOM] Room users:`, room.users);
        console.error(`[JOIN-ROOM] Matched user info:`, room.matchedUserInfo);
        socket.emit('error', { message: 'Oda dolu' });
        return;
      }

      // Eski socket ID varsa temizle
      if (oldSocketId && oldSocketId !== socket.id) {
        userRoomMap.delete(oldSocketId);
        userInfo.delete(oldSocketId);
        console.log(`[JOIN-ROOM] Eski socket temizlendi: ${oldSocketId}`);
      }

      // Yeni socket ID'yi slot'a ekle
      room.users[slotIndex] = socket.id;

      // Yeni socket ID'yi kaydet
      userRoomMap.set(socket.id, roomId);

      // Socket'i room'a ekle
      socket.join(roomId);
      
      // Detaylı loglama
      console.log(`[JOIN-ROOM] ✅ Kullanıcı room'a join oldu: ${userName} ${userSurname} (${socket.id}) -> ${roomId}`);
      console.log(`[JOIN-ROOM] ✅ Slot: ${slotIndex}, Bulma yöntemi: ${foundBy || 'bilinmiyor'}`);
      console.log(`[JOIN-ROOM] ✅ Room users güncellendi:`, room.users);
      console.log(`[JOIN-ROOM] ✅ Socket ${socket.id} room'da mı?`, room.users.includes(socket.id));
      
      socket.emit('room-joined', { roomId, success: true });
    } catch (error) {
      console.error('[JOIN-ROOM] ❌ Join room hatası:', error);
      socket.emit('error', { message: 'Room\'a katılırken hata oluştu' });
    }
  });

  // WebRTC Offer gönderme
  socket.on('offer', (data) => {
    try {
      const { roomId, offer } = data;
      if (!roomId || !offer) {
        socket.emit('error', { message: 'Room ID ve offer gereklidir' });
        return;
      }

      const room = activeRooms.get(roomId);
      if (!room) {
        console.error(`Room bulunamadı: ${roomId}, Socket: ${socket.id}`);
        socket.emit('error', { message: 'Geçersiz oda' });
        return;
      }
      
      // Socket ID'nin room'da olup olmadığını kontrol et
      // Önce userRoomMap'ten kontrol et, sonra room.users array'inden
      const userRoomId = userRoomMap.get(socket.id);
      const isInRoom = userRoomId === roomId || room.users.some(id => id === socket.id);
      
      if (!isInRoom) {
        console.error(`Socket ${socket.id} room ${roomId} içinde değil.`);
        console.error(`UserRoomMap: ${userRoomId}, Room users:`, room.users);
        socket.emit('error', { message: 'Geçersiz oda' });
        return;
      }

      // Partner'a gönder
      const partnerId = room.users.find(id => id && id !== socket.id);
      if (partnerId && isSocketConnected(partnerId)) {
        io.to(partnerId).emit('offer', { offer, from: socket.id });
      }
    } catch (error) {
      console.error('Offer hatası:', error);
      socket.emit('error', { message: 'Offer gönderilirken hata oluştu' });
    }
  });

  // WebRTC Answer gönderme
  socket.on('answer', (data) => {
    try {
      const { roomId, answer } = data;
      if (!roomId || !answer) {
        socket.emit('error', { message: 'Room ID ve answer gereklidir' });
        return;
      }

      const room = activeRooms.get(roomId);
      if (!room) {
        console.error(`Room bulunamadı: ${roomId}, Socket: ${socket.id}`);
        socket.emit('error', { message: 'Geçersiz oda' });
        return;
      }
      
      // Socket ID'nin room'da olup olmadığını kontrol et
      // Önce userRoomMap'ten kontrol et, sonra room.users array'inden
      const userRoomId = userRoomMap.get(socket.id);
      const isInRoom = userRoomId === roomId || room.users.some(id => id === socket.id);
      
      if (!isInRoom) {
        console.error(`Socket ${socket.id} room ${roomId} içinde değil.`);
        console.error(`UserRoomMap: ${userRoomId}, Room users:`, room.users);
        socket.emit('error', { message: 'Geçersiz oda' });
        return;
      }

      // Partner'a gönder
      const partnerId = room.users.find(id => id && id !== socket.id);
      if (partnerId && isSocketConnected(partnerId)) {
        io.to(partnerId).emit('answer', { answer, from: socket.id });
      }
    } catch (error) {
      console.error('Answer hatası:', error);
      socket.emit('error', { message: 'Answer gönderilirken hata oluştu' });
    }
  });

  // ICE Candidate gönderme
  socket.on('ice-candidate', (data) => {
    try {
      const { roomId, candidate } = data;
      if (!roomId || !candidate) {
        return;
      }

      const room = activeRooms.get(roomId);
      if (!room) {
        return;
      }
      
      // Socket ID'nin room'da olup olmadığını kontrol et
      // Önce userRoomMap'ten kontrol et, sonra room.users array'inden
      const userRoomId = userRoomMap.get(socket.id);
      const isInRoom = userRoomId === roomId || room.users.some(id => id === socket.id);
      
      if (!isInRoom) {
        return;
      }

      // Partner'a gönder
      const partnerId = room.users.find(id => id && id !== socket.id && isSocketConnected(id));
      if (partnerId) {
        io.to(partnerId).emit('ice-candidate', { candidate, from: socket.id });
      }
    } catch (error) {
      console.error('ICE candidate hatası:', error);
    }
  });

  // Mesaj gönderme
  socket.on('message', (data) => {
    try {
      const { roomId, message } = data;
      if (!roomId || !message || typeof message !== 'string') {
        socket.emit('error', { message: 'Room ID ve mesaj gereklidir' });
        return;
      }

      const room = activeRooms.get(roomId);
      if (!room) {
        console.error(`Room bulunamadı: ${roomId}, Socket: ${socket.id}`);
        socket.emit('error', { message: 'Geçersiz oda' });
        return;
      }
      
      // Socket ID'nin room'da olup olmadığını kontrol et
      // Önce userRoomMap'ten kontrol et, sonra room.users array'inden
      const userRoomId = userRoomMap.get(socket.id);
      const isInRoom = userRoomId === roomId || room.users.some(id => id === socket.id);
      
      if (!isInRoom) {
        console.error(`Socket ${socket.id} room ${roomId} içinde değil.`);
        console.error(`UserRoomMap: ${userRoomId}, Room users:`, room.users);
        socket.emit('error', { message: 'Geçersiz oda' });
        return;
      }

      const user = userInfo.get(socket.id);
      if (!user) {
        socket.emit('error', { message: 'Kullanıcı bulunamadı' });
        return;
      }

      const messageData = {
        id: Date.now().toString(),
        text: message.trim(),
        sender: socket.id,
        senderName: `${user.name} ${user.surname}`,
        timestamp: Date.now()
      };

      // Mesaj geçmişine ekle
      const messages = roomMessages.get(roomId) || [];
      messages.push(messageData);
      roomMessages.set(roomId, messages);

      // Oda içindeki herkese gönder
      io.to(roomId).emit('message', messageData);
    } catch (error) {
      console.error('Mesaj hatası:', error);
      socket.emit('error', { message: 'Mesaj gönderilirken hata oluştu' });
    }
  });

  // Swipe eventi - görüşmeyi sonlandır ve yeni match ara
  socket.on('swipe', (data) => {
    try {
      const { roomId } = data;
      if (!roomId) {
        socket.emit('error', { message: 'Room ID gereklidir' });
        return;
      }

      const room = activeRooms.get(roomId);
      if (!room) {
        console.error(`Room bulunamadı: ${roomId}, Socket: ${socket.id}`);
        socket.emit('error', { message: 'Geçersiz oda' });
        return;
      }
      
      // Socket ID'nin room'da olup olmadığını kontrol et
      // Önce userRoomMap'ten kontrol et, sonra room.users array'inden
      const userRoomId = userRoomMap.get(socket.id);
      const isInRoom = userRoomId === roomId || room.users.some(id => id === socket.id);
      
      if (!isInRoom) {
        console.error(`Socket ${socket.id} room ${roomId} içinde değil.`);
        console.error(`UserRoomMap: ${userRoomId}, Room users:`, room.users);
        socket.emit('error', { message: 'Geçersiz oda' });
        return;
      }

      // Partner'a bildir
      const partnerId = room.users.find(id => id && id !== socket.id && isSocketConnected(id));
      if (partnerId) {
        io.to(partnerId).emit('call-ended', { from: socket.id, reason: 'swipe' });
        console.log(`Swipe: Partner ${partnerId} bildirildi`);
      }

      // Swipe yapan kullanıcıyı bekleme listesine ekle (eğer bağlıysa)
      if (isSocketConnected(socket.id)) {
        addToWaitingList(socket.id);
        console.log(`Swipe: Kullanıcı ${socket.id} bekleme listesine eklendi`);
      }

      // Odayı temizle ve partner'ı da bekleme listesine ekle
      cleanupRoom(roomId, true);

      // Yeni match ara (random shuffle ile)
      console.log(`Swipe: Yeni eşleşme aranıyor, bekleme listesinde ${waitingUsers.length} kullanıcı var`);
      tryMatchUsers();
    } catch (error) {
      console.error('Swipe hatası:', error);
      socket.emit('error', { message: 'Swipe sırasında hata oluştu' });
    }
  });

  // Görüntülü görüşmeyi sonlandırma
  socket.on('end-call', (data) => {
    try {
      const { roomId } = data;
      if (!roomId) {
        socket.emit('error', { message: 'Room ID gereklidir' });
        return;
      }

      const room = activeRooms.get(roomId);
      if (!room) {
        console.error(`Room bulunamadı: ${roomId}, Socket: ${socket.id}`);
        socket.emit('error', { message: 'Geçersiz oda' });
        return;
      }
      
      // Socket ID'nin room'da olup olmadığını kontrol et
      // Önce userRoomMap'ten kontrol et, sonra room.users array'inden
      const userRoomId = userRoomMap.get(socket.id);
      const isInRoom = userRoomId === roomId || room.users.some(id => id === socket.id);
      
      if (!isInRoom) {
        console.error(`Socket ${socket.id} room ${roomId} içinde değil.`);
        console.error(`UserRoomMap: ${userRoomId}, Room users:`, room.users);
        socket.emit('error', { message: 'Geçersiz oda' });
        return;
      }

      // Partner'a bildir
      const partnerId = room.users.find(id => id && id !== socket.id);
      if (partnerId && isSocketConnected(partnerId)) {
        io.to(partnerId).emit('call-ended', { from: socket.id, reason: 'end-call' });
      }

      // Odayı temizle ve her iki kullanıcıyı da bekleme listesine ekle
      cleanupRoom(roomId, true);

      // Yeni match ara
      tryMatchUsers();
    } catch (error) {
      console.error('End-call hatası:', error);
      socket.emit('error', { message: 'Görüşme sonlandırılırken hata oluştu' });
    }
  });

  // Bağlantı kesildiğinde temizlik
  socket.on('disconnect', () => {
    try {
      console.log('Kullanıcı ayrıldı:', socket.id);

      // Bekleme listesinden çıkar
      removeFromWaitingList(socket.id);

      // Aktif odalardan çıkar
      const roomId = userRoomMap.get(socket.id);
      if (roomId) {
        const room = activeRooms.get(roomId);
        if (room) {
          // Eğer room'da matchedUsers varsa, room'u koru (kullanıcılar call screen'e geçiyor olabilir)
          const hasMatchedUsers = room.matchedUsers && room.matchedUsers.length > 0;
          
          // Partner kontrolü - bağlı olan partner var mı?
          const partnerId = room.users.find(id => id && id !== socket.id && isSocketConnected(id));
          
          if (hasMatchedUsers) {
            // Matched users varsa, room'u koru - kullanıcılar call screen'e geçiyor olabilir
            console.log(`Room ${roomId} korunuyor (matched users var)`);
            
            // Socket ID'yi null yap, room'u koru
            const index = room.users.indexOf(socket.id);
            if (index > -1) {
              room.users[index] = null;
            }
            
            // Eğer her iki slot da null ise ve hiç kimse bağlı değilse, daha uzun bir timeout ile temizle
            const allSlotsNull = room.users.every(id => id === null);
            if (allSlotsNull && !partnerId) {
              setTimeout(() => {
                const roomCheck = activeRooms.get(roomId);
                if (roomCheck) {
                  const stillConnected = roomCheck.users.some(id => id && isSocketConnected(id));
                  if (!stillConnected) {
                    // Hala bağlı kimse yok, room'u temizle
                    console.log(`Room ${roomId} temizleniyor (matched users var ama bağlı kullanıcı yok)`);
                    cleanupRoom(roomId, false);
                  }
                }
              }, 30000); // 30 saniye bekle (matched users için daha uzun süre)
            }
          } else if (!partnerId) {
            // Matched users yok ve partner da bağlı değil, room'u temizle
            // Biraz bekle, belki call.html'den join-room gelecek
            setTimeout(() => {
              const roomCheck = activeRooms.get(roomId);
              if (roomCheck) {
                const stillConnected = roomCheck.users.some(id => id && isSocketConnected(id));
                if (!stillConnected) {
                  // Hala bağlı kimse yok, room'u temizle
                  console.log(`Room ${roomId} temizleniyor (bağlı kullanıcı yok)`);
                  cleanupRoom(roomId, false);
                }
              }
            }, 10000); // 10 saniye bekle
            
            // Socket ID'yi null yap, room'u koru
            const index = room.users.indexOf(socket.id);
            if (index > -1) {
              room.users[index] = null;
            }
          } else {
            // Partner var, sadece bu socket'i room'dan çıkar ama room'u koru
            // (Partner call.html'e geçtiğinde join-room ile güncellenecek)
            const index = room.users.indexOf(socket.id);
            if (index > -1) {
              room.users[index] = null; // Geçici olarak null, join-room ile güncellenecek
            }
          }
          userRoomMap.delete(socket.id);
        }
      }

      // Kullanıcı bilgisini temizle
      userInfo.delete(socket.id);
      userRoomMap.delete(socket.id);

      // Yeni match ara
      tryMatchUsers();
    } catch (error) {
      console.error('Disconnect hatası:', error);
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    waitingUsers: waitingUsers.length,
    activeRooms: activeRooms.size,
    totalUsers: userInfo.size
  });
});

const PORT = process.env.PORT || 3000;
// 0.0.0.0 ile tüm ağ arayüzlerinde dinle (mobil emülatör erişimi için)
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server çalışıyor: http://localhost:${PORT}`);
  console.log(`Mobil emülatör için: http://10.0.2.2:${PORT}`);
});

