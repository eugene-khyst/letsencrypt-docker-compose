const express = require("express");
const app = express();
const expressWs = require("express-ws")(app);

const host = "0.0.0.0";
const port = 8080;

app.get("/", (req, res) => {
  res.send("Hello, world!");
});

app.get("/hello", (req, res) => {
  res.send(`Hello, ${req.query.name || "world"}!`);
});

app.ws("/echo", function (ws, req) {
  ws.on("message", function (msg) {
    console.log("Received message", msg);
    ws.send(msg);
  });
});

app.listen(port, host);
console.log(`Running on http://${host}:${port}`);
