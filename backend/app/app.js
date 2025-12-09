import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import postRoutes from "./routes/test_router.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Register routes
app.use("/api/test", postRoutes);

app.get("/", (req, res) => {
  res.send("Academiq Backend is running!");
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});

export default app;

