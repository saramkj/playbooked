import { app } from "./app.js";

const port = process.env.API_PORT ? Number(process.env.API_PORT) : 3000;

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
