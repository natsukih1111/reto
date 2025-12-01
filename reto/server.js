import { createServer } from "http";
import { Server } from "socket.io";
import next from "next";

const dev = true;
const app = next({ dev });
const handle = app.getRequestHandler();

const PORT = 3000;

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    console.log("✅ 接続:", socket.id);

    // ルーム参加イベント名を「joinRoom」に統一
    socket.on("joinRoom", (roomId) => {
      console.log("➡ joinRoom:", roomId, "by", socket.id);
      socket.join(roomId);

      const size = io.sockets.adapter.rooms.get(roomId)?.size || 0;
      console.log(`📌 ルーム ${roomId} の人数: ${size}`);

      // 2人揃ったら matchStart を送る
      if (size === 2) {
        console.log(`🎉 ルーム ${roomId} マッチング完了！`);
        io.to(roomId).emit("matchStart");
      }
    });

    socket.on("disconnect", () => {
      console.log("❌ 切断:", socket.id);
    });
  });

  httpServer.listen(PORT, () => {
    console.log(`🚀 サーバー起動: http://localhost:${PORT}`);
  });
});
