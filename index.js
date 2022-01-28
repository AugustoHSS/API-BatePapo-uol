import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import joi from 'joi';
import dayjs from 'dayjs';

const server = express();
const mongoClient = new MongoClient(process.env.MONGO_URI);
server.use(express.json());
server.use(cors());
dotenv.config();

// post participants
server.post('/participants', async (request, response) => {
  const participantsSchema = joi.object({
    name: joi.string().required(),
  });
  const validation = participantsSchema.validate(request.body);
  if (validation.error) {
    response.sendStatus(422);
    return;
  }
  try {
    await mongoClient.connect();
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
    response.sendStatus(500);
  }
});

// get participants
server.get('/participants', async (request, response) => {
  try {
    await mongoClient.connect();
    const participants = await mongoClient.db('batePapoUol').collection('participants').find({}).toArray();
    response.send(participants);
  } catch {
    response.sendStatus(500);
  }
});

// post message
server.post('/messages', async (request, response) => {
  const messagesSchema = joi.object({
    from: joi.string().required(),
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid('private_message', 'message').required(),
    time: joi.string().required(),
  });

  const completeMessage = {
    ...request.body,
    from: request.headers.user,
    time: dayjs().format('HH:mm:ss'),
  };
  const validation = messagesSchema.validate(completeMessage);
  if (validation.error) {
    response.sendStatus(422);
    return;
  }
  try {
    await mongoClient.connect();
    const activeUser = await mongoClient.db('batePapoUol').collection('participants').findOne({ name: request.headers.user });
    if (!activeUser) {
      response.sendStatus(422);
    }
    await mongoClient.db('batePapoUol').collection('messages').insertOne(completeMessage);
    response.sendStatus(201);
  } catch (error) {
    response.sendStatus(500);
  }
});

// get message
server.get('/messages', async (request, response) => {
  try {
    await mongoClient.connect();
    const messages = await mongoClient.db('batePapoUol').collection('messages').find({}).toArray();
    if (!request.query.limit) {
      response.send(messages);
    }
    response.send(messages);
  } catch {
    response.sendStatus(422);
  }
});
server.post('/status', async (request, response) => {

});

server.listen(5000);
