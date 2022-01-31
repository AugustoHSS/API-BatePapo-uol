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

async function logoutMessage(element) {
  try {
    await mongoClient.db('batePapoUol').collection('messages').insertOne({
      from: element.name,
      to: 'Todos',
      text: 'sai da sala...',
      type: 'status',
      time: dayjs().format('HH:mm:ss'),
    });
  } catch (error) {
    console.log(error);
  }
}
async function removeInactiveUsers() {
  const timeToInactive = Date.now() - 10000;
  try {
    await mongoClient.connect();
    const inactiveParticipants = await mongoClient.db('batePapoUol').collection('participants')
      .find({ lastStatus: { $lte: timeToInactive } }).toArray();
    await mongoClient.db('batePapoUol').collection('participants').deleteMany({ lastStatus: { $lte: timeToInactive } });
    inactiveParticipants.forEach(logoutMessage);
  } catch (error) {
    console.log(error);
  }
}

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
      mongoClient.close();
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
    mongoClient.close();
  } catch {
    response.sendStatus(500);
    mongoClient.close();
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
    console.log(validation.error.message);
    response.sendStatus(422);
    return;
  }
  try {
    await mongoClient.connect();
    const activeUser = await mongoClient.db('batePapoUol').collection('participants').findOne({ name: request.headers.user });
    if (!activeUser) {
      response.sendStatus(422);
      return;
    }
    await mongoClient.db('batePapoUol').collection('messages').insertOne(completeMessage);
    response.sendStatus(201);
  } catch (error) {
    response.sendStatus(500);
  }
});

// get message
server.get('/messages', async (request, response) => {
  const { user } = request.headers;
  try {
    await mongoClient.connect();
    if (!parseInt(request.query.limit, 10)) {
      const messages = await mongoClient.db('batePapoUol').collection('messages')
        .find({ $or: [{ to: user }, { from: user }, { type: 'message' }, { type: 'status' }] }).toArray();
      response.send(messages);
    } else {
      const messages = await mongoClient.db('batePapoUol').collection('messages')
        .find({ $or: [{ to: user }, { from: user }, { type: 'message' }, { type: 'status' }] })
        .limit(parseInt(request.query.limit, 10))
        .toArray();
      response.send(messages);
    }
  } catch {
    response.sendStatus(500);
  }
});

// post status
server.post('/status', async (request, response) => {
  const { user } = request.headers;
  try {
    await mongoClient.connect();
    const participant = await mongoClient.db('batePapoUol').collection('participants').findOne({ name: user });
    if (!participant) {
      response.sendStatus(404);
      mongoClient.close();
      return;
    }
    await mongoClient.db('batePapoUol').collection('participants')
      .updateOne({ _id: participant._id }, { $set: { lastStatus: Date.now() } });
    response.sendStatus(200);
    mongoClient.close();
  } catch {
    response.sendStatus(500);
  }
});

setInterval(removeInactiveUsers, 15000);

server.listen(5000);
