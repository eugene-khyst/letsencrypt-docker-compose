const express = require("express");

const host = "0.0.0.0";
const port = 8080;

const app = express();
app.get("/", (req, res) => {
  res.send("Hello, world!");
});

app.get("/hello", (req, res) => {
  res.send(`Hello, ${req.query.name || "world"}!`);
});

app.listen(port, host);
console.log(`Running on http://${host}:${port}`);
