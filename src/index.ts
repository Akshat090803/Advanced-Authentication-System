import dotenv from "dotenv";
dotenv.config();
import app from "./app.js";
import dbConnect from "./config/db-connect.js";



async function startServer() {
  await dbConnect();
  const PORT = parseInt(process.env.PORT || "8001",10);
  app.listen(PORT, () => {
    console.log(`🚀 Server listening at: http://localhost:${PORT}`);
    console.log(`🛠️ Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch((err) => {
  console.log("Error while starting the server::", err);
  process.exit(1);
});
