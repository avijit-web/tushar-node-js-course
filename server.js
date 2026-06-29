import express from "express";
import "dotenv/config";
import ApiRoutes from "./routes/api.js";

const app = express();

const PORT = process.env.PORT || 8000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  return res.json({ message: "Hello its working..." });
});

app.use("/api", ApiRoutes);

app.listen(PORT, () => console.log(`Server is running on PORT ${PORT}`));
