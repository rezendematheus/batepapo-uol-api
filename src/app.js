import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { MongoClient, ObjectId } from 'mongodb'
import Joi from 'joi'
dotenv.config()


const mongoClient =  new MongoClient(process.env.DATABASE_URL)
let db;
mongoClient.connect(() => {
    db = mongoClient.db()
})

const app = express()
app.use(cors())
app.use(express.json())

/* Participants Routes */

app.post('/participants', async (req, res) => {

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

app.listen(process.env.PORT, ()=>{
    
})
