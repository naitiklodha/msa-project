'use strict';

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const Redis = require('ioredis');
const { customAlphabet } = require('nanoid');
const { 
  config, 
  logger, 
  requestId, 
  createMetrics, 
  errorHandler, 
  healthRoutes, 
  authMiddleware,
  createKafkaClient,
  createConsumer
} = require('@focuspulse/shared');

// --- Configuration & Clients ---
const kafka = createKafkaClient(config.serviceName, config.kafkaBrokers);
const app = express();
const server = http.createServer(app);

// --- Global Middleware ---
app.use(express.json());
app.use(requestId);
app.use((req, res, next) => {
  if (req.method === 'POST') {
    logger.info({ msg: `Global POST tracer: ${req.path}`, body: req.body, contentType: req.headers['content-type'] });
  }
  next();
});

const io = new Server(server, {
  path: '/ws/rooms',
  cors: { origin: config.corsOrigins, methods: ["GET", "POST"], credentials: true }
});

const pool = new Pool({ connectionString: config.pgConnectionString });
const redis = new Redis(config.redisUrl);
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);

const { metricsMiddleware, metricsHandler } = createMetrics(config.serviceName);

app.use(metricsMiddleware);

// --- Middleware ---
const auth = authMiddleware(config.jwtSecret);

// --- REST Endpoints ---

/**
 * GET /mine
 * Fetch all rooms the user is part of.
 */
app.get('/mine', auth, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT r.*, 
             (SELECT COUNT(*) FROM participants p2 WHERE p2.room_id = r.id) as participant_count
      FROM rooms r
      JOIN participants p ON r.id = p.room_id
      WHERE p.user_id = $1
      ORDER BY r.created_at DESC
    `, [req.userId]);
    
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /create
 * Create a new focus room and generate a unique code.
 */
app.post('/create', express.json(), auth, async (req, res, next) => {
  const { name } = req.body;
  logger.info({ msg: 'POST /create body check', body: req.body, headers: req.headers });
  
  if (!name) return res.status(400).json({ 
    error: 'Room name is required', 
    receivedBody: req.body,
    contentType: req.headers['content-type']
  });

  try {
    const code = nanoid();
    logger.info({ msg: 'Attempting to create room', name, code, userId: req.userId });
    
    const result = await pool.query(
      'INSERT INTO rooms (name, code, owner_id) VALUES ($1, $2, $3) RETURNING *',
      [name, code, req.userId]
    );

    const room = result.rows[0];

    // Auto-join the creator
    await pool.query(
      'INSERT INTO participants (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [room.id, req.userId]
    );
    
    res.status(201).json(room);
  } catch (err) {
    logger.error({ msg: 'Room creation failed', error: err.message, userId: req.userId });
    next(err);
  }
});

// Health check mounted at specific path to avoid greediness
app.use('/', healthRoutes(config.serviceName, pool, redis));
app.use('/status', healthRoutes(config.serviceName, pool, redis));

/**
 * GET /:code
 * Get room details by code.
 */
app.get('/:code', auth, async (req, res, next) => {
  try {
    logger.info({ msg: 'Fetching room', code: req.params.code, userId: req.userId });
    const roomResult = await pool.query('SELECT * FROM rooms WHERE code = $1', [req.params.code]);
    if (roomResult.rows.length === 0) return res.status(404).json({ error: 'Room not found' });
    
    const room = roomResult.rows[0];
    
    // Add user to participants if not already there
    await pool.query(
      'INSERT INTO participants (room_id, user_id) VALUES ($1, $2) ON CONFLICT (room_id, user_id) DO NOTHING',
      [room.id, req.userId]
    );

    res.json(room);
  } catch (err) {
    logger.error({ msg: 'Room retrieval/join failed', error: err.message, code: req.params.code, userId: req.userId });
    next(err);
  }
});

/**
 * GET /:code/history
 * Fetch last 50 chat messages.
 */
app.get('/:code/history', auth, async (req, res, next) => {
  try {
    const roomResult = await pool.query('SELECT id FROM rooms WHERE code = $1', [req.params.code]);
    if (roomResult.rows.length === 0) return res.status(404).json({ error: 'Room not found' });

    const messages = await pool.query(
      `SELECT m.*, u.email as user_email 
       FROM messages m 
       JOIN users u ON m.user_id = u.id 
       WHERE m.room_id = $1 
       ORDER BY m.created_at DESC LIMIT 50`,
      [roomResult.rows[0].id]
    );

    res.json(messages.rows.reverse());
  } catch (err) {
    next(err);
  }
});

/**
 * GET /:code/leaderboard
 * Fetch room-specific leaderboard from Redis.
 */
app.get('/:code/leaderboard', auth, async (req, res, next) => {
  try {
    const roomResult = await pool.query('SELECT id FROM rooms WHERE code = $1', [req.params.code]);
    if (roomResult.rows.length === 0) return res.status(404).json({ error: 'Room not found' });

    const roomId = roomResult.rows[0].id;
    const scores = await redis.zrevrange(`room:${roomId}:leaderboard`, 0, 9, 'WITHSCORES');
    
    // Format: ["user1", "100", "user2", "50"]
    const leaderboard = [];
    for (let i = 0; i < scores.length; i += 2) {
      const userId = scores[i];
      const userRes = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
      leaderboard.push({
        email: userRes.rows[0]?.email || 'Unknown',
        score: parseInt(scores[i + 1], 10)
      });
    }

    res.json(leaderboard);
  } catch (err) {
    next(err);
  }
});

// --- WebSocket Logic ---

io.on('connection', (socket) => {
  let currentRoom = null;
  let currentUser = null;

  logger.info({ msg: 'Socket connected to room-service', id: socket.id });

  socket.on('join_room', async ({ roomCode, userId }) => {
    logger.info({ msg: 'Socket joining room', socketId: socket.id, roomCode, userId });
    try {
      const roomResult = await pool.query('SELECT id, name FROM rooms WHERE code = $1', [roomCode]);
      if (roomResult.rows.length === 0) return;

      const room = roomResult.rows[0];
      currentRoom = room.id;
      currentUser = userId;

      socket.join(currentRoom);
      
      // Update Redis presence
      await redis.sadd(`room:${currentRoom}:users`, userId);
      
      const activeUsers = await redis.smembers(`room:${currentRoom}:users`);
      io.to(currentRoom).emit('room_state', { activeUsers });
      
      logger.info({ msg: 'User joined room', userId, roomCode });
    } catch (err) {
      logger.error({ msg: 'Join room failed', error: err.message });
    }
  });

  socket.on('send_message', async ({ content }) => {
    if (!currentRoom || !currentUser) {
      logger.warn({ msg: 'Message attempt without room/user context', socketId: socket.id, currentRoom, currentUser });
      return;
    }

    try {
      const result = await pool.query(
        'INSERT INTO messages (room_id, user_id, content) VALUES ($1, $2, $3) RETURNING id, created_at',
        [currentRoom, currentUser, content]
      );

      // Fetch user email to attach to message
      const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [currentUser]);
      
      const message = {
        id: result.rows[0].id,
        content,
        userId: currentUser,
        user_email: userResult.rows[0]?.email || 'Unknown',
        created_at: result.rows[0].created_at
      };

      io.to(currentRoom).emit('new_message', message);
    } catch (err) {
      logger.error({ msg: 'Message persistence failed', error: err.message });
    }
  });

  // Quiz Sync Events
  socket.on('quiz_start_init', async ({ documentId, topicName, chunkId }) => {
    if (!currentRoom || !currentUser) return;
    
    // Clear any previous lobby for safety
    await redis.del(`room:${currentRoom}:quiz_lobby`);
    
    // Auto-join the initiator
    await redis.sadd(`room:${currentRoom}:quiz_lobby`, currentUser);
    
    // Broadcast that a lobby is open
    io.to(currentRoom).emit('quiz_lobby_opened', { 
        documentId, 
        topicName, 
        chunkId, 
        initiatorId: currentUser 
    });

    // Send immediate initial lobby update
    const userRes = await pool.query('SELECT email FROM users WHERE id = $1', [currentUser]);
    const hostInfo = { id: currentUser, email: userRes.rows[0]?.email || 'Unknown' };
    io.to(currentRoom).emit('quiz_lobby_update', { joinedUsers: [hostInfo] });
  });

  socket.on('quiz_lobby_join', async () => {
    if (!currentRoom || !currentUser) return;
    
    await redis.sadd(`room:${currentRoom}:quiz_lobby`, currentUser);
    const joinedUsers = await redis.smembers(`room:${currentRoom}:quiz_lobby`);
    
    // Fetch emails for the UI
    const usersWithEmail = [];
    for (const uid of joinedUsers) {
        const ures = await pool.query('SELECT email FROM users WHERE id = $1', [uid]);
        usersWithEmail.push({ id: uid, email: ures.rows[0]?.email || 'Unknown' });
    }
    
    io.to(currentRoom).emit('quiz_lobby_update', { joinedUsers: usersWithEmail });
  });

  socket.on('quiz_lobby_start', async () => {
    if (!currentRoom) return;
    
    // Notify all clients to start
    io.to(currentRoom).emit('quiz_commence');
    
    // Cleanup lobby after start
    await redis.del(`room:${currentRoom}:quiz_lobby`);
  });

  socket.on('quiz_lobby_close', async () => {
    if (!currentRoom) return;
    await redis.del(`room:${currentRoom}:quiz_lobby`);
    io.to(currentRoom).emit('quiz_lobby_closed');
  });

  socket.on('disconnect', async () => {
    if (currentRoom && currentUser) {
      await redis.srem(`room:${currentRoom}:users`, currentUser);
      const activeUsers = await redis.smembers(`room:${currentRoom}:users`);
      io.to(currentRoom).emit('room_state', { activeUsers });
    }
    logger.info({ msg: 'Socket disconnected', id: socket.id });
  });
});

// --- Kafka Event Processing ---
const startConsumer = async () => {
  try {
    await createConsumer(kafka, 'room-service', ['game-events'], async ({ message }) => {
      const event = JSON.parse(message.value.toString());
      
      if (event.eventType === 'QUIZ_COMPLETED' && event.roomId) {
        const { roomId, userId, score } = event;
        logger.info({ msg: 'Processing room quiz completion', roomId, userId, score });
        
        // Find the room by code (event.roomId is actually the room code from the frontend)
        const roomResult = await pool.query('SELECT id FROM rooms WHERE code = $1', [roomId]);
        if (roomResult.rows.length > 0) {
          const internalRoomId = roomResult.rows[0].id;
          await redis.zincrby(`room:${internalRoomId}:leaderboard`, score, userId);
          
          // Notify room about leaderboard update
          io.to(internalRoomId).emit('leaderboard_refresh');
        }
      }
    });
  } catch (err) {
    logger.error({ msg: 'Room consumer failed', error: err.message });
  }
};

startConsumer();

app.get('/metrics', metricsHandler);
app.use(errorHandler);

server.listen(config.port, () => {
  logger.info({ msg: `Room Service listening`, port: config.port });
});

async function shutdown(signal) {
  logger.info({ msg: `${signal} - shutting down` });
  await new Promise((resolve) => server.close(resolve));
  await Promise.allSettled([pool.end(), redis.quit(), kafka.disconnect()]);
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
