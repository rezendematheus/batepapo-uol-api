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
    db = mongoClient.db("my-increadible-uolchat-database")
})



const app = express()
app.use(cors())
app.use(express.json())


const timeNow = dayjs().format('HH:mm:ss');
/* Participants Routes */

app.post('/participants', async (req, res) => {
    try{
        const { name } = req.body;
        
        const nameExists = await db.collection('participants').findOne({name: name})
        if(nameExists){
            return res.status(409)
        }

        const participantsSchema = joi.object({
            name: joi.string().required()
        })
        
        const validation = participantsSchema.validate({name: name}, { abortEarly: true })

        if(validation.error){
            const errors = validation.error.details.map(detail => {detail.message })
            res
                .status(422)
                .send(errors)
            mongoClient.close()
        }
        
        await db.collection('participants').insertOne({name: name, lastStatus: Date.now()})

        await db.collection('messages').insertOne({from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: timeNow})

        res.status(201)
    } catch(err){
        return res.status(500)
    }
})

app.get('/participants', async (req, res) => {
    try{
        const participants = await db.collection('participants').find().toArray()

        res.send(participants)
    } catch(err){
        return res.sendStatus(500).send(err.message)
    }
})

/* Messages Routes */

app.post('/messages', async (req, res) => {
    const {to, text, type} = req.body
    const { from } = req.header
    try{
        const senderExists = await db.collection('participants').find({name: from})
        if(!senderExists){
            return res.status(422)
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
            }, {abortEarly: false})

        if(validation.error) {
            const errors = validation.error.details.map(detail => detail.message)
            res
                .status(422)
                .send(errors)
            mongoClient.close()
        }

        await db.collection('messages').insertOne({from: from, to: to, text: text, type: type, time: timeNow})
        res.status(201)
    }catch(err){
        return res.status(500)
    }

})

app.get('/messages', async (req, res) => {

})

/* Status Routes */

app.post('/status', async (req, res) => {

})

app.listen(5000, ()=>{
    console.log("server rolling")
})
