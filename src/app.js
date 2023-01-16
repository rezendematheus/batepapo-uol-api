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
        const { name } = req.body;

        const nameExists = await db.collection('participants').find({ name: name }).toArray()
        //res.send(nameExists)
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
    const { from } = req.headers

    try {
        const senderExists = await db
            .collection('participants')
            .find({ name: from })
            .toArray()
        console.log(from, senderExists)
        if (!senderExists[0]) {
            return res.status(422).send()
        }
        const messageSchema = joi.object({
            to: joi.string().required(),
            text: joi.string().required(),
            type: joi.string().allow('message', 'private_message').required()
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

        await db.collection('messages').insertOne({ from: from, to: to, text: text, type: type, time: timeNow })
        res.status(201).send()
    } catch (err) {
        return res.status(500).send()
    }

})

app.get('/messages', async (req, res) => {
    try {
        const limit = req.query.limit
        const { User } = req.header
        const messages = await db.collection('messages').find({ to: User, to: "Todos", from: User }).toArray()
        const latestMessages = messages.reverse()
        let limitMessages = []
        if (!limit) {
            limitMessages = latestMessages.slice(0 - 100);
            return res.status(200).send(limitMessages)
        }
        if (latestMessages.length < limit) {
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
        const { User } = req.header
        const userExists = db.collection('participants').findOne({ name: User }).toArray()
        if (!userExists) res.status(404)

        const { modifiedCount } = await db
            .collection('participants')
            .updateOne({ name: User }, { $set: { lastStatus: Date.now() } })

        if (modifiedCount === 0)
            return res.status(404)
        res.status(200)
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
                }
            });
    } catch (err) {
        console.log(err)
    }
}

//setInterval(inactivityRemover, 15000)
app.listen(5000, () => {
    console.log("server rolling")
})
