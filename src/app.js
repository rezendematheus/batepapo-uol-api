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
    const { name } = req.body

    const participantsSchema = joi.object({
        name: joi.string().required()
    })

    const validation = participantsSchema.validate(name, { aboutEarly: true })
    if(validation.error){
        const errors = validation.error.details.map(detail => {
            detail.message
        })
        res.status(422).send(errors)
    }

    try{
        await db.collection('participants').insertOne({name: name, lastStatus: Date.now()})
        await db.collection('messages').insertOne({from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: timeNow})
        res.sendStatus(201)
    } catch(err){
        return res.sendStatus(500).send("algo deu errado")
    }
})

app.get('/participants', async (req, res) => {

})

/* Messages Routes */

app.post('/messages', async (req, res) => {

})

app.get('/messages', async (req, res) => {

})

/* Status Routes */

app.post('/status', async (req, res) => {

})

app.listen(5000, ()=>{
    console.log("server rolling")
})
