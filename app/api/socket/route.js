import { Server } from "socket.io";

let io;

export async function GET() {
  if (!io) {
    io = new Server({
      cors: {
        origin: "*",
      },
    });

    io.on("connection", (socket) => {
      console.log("ユーザー接続:", socket.id);

      // ルーム参加
      socket.on("joinRoom", (roomId) => {
        socket.join(roomId);
        console.log(`${socket.id} が部屋 ${roomId} に参加`);

        // 2人揃ったら開始
        const size = io.sockets.adapter.rooms.get(roomId)?.size || 0;

        if (size === 2) {
          io.to(roomId).emit("matchStart");
        }
      });

      socket.on("disconnect", () => {
        console.log("切断:", socket.id);
      });
    });

    console.log("Socket.IO 初期化完了");
  }

  return new Response("Socket.IO サーバー稼働中");
}
