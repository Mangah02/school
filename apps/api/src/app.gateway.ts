// apps/api/src/app.gateway.ts
import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001', // Allow your frontend to connect
    credentials: true,
  },
  namespace: '/', // Matches the frontend's default connection
})
export class AppGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AppGateway.name);

  // This runs automatically when a client connects
  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  // This runs automatically when a client disconnects
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Example: A basic ping/pong to verify the connection is alive
  @SubscribeMessage('ping')
  handlePing(@MessageBody() data: any, @ConnectedSocket() client: Socket): string {
    return 'pong';
  }
}