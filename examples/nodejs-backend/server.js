const express = require('express');

const host = '0.0.0.0';
const port = 8080;

const app = express();
app.get('/', (req, res) => {
  res.send('Hello World');
});

app.listen(port, host);
console.log(`Running on http://${host}:${port}`);