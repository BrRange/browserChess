const http = require("http");
const fs = require("fs");
const port = 3000;

const server = http.createServer((req, res) => {
  switch (req.url) {
  case "/":
    res.writeHead(200, { "Content-Type": "text/html" });
    fs.readFile('./index.html', (error, data) => {
      if (error) {
        res.writeHead(400);
        res.write("HTML file not found");
      } else {
        res.end(data);
      }
    }); break;
  case "/style.css":
    res.writeHead(200, { "Content-Type": "text/css" });
    fs.readFile('./style.css', (error, data) => {
      if (error) {
        res.writeHead(400);
        res.write("CSS file not found");
      } else {
        res.end(data);
      }
    }); break;
  case "/script.js":
    res.writeHead(200, { "Content-Type": "application/javascript" });
    fs.readFile('./script.js', (error, data) => {
      if (error) {
        res.writeHead(400);
        res.write("JavaScript file not found");
      } else {
        res.end(data);
      }
    }); break;
  }
}).listen(port, (error) => {
  if (error) {
    console.log("There was an error:", error);
    return;
  } else {
    console.log("Connected to server on port", port);
  }
})
