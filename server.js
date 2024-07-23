const WebSocket = require('ws');
const mongoose = require('mongoose');
const ChatMessage = require('./models/ChatMessage');
// npm install uuid
const { v4: uuidv4 } = require('uuid');

const mongoDBUrl = 'mongodb+srv://ravindralinearloop:rvrvrv@learning.o6qsygv.mongodb.net/ChatSocket?retryWrites=true&w=majority&appName=Learning';
mongoose.connect(mongoDBUrl);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

const server = new WebSocket.Server({ port: 8080 });
const userNames = new Map();

server.on('connection', async (socket) => {
  console.log('Client connected');
  const userId = uuidv4();
  // Generate a shorter, more concise username
  userNames.set(socket, `U${userId.substring(0, 5)}`);

  // Send chat history to the new client
  try {
    const chatHistory = await ChatMessage.find().sort({ timestamp: 1 }).limit(50);
    socket.send(JSON.stringify(chatHistory.map(msg => ({
      ...msg.toObject(),
      align: msg.username === userNames.get(socket) ? 'right' : 'left'
    }))));
  } catch (error) {
    console.error('Error retrieving chat history:', error);
  }

  socket.on('message', async (data) => {
    const messageData = JSON.parse(data);
    const username = userNames.get(socket);

    const chatMessage = new ChatMessage({
      username: username,
      message: messageData.message
    });

    try {
      await chatMessage.save();
      console.log('Message saved to database');

      // Broadcast the message to all connected clients
      server.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            username,
            message: messageData.message,
            align: client === socket ? 'right' : 'left'
          }));
        }
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });

  socket.on('close', () => {
    console.log('Client disconnected');
    userNames.delete(socket);
  });
});

console.log('WebSocket server is listening on ws://localhost:8080');
