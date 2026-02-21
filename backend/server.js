const express = require('express')
const cors = require('cors')
const http = require('http')
const { Server } = require('socket.io')
const connectDB = require('./config/db.js')
require('dotenv').config()
const  autoRoute  = require('./routes/autoRoute.js')

const app = express();

const PORT = process.env.PORT || 5000;

connectDB();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, { cors: { origin: "*" }});

app.use('/api', autoRoute);

server.listen(PORT, () => console.log(`Server is Running on the PORT: ${PORT}`));