const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const SocketHandler = require('./socket-handler');

const app = express();
const server = http.createServer(app);

// CORS ayarları ve Socket.io optimizasyonları
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 5000,        // Ping timeout: 5 saniye (varsayılan 20s)
  pingInterval: 10000,      // Ping interval: 10 saniye (varsayılan 25s)
  maxHttpBufferSize: 1e8,   // 100 MB (video frame'ler için)
  transports: ['websocket'], // Sadece WebSocket kullan (daha hızlı)
  allowEIO3: true,          // Eski client desteği
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 dakika
    skipMiddlewares: true,
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket handler
const socketHandler = new SocketHandler(io);

io.on('connection', (socket) => {
  socketHandler.handleConnection(socket);
});

// Health check endpoint
app.get('/health', (req, res) => {
  const stats = socketHandler.getStats();
  res.json({
    status: 'ok',
    ...stats
  });
});

// Graceful shutdown
function gracefulShutdown(signal) {
  // Socket handler cleanup
  socketHandler.cleanup();
  
  // Tüm socket bağlantılarını kapat
  io.close(() => {
    // Socket.io kapatıldı
  });
  
  // HTTP server'ı kapat
  server.close(() => {
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    process.exit(1);
  }, 10000);
}

// Signal handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled errors
process.on('uncaughtException', (error) => {
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  // Unhandled rejection sessizce yok sayılıyor
});

// Server başlat
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Tüm ağ arayüzlerinde dinle

server.listen(PORT, HOST, () => {
  // Server başlatıldı
});
