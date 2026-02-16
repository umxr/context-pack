import { createApp } from "./app";
import { login } from "./auth/login";
import { createSession } from "./auth/session";
import { dbClient } from "./db/client";

const app = createApp();

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await login(username, password);
  if (user) {
    const session = createSession(user);
    res.json({ session });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});

export { app };
