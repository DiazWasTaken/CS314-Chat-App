const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { default: mongoose } = require('mongoose');

async function main() {
  // open the database file
  const db = await open({
    filename: 'chat.db',
    driver: sqlite3.Database
  });

  // create our 'messages' table (you can ignore the 'client_offset' column for now)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_offset TEXT UNIQUE,
        content TEXT
    );
  `);

  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    connectionStateRecovery: {}
  });

  //import required modules
  require("dotenv").config(); // This ensures all variables from '.env' are available
  const mongoose = require("mongoose");
  
  const mongoURI = process.env.DATABASE; 
  require("./model/message");
  const Message = mongoose.model("Message");


  mongoose
    .connect(mongoURI, {
        useNewUrlparser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log("MongoDB connection established"))
    .catch((err) => console.error("MongoDB connection error:", err));


  app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
  });

  // [...]

io.on('connection', async (socket) => {
    socket.on('chat message', async (msg) => {
      let result;
      try {
        result = await db.run('INSERT INTO messages (content) VALUES (?)', msg);
      } catch (e) {
        // TODO handle the failure
        return;
      }
      io.emit('chat message', msg, result.lastID);

      const messageToSave = new Message({ message: msg});

      messageToSave.save();
      
    });
  
    if (!socket.recovered) {
      // if the connection state recovery was not successful
      try {
        await db.each('SELECT id, content FROM messages WHERE id > ?',
          [socket.handshake.auth.serverOffset || 0],
          (_err, row) => {
            socket.emit('chat message', row.content, row.id);
          }
        )
      } catch (e) {
        // something went wrong
      }
    }
  });
  io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});
  
  // [...]

  server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
  });
}

main();