import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { MongoClient, ObjectId } from 'mongodb'
import joi from 'joi'
import dayjs from 'dayjs'
dotenv.config()


const mongoClient = new MongoClient(process.env.DATABASE_URL)
let db;
mongoClient.connect(() => {
    db = mongoClient.db()
});




const app = express()
app.use(cors())
app.use(express.json())


const timeNow = dayjs().format('HH:mm:ss');
/* Participants Routes */

app.post('/participants', async (req, res) => {
    try {
        const name = req.body.name;

        const nameExists = await db.collection('participants').find({ name: name }).toArray()
        
        if (nameExists[0]) {
            return res.status(409).send()
        }
        console.log('passou');
        const participantsSchema = joi.object({
            name: joi.string().required()
        })

        const validation = participantsSchema.validate({ name: name }, { abortEarly: true })

        if (validation.error) {
            const errors = validation.error.details.map(detail => { detail.message })
            res
                .status(422)
                .send(errors)

        }

        await db
            .collection('participants')
            .insertOne({ name: name, lastStatus: Date.now() })

        await db
            .collection('messages')
            .insertOne({ from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: timeNow })

        res.status(201).send()
    } catch (err) {
        res.status(500).send()
    }
})

app.get('/participants', async (req, res) => {
    try {
        const participants = await db.collection('participants').find().toArray()

        res.send(participants)
    } catch (err) {
        return res.status(500).send(err.message)
    }
})

/* Messages Routes */

app.post('/messages', async (req, res) => {
    const { to, text, type } = req.body
    const user = req.headers.user.toString()
    ;
    try {
        const senderExists = await db
            .collection('participants')
            .find({ name: user })
            .toArray()

        if (!senderExists[0] || !user)
            return res.status(422).send()
            
        if (!(type === 'message' || type === 'private_messa')) 
            return res.status(422).send()
            
        console.log(user, to, text, type, senderExists)
        const messageSchema = joi.object({
            to: joi.string().required(),
            text: joi.string().required(),
            type: joi.string().required()
        })
        
        const validation = messageSchema
            .validate({
                to: to,
                text: text,
                type: type
            }, { abortEarly: false })

        if (validation.error) {
            const errors = validation.error.details.map(detail => detail.message)
            res
                .status(422)
                .send(errors)
        }

        await db.collection('messages').insertOne({ from: user, to: to, text: text, type: type, time: timeNow })
        res.status(201).send()
    } catch (err) {
        return res.status(500).send()
    }

})

app.get('/messages', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit)

        const { user } = req.headers

        const messagesToUser = await db.collection('messages').find({ to: user  }).toArray()
        const messagesToAll = await db.collection('messages').find({ to: 'Todos'}).toArray()
        const messagesFromUser = await db.collection('messages').find({ from: user}).toArray()
        const messagesFromUserToSomeone = messagesFromUser.filter(item => item.to != 'Todos')

        const messages = messagesToUser.concat(messagesToAll, messagesFromUserToSomeone)
        const latestMessages = messages.reverse()
        let limitMessages = []
        if (limit < 0 || typeof limit === 'string' || isNaN(limit)) {
            return res.status(422).send()
        }
        if (!limit) {
            limitMessages = latestMessages;
            return res.status(200).send(limitMessages)
        }
        if (latestMessages.length < limit || limit > latestMessages) {
            limitMessages = latestMessages
        }
        else {
            limitMessages = latestMessages.slice(0 - limit)
        }
        res.status(200).send(limitMessages)
    } catch (err) {
        res.status(500).send(err.message)
    }
})

/* Status Routes */

app.post('/status', async (req, res) => {
    try {
        const { user } = req.headers
        const userExists = db.collection('participants').findOne({ name: user })
        if (!userExists) res.status(404)

        const { modifiedCount } = await db
            .collection('participants')
            .updateOne({ name: user }, { $set: { lastStatus: Date.now() } })

        if (modifiedCount === 0)
            return res.status(404).send()
        res.status(200).send()
    } catch (err) {
        res.status(500).send(err.message)
    }
})

const inactivityRemover = async () => {
    try {
        const now = Date.now()
        const participants = await db
            .collection('participants')
            .find({})
            .toArray()

        participants
            .forEach(element => {
                if (now - element.lastStatus > 10000) {
                    db
                        .collection('participants')
                        .deleteOne({ name: element.name })
                    db
                        .collection('messages')
                        .insertOne({from: element.name, to: 'Todos', text: 'sai da sala...', type: 'status', time: timeNow})
                }
            });
    } catch (err) {
        console.log(err)
    }
}

setInterval(inactivityRemover, 15000)
app.listen(5000, () => {
    console.log("server rolling")
})
