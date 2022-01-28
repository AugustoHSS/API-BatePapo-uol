import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import joi from 'joi';
import dayjs from 'dayjs';

const server = express();
server.use(express.json());
server.use(cors());
dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
server.post('/participants', async (request, response) => {
  try {
    await mongoClient.connect();
    const participantsSchema = joi.object({
      name: joi.string().required(),
    });
    const validation = participantsSchema.validate(request.body);
    if (validation.error) {
      response.sendStatus(422);
      return;
    }
    const allParticipants = await mongoClient.db('batePapoUol').collection('participants').find({}).toArray();
    const alreadyHaveParticipant = allParticipants.find(
      (participant) => participant.name === request.body.name,
    );
    if (alreadyHaveParticipant) {
      response.sendStatus(409);
      return;
    }

    await mongoClient.db('batePapoUol').collection('participants').insertOne({
      name: request.body.name,
      lastStatus: Date.now(),
    });

    await mongoClient.db('batePapoUol').collection('messages').insertOne({
      from: request.body.name,
      to: 'Todos',
      text: 'entra na sala...',
      type: 'status',
      time: dayjs().format('HH:mm:ss'),
    });

    response.sendStatus(201);
  } catch {
    response.status(422).send('erro');
  }
});
server.get('/participants', async (request, response) => {
  try {
    await mongoClient.connect();
    const participants = await mongoClient.db('batePapoUol').collection('participants').find({}).toArray();
    response.send(participants);
  } catch {
    response.status(422).send('erro');
  }
});
server.post('/messages', (request, response) => {

});
server.get('/messages', (request, response) => {

});
server.post('/status', (request, response) => {

});

server.listen(5000);
