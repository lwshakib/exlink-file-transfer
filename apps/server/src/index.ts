import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app.js';

const PORT = process.env.PORT || 3001;

function startServer() {
  const httpServer = createServer(app);
  
  const io = new Server(httpServer, {
    cors: {
      origin: "*", // Adjust this in production for security
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer();
