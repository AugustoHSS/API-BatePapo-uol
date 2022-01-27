import express from 'express';
import cors from 'cors';

const server = express();
server.use(express.json());
server.use(cors());

server.post('/participants', (request, response) => {

});
server.get('/participants', (request, response) => {─ 

});
server.post('/messages', (request, response) => {

});
server.get('/messages', (request, response) => {

});
server.post('/status', (request, response) => {

});

server.listen(5000);
