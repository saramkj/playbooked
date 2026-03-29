import express from "express";

const app = express();

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

const port = process.env.API_PORT ? Number(process.env.API_PORT) : 3000;

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
