const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { MongoClient, ObjectId } = require('mongodb');
const mongoose = require('mongoose')
require('dotenv').config();
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection URL
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

const itemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    quantity: { type: Number, default: 1 },
    category: { type: String },
    image: { type: String, required: true }
});

const Item = mongoose.model('Item', itemSchema);

async function run() {
    try {
        // Connect to MongoDB
        await client.connect();
        console.log("Connected to MongoDB");

        const db = client.db('assignment');
        const collection = db.collection('users');

        // User Registration
        app.post('/api/v1/register', async (req, res) => {
            const { name, email, password } = req.body;

            // Check if email already exists
            const existingUser = await collection.findOne({ email });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'User already exists'
                });
            }

            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert user into the database
            await collection.insertOne({ name, email, password: hashedPassword });

            res.status(201).json({
                success: true,
                message: 'User registered successfully'
            });
        });

        // User Login
        app.post('/api/v1/login', async (req, res) => {
            const { email, password } = req.body;

            // Find user by email
            const user = await collection.findOne({ email });
            if (!user) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            // Compare hashed password
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            // Generate JWT token
            const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: process.env.EXPIRES_IN });

            res.json({
                success: true,
                message: 'Login successful',
                token
            });
        });


        // create new supply post
        app.post('/api/v1/create-new', async (req, res) => {
            try {
                console.log(req.body)
                const result = await db.collection('items').insertOne(req.body);

                res.status(201).json({
                    success: true,
                    message: 'Item created successfully',
                    data: result
                });
            } catch (error) {
                console.log('creating supply item error', error, error)
                res.status(500).json({ success: false, message: 'Something went wrong' })
            }
        });
        // get all supplies
        app.get('/api/v1/all-supplies', async (req, res) => {
            try {
                const items = await db.collection('items').find().sort({ createdAt: -1 }).toArray();
                res.status(201).json({
                    success: true,
                    message: 'successful',
                    data: items
                });
            } catch (error) {
                console.log('get all supplies err', error)
            }

        });


        app.get('/api/v1/items/:id', async (req, res) => {
            try {
                const item = await Item.findById(req.params.id);
                res.status(201).json({
                    success: true,
                    message: 'successful',
                    data: item
                });
            } catch (error) {
                console.log('get one', error)
            }
        });

        // update supply
        app.put('/api/v1/items/:id', async (req, res) => {
            const { id } = req.params;
            try {
                const result = await db.collection('items').updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { ...req.body } }
                );
                if (result.matchedCount === 0) {
                    return res.status(404).json({ message: 'Item not found' });
                }
                console.log('updated', result)
                res.status(201).json({
                    success: true,
                    message: 'successful',
                    // data: result
                });
            } catch (error) {
                console.log('update supply err', error)
            }
        });


        // Delete
        app.delete('/api/v1/items/:id', async (req, res) => {
            const { id } = req.params;
            try {
                const result = await db.collection('items').deleteOne({ _id: new ObjectId(id) });
                if (result.deletedCount === 0) {
                    return res.status(404).json({ message: 'Item not found' });
                }
                res.status(201).json({
                    success: true,
                    message: 'successful',

                });
            } catch (error) {
                console.log('delete item err', error)
            }
        });


        // Start the server
        app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
        });

    } finally {
    }
}

run().catch(console.dir);

// Test route
app.get('/', (req, res) => {
    const serverStatus = {
        message: 'Server is running smoothly',
        timestamp: new Date()
    };
    res.json(serverStatus);
});