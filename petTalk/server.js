import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import { database } from './scripts/database.js';
import { ObjectId } from 'mongodb';
import multer from 'multer';
import axios from 'axios';
import puppeteer from 'puppeteer-core'; 

const app = express();
const PORT = 8000;
const base_path = "/M00971314";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware to parse incoming JSON requests
app.use(express.json());

// Serve static files from the 'public' directory under the base path
app.use(`${base_path}/`, express.static(path.join(__dirname, 'public')));

// Serve static files from 'scripts'
app.use(`${base_path}/scripts`, express.static(path.join(__dirname, 'scripts')));

//serve files for upload
app.use(`${base_path}/uploads`, express.static(path.join(__dirname, 'uploads')));

//Configure express to use express-session
app.use(
    session({
        secret: 'M00971314 secret',
        cookie: { maxAge: 600000 },
        resave: false,
        saveUninitialized: true
    })
);

// Default route to serve index.html under the base path
app.get(`${base_path}/`, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

//creating instance of database
const dataBase = new database();

// POST route to handle registration
app.post(`${base_path}/register`, async (req, res) => {
    //connecting to database
    await dataBase.connect();
    //getting collection for users
    const myCollection = dataBase.getCollection("PetTalk", "Users");
    //saving registered user information
    const { username, email, password, telNumber } = req.body;
    const newUser = { username:username, email:email, password:password, telNumber:telNumber };
    //inserting new user into collection
    const result = await myCollection.insertOne(newUser);
    console.log(result);
    //close connection
    await dataBase.close();

    res.json({ success: true, message: 'Registration successful!' });
});

// POST route to handle login
app.post(`${base_path}/login`, async (req, res) => {
    try {
        // Connect to the database
        await dataBase.connect();
        // Get the collection for users
        const myCollection = dataBase.getCollection("PetTalk", "Users");
        // Extract username and password from the request body
        const { username, password } = req.body;
        // Check if both username and password are provided
        if (!username || !password) {
            return res.status(400).json({ success: false, message: "Username and password are required." });
        }
        // Find the user in the database by username
        const user = await myCollection.findOne({ username });
        if (!user) {
            // User not found
            return res.status(404).json({ success: false, message: "User not found." });
        }
        // Validate the password
        if (user.password !== password) {
            // Password doesn't match
            return res.status(401).json({ success: false, message: "Invalid password." });
        }

        // Store user information in the session
        req.session.username = user.username;
        
        // Login successful
        return res.json({ success: true, message: "Login successful!" });
    } catch (error) {
        console.error("Error during login:", error);
        return res.status(500).json({ success: false, message: "An error occurred. Please try again later." });
    } finally {
        // Disconnect from the database
        await dataBase.close();
    }
});

// Route to check if the user is logged in
app.get(`${base_path}/session`, (req, res) => {
    if (req.session.username) {
        res.json({ loggedIn: true, username: req.session.username });
    } else {
        res.json({ loggedIn: false });
    }
});

// Route to handle logout
app.delete(`${base_path}/logout`, (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Failed to log out." });
        }
        res.json({ success: true, message: "Logged out successfully!" });
    });
});


// Route to send a friend request
app.post(`${base_path}/friends/request`, async (req, res) => {
    const { fromUser, toUser } = req.body;

    try {
        await dataBase.connect();
        const friendRequests = dataBase.getCollection('PetTalk', 'FriendRequests');

        // Check if request already exists
        const existingRequest = await friendRequests.findOne({ fromUser, toUser, status: 'pending' });
        if (existingRequest) {
            return res.status(400).json({ success: false, message: 'Friend request already sent.' });
        }

        // Insert the friend request
        const newRequest = { fromUser, toUser, status: 'pending' };
        await friendRequests.insertOne(newRequest);

        res.json({ success: true, message: 'Friend request sent.' });
    } catch (error) {
        console.error('Error sending friend request:', error);
        res.status(500).json({ success: false, message: 'An error occurred.' });
    } finally {
        await dataBase.close();
    }
});

// Route to get pending friend requests
app.get(`${base_path}/friends/pending`, async (req, res) => {
    const username = req.session.username;

    try {
        await dataBase.connect();
        const collection = dataBase.getCollection("PetTalk", "FriendRequests");

        const pendingRequests = await collection.find({ toUser: username, status: "pending" }).toArray();
        res.json(pendingRequests);
    } catch (error) {
        console.error("Error fetching pending friend requests:", error);
        res.status(500).json({ success: false, message: "Failed to fetch pending requests." });
    } finally {
        await dataBase.close();
    }
});

// Route to accept a friend request
app.post(`${base_path}/friends/accept`, async (req, res) => {
    const { requestId } = req.body;
    try {
        await dataBase.connect();
        const friendRequests = dataBase.getCollection('PetTalk', 'FriendRequests');
        const users = dataBase.getCollection('PetTalk', 'Users');

        // Find and update request status
        const request = await friendRequests.findOne({ _id: new ObjectId(requestId), status: 'pending' });

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found.' });
        }

        await friendRequests.updateOne({ _id: new ObjectId(requestId) }, { $set: { status: 'accepted' } });

        // Add friends to each other's lists
        await users.updateOne({ username: request.fromUser }, { $push: { friends: request.toUser } });
        await users.updateOne({ username: request.toUser }, { $push: { friends: request.fromUser } });

        res.json({ success: true, message: 'Friend request accepted.' });
    } catch (error) {
        console.error('Error accepting friend request:', error);
        res.status(500).json({ success: false, message: 'An error occurred.' });
    } finally {
        await dataBase.close();
    }
});

// Route to decline a friend request
app.post(`${base_path}/friends/decline`, async (req, res) => {
    const { requestId } = req.body;

    try {
        await dataBase.connect();
        const collection = dataBase.getCollection("PetTalk", "FriendRequests");

        // Delete the request
        const result = await collection.deleteOne({ _id: new ObjectId(requestId) });

        if (result.deletedCount > 0) {
            res.json({ success: true, message: "Friend request declined." });
        } else {
            res.json({ success: false, message: "Friend request not found." });
        }
    } catch (error) {
        console.error("Error declining friend request:", error);
        res.status(500).json({ success: false, message: "Failed to decline friend request." });
    } finally {
        await dataBase.close();
    }
});

// Route to list friends
app.get(`${base_path}/friends/list`, async (req, res) => {
    try {
        const username = req.session.username;
        if (!username) {
            return res.status(401).json({ success: false, message: 'Not logged in.' });
        }

        await dataBase.connect();
        const users = dataBase.getCollection('PetTalk', 'Users');

        const user = await users.findOne({ username }, { projection: { friends: 1 } });
        if (!user || !user.friends) {
            return res.json([]);
        }

        // Populate friend usernames
        const friends = await users.find({ username: { $in: user.friends } }, { projection: { username: 1 } }).toArray();

        res.json(friends);
    } catch (error) {
        console.error('Error fetching friends list:', error);
        res.status(500).json({ success: false, message: 'An error occurred.' });
    } finally {
        await dataBase.close();
    }
});

// Route to remove a friend
app.delete(`${base_path}/friends/remove`, async (req, res) => {
    const { friendUsername } = req.body;
    const currentUser = req.session.username;

    if (!currentUser) {
        return res.status(401).json({ success: false, message: 'User not logged in.' });
    }

    if (!friendUsername) {
        return res.status(400).json({ success: false, message: 'Friend username is required.' });
    }

    try {
        await dataBase.connect();
        const usersCollection = dataBase.getCollection('PetTalk', 'Users');

        // Find the current user and the friend user
        const currentUserData = await usersCollection.findOne({ username: currentUser });
        const friendUserData = await usersCollection.findOne({ username: friendUsername });

        if (!currentUserData || !friendUserData) {
            return res.status(404).json({ success: false, message: 'User or friend not found.' });
        }

        // Remove each other from both users' friends lists
        await usersCollection.updateOne(
            { username: currentUser },
            { $pull: { friends: friendUsername } }
        );
        await usersCollection.updateOne(
            { username: friendUsername },
            { $pull: { friends: currentUser } }
        );

        res.json({ success: true, message: 'Friend removed successfully.' });
    } catch (error) {
        console.error('Error removing friend:', error);
        res.status(500).json({ success: false, message: 'An error occurred.' });
    } finally {
        await dataBase.close();
    }
});

//use multer to be able to upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'uploads')); // Folder to store uploads
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Unique filename with the correct extension
    },
});

const upload = multer({ storage });

// Route to create a post
app.post(`${base_path}/posts/create`, upload.single('media'), async (req, res) => {
    const { username, description, content } = req.body;
    const mediaPath = req.file ? `/uploads/${req.file.filename}` : null; // Get the media file path

    if (!username || (!description && !content && !mediaPath)) {
        return res.status(400).json({ success: false, message: "Incomplete post data." });
    }

    try {
        await dataBase.connect();
        const postsCollection = dataBase.getCollection('PetTalk', 'Posts');
        const usersCollection = dataBase.getCollection('PetTalk', 'Users');

        // Create the new post document
        const newPost = { username, description, content, media: mediaPath, timestamp: new Date() };
        await postsCollection.insertOne(newPost);

        // Increment the post count in the Users collection
        await usersCollection.updateOne(
            { username }, // Find the user by username
            { $inc: { postsCount: 1 } } // Increment the postsCount by 1
        );

        res.json({ success: true, message: "Post created successfully!" });
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ success: false, message: "Failed to create post." });
    } finally {
        await dataBase.close();
    }
});

// Route to get all posts
app.get(`${base_path}/posts`, async (req, res) => {
    try {
        await dataBase.connect();
        const postsCollection = dataBase.getCollection('PetTalk', 'Posts');

        const posts = await postsCollection.find({}).sort({ timestamp: -1 }).toArray(); // Sort by newest first
        res.json(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ success: false, message: "Failed to fetch posts." });
    } finally {
        await dataBase.close();
    }
});

// Route to get posts by the current user
app.get(`${base_path}/myposts`, async (req, res) => {
    try {
        const currentUsername = req.session.username; // Get the current username from the session

        if (!currentUsername) {
            return res.status(400).json({ success: false, message: "User not logged in." });
        }

        await dataBase.connect();
        const postsCollection = dataBase.getCollection('PetTalk', 'Posts');

        // Find posts that match the current username
        const posts = await postsCollection.find({ username: currentUsername }).sort({ timestamp: -1 }).toArray(); // Sort by newest first
        res.json(posts);
    } catch (error) {
        console.error('Error fetching posts by user:', error);
        res.status(500).json({ success: false, message: "Failed to fetch posts by user." });
    } finally {
        await dataBase.close();
    }
});

// Route to search for users
app.get(`${base_path}/search/users`, async (req, res) => {
    const { query } = req.query;

    if (!query) {
        return res.status(400).json({ success: false, message: "Search query is required." });
    }

    try {
        await dataBase.connect();
        const usersCollection = dataBase.getCollection("PetTalk", "Users");

        // Search users by username using text index
        const users = await usersCollection
            .find({ $text: { $search: query } }, { projection: { username: 1, _id: 0 } })
            .sort({ username: 1 })
            .toArray();

        res.json({ success: true, users });
    } catch (error) {
        console.error("Error searching for users:", error);
        res.status(500).json({ success: false, message: "Failed to search users." });
    } finally {
        await dataBase.close();
    }
});

// Route to search for posts
app.get(`${base_path}/search/posts`, async (req, res) => {
    const { query } = req.query;

    if (!query) {
        return res.status(400).json({ success: false, message: "Search query is required." });
    }

    try {
        await dataBase.connect();
        const postsCollection = dataBase.getCollection("PetTalk", "Posts");

        // Search posts by content or description using text index
        const posts = await postsCollection
            .find({ $text: { $search: query } })
            .sort({ timestamp: -1 }) // Sort by latest timestamp
            .toArray();

        res.json({ success: true, posts });
    } catch (error) {
        console.error("Error searching for posts:", error);
        res.status(500).json({ success: false, message: "Failed to search posts." });
    } finally {
        await dataBase.close();
    }
});

// Route to add an animal to the user's profile
app.post(`${base_path}/animals/add`, async (req, res) => {
    const { animalName } = req.body;
    const username = req.session.username;

    if (!username) {
        return res.status(401).json({ success: false, message: 'User not logged in.' });
    }

    try {
        await dataBase.connect();
        const usersCollection = dataBase.getCollection('PetTalk', 'Users');

        // Add the new animal to the user's 'animals' array
        const result = await usersCollection.updateOne(
            { username },
            { $push: { animals: animalName } }
        );

        if (result.modifiedCount > 0) {
            res.json({ success: true, message: 'Animal added successfully.' });
        } else {
            res.json({ success: false, message: 'Failed to add animal.' });
        }
    } catch (error) {
        console.error('Error adding animal:', error);
        res.status(500).json({ success: false, message: 'An error occurred while adding the animal.' });
    } finally {
        await dataBase.close();
    }
});

// Route to list all animals of the current user
app.get(`${base_path}/animals/list`, async (req, res) => {
    const username = req.session.username;

    if (!username) {
        return res.status(401).json({ success: false, message: 'User not logged in.' });
    }

    try {
        await dataBase.connect();
        const usersCollection = dataBase.getCollection('PetTalk', 'Users');

        // Get the user's animals array
        const user = await usersCollection.findOne({ username }, { projection: { animals: 1 } });
        if (!user || !user.animals) {
            return res.json([]); // Return an empty list if no animals
        }

        res.json(user.animals);
    } catch (error) {
        console.error('Error fetching animals:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch animals.' });
    } finally {
        await dataBase.close();
    }
});

// Route to remove an animal from the user's profile
app.post(`${base_path}/animals/remove`, async (req, res) => {
    const { animalName } = req.body;
    const username = req.session.username;

    if (!username) {
        return res.status(401).json({ success: false, message: 'User not logged in.' });
    }

    try {
        await dataBase.connect();
        const usersCollection = dataBase.getCollection('PetTalk', 'Users');

        // Remove the animal from the user's 'animals' array
        const result = await usersCollection.updateOne(
            { username },
            { $pull: { animals: animalName } }
        );

        if (result.modifiedCount > 0) {
            res.json({ success: true, message: 'Animal removed successfully.' });
        } else {
            res.json({ success: false, message: 'Failed to remove animal or animal not found.' });
        }
    } catch (error) {
        console.error('Error removing animal:', error);
        res.status(500).json({ success: false, message: 'An error occurred while removing the animal.' });
    } finally {
        await dataBase.close();
    }
});

// Route to get user's stats
app.get(`${base_path}/user/stats`, async (req, res) => {
    const username = req.session.username;

    if (!username) {
        return res.status(401).json({ success: false, message: 'User not logged in.' });
    }

    try {
        await dataBase.connect();
        const usersCollection = dataBase.getCollection('PetTalk', 'Users');

        // Fetch the user data
        const user = await usersCollection.findOne(
            { username },
            { projection: { friends: 1, animals: 1, postsCount: 1 } }
        );

        if (user) {
            const stats = {
                friendsCount: user.friends ? user.friends.length : 0,
                animalsCount: user.animals ? user.animals.length : 0,
                postsCount: user.postsCount || 0,
            };

            res.json({ success: true, ...stats });
        } else {
            res.status(404).json({ success: false, message: 'User not found.' });
        }
    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({ success: false, message: 'An error occurred while fetching stats.' });
    } finally {
        await dataBase.close();
    }
});

const DOG_API_KEY = 'live_lHGO1PYApOjteAd81Rug4h1KPBq5OPPzK3dxBS2ijzOzj8F96Kja9a6TworDeRSn';
const CAT_API_KEY = 'live_6qYqfWyYKYjxhDYjjsPYCjmXuQXhhKK3HvPsjmURjjfnlZQfSJtwnEmWrCIinF2t';

// Route to fetch and store dog and cat data in MongoDB
app.get(`${base_path}/explore/pets`, async (req, res) => {
    const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
    const pageSize = 10; // Number of pets per page

    try {
        // Connect to MongoDB
        await dataBase.connect();
        const petDataCollection = dataBase.getCollection('PetTalk', 'PetData');

        // Check if pet data already exists in MongoDB
        const existingPets = await petDataCollection.find({}).skip((page - 1) * pageSize).limit(pageSize).toArray();

        // If data exists, send it to the client
        if (existingPets.length > 0) {
            return res.json(existingPets);
        }

        // Fetch dog data from Dog API
        const dogResponse = await axios.get('https://api.thedogapi.com/v1/images/search?limit=10&include_breeds=true', {
            headers: {
                'x-api-key': DOG_API_KEY,
            },
        });

        // Process and filter the dog data
        const dogData = dogResponse.data
            .map((dog) => {
                const breed = dog.breeds[0];
                return {
                    imageUrl: dog.url,
                    breedName: breed ? breed.name : 'Unknown Breed',
                    temperament: breed ? breed.temperament : 'Unknown Temperament',
                    lifespan: breed ? breed.life_span : 'Unknown Lifespan',
                    type: 'dog', // Add type for identification
                };
            })
            .filter((dog) => dog.breedName !== 'Unknown Breed' && dog.temperament !== 'Unknown Temperament' && dog.lifespan !== 'Unknown Lifespan'); // Filter out unknowns

        // Fetch cat data from Cat API
        const catResponse = await axios.get('https://api.thecatapi.com/v1/images/search?limit=10&include_breeds=true', {
            headers: {
                'x-api-key': CAT_API_KEY,
            },
        });

        // Process and filter the cat data
        const catData = catResponse.data
            .map((cat) => {
                const breed = cat.breeds[0];
                return {
                    imageUrl: cat.url,
                    breedName: breed ? breed.name : 'Unknown Breed',
                    temperament: breed ? breed.temperament : 'Unknown Temperament',
                    lifespan: breed ? breed.life_span : 'Unknown Lifespan',
                    type: 'cat', // Add type for identification
                };
            })
            .filter((cat) => cat.breedName !== 'Unknown Breed' && cat.temperament !== 'Unknown Temperament' && cat.lifespan !== 'Unknown Lifespan'); // Filter out unknowns

        // Combine dog and cat data
        const combinedData = [...dogData, ...catData];

        // Shuffle the data to alternate between cats and dogs
        const shuffledData = combinedData.sort(() => Math.random() - 0.5);

        // Store the combined and shuffled data in MongoDB
        await petDataCollection.insertMany(shuffledData);

        // Send a specific page of data to the client
        const pageData = shuffledData.slice((page - 1) * pageSize, page * pageSize);
        res.json(pageData); // Send the paginated data to the client
    } catch (error) {
        console.error('Error fetching data from APIs:', error);
        res.status(500).json({ error: 'Failed to fetch data.' });
    } finally {
        await dataBase.close();
    }
});

app.get(`${base_path}/forYou/pets`, async (req, res) => {
    const petType = req.query.petType;  // Fetch petType from the query parameter
    const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
    const pageSize = 10; // Number of pets per page

    if (!petType || !['Cat', 'Dog'].includes(petType)) {
        return res.status(400).json({ error: 'Invalid petType. Must be either "Cat" or "Dog".' });
    }

    try {
        // Connect to MongoDB
        await dataBase.connect();
        const petDataCollection = dataBase.getCollection('PetTalk', 'PetData');

        // Fetch pets based on petType (either 'cat' or 'dog')
        const pets = await petDataCollection.find({ type: petType.toLowerCase() })
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .toArray();

        if (pets.length > 0) {
            return res.json(pets);  // Send the filtered pets for the requested type
        } else {
            // If no data exists for the requested petType, fetch from API
            let petData;
            if (petType === 'Cat') {
                petData = await fetchCatData();
            } else if (petType === 'Dog') {
                petData = await fetchDogData();
            }

            // Store the fetched pet data into MongoDB for future use
            await petDataCollection.insertMany(petData);

            // Paginate and send data
            const pageData = petData.slice((page - 1) * pageSize, page * pageSize);
            res.json(pageData);
        }
    } catch (error) {
        console.error('Error fetching data from APIs:', error);
        res.status(500).json({ error: 'Failed to fetch data.' });
    } finally {
        await dataBase.close();
    }
});

// Route to list friends for a friend
app.get(`${base_path}/viewfriends/list`, async (req, res) => {
    try {
        const { name } = req.query; // Extract the name from query parameters

        if (!name) {
            return res.status(400).json({ success: false, message: 'Name parameter is required.' });
        }

        await dataBase.connect();
        const users = dataBase.getCollection('PetTalk', 'Users');

        const user = await users.findOne({ username: name }, { projection: { friends: 1 } });
        if (!user || !user.friends) {
            return res.json([]); // Return an empty array if the user or friends list doesn't exist
        }

        // Populate friend usernames
        const friends = await users.find({ username: { $in: user.friends } }, { projection: { username: 1 } }).toArray();

        res.json(friends);
    } catch (error) {
        console.error('Error fetching friends list:', error);
        res.status(500).json({ success: false, message: 'An error occurred.' });
    } finally {
        await dataBase.close();
    }
});

// route to get list of animls for friend
app.get(`${base_path}/friendanimals/list`, async (req, res) => {
    try {
        const { name } = req.query; // Extract the name from query parameters

        if (!name) {
            return res.status(400).json({ success: false, message: 'Name parameter is required.' });
        }

        await dataBase.connect();
        const usersCollection = dataBase.getCollection('PetTalk', 'Users');

        // Get the user's animals array
        const user = await usersCollection.findOne({ username: name }, { projection: { animals: 1 } });
        if (!user || !user.animals) {
            return res.json([]); // Return an empty list if no animals
        }

        res.json(user.animals);
    } catch (error) {
        console.error('Error fetching animals:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch animals.' });
    } finally {
        await dataBase.close();
    }
});

// Route to get posts for friends
app.get(`${base_path}/friendposts`, async (req, res) => {
    try {
        const { name } = req.query; // Extract the friend's username from query parameters

        if (!name) {
            return res.status(400).json({ success: false, message: "Friend's name parameter is required." });
        }

        await dataBase.connect();
        const postsCollection = dataBase.getCollection('PetTalk', 'Posts');

        // Find posts by the friend's username
        const posts = await postsCollection.find({ username: name }).sort({ timestamp: -1 }).toArray(); // Sort by newest first
        res.json(posts);
    } catch (error) {
        console.error('Error fetching posts by friend:', error);
        res.status(500).json({ success: false, message: "Failed to fetch posts by friend." });
    } finally {
        await dataBase.close();
    }
});

// route to get stats for friends
app.get(`${base_path}/friend/stats`, async (req, res) => {
    const username = req.query.name; // Get the 'name' parameter from the query string

    if (!username) {
        return res.status(400).json({ success: false, message: 'Username is required.' });
    }

    try {
        await dataBase.connect();
        const usersCollection = dataBase.getCollection('PetTalk', 'Users');

        // Fetch the user data using the provided username
        const user = await usersCollection.findOne(
            { username },
            { projection: { friends: 1, animals: 1, postsCount: 1 } }
        );

        if (user) {
            const stats = {
                friendsCount: user.friends ? user.friends.length : 0,
                animalsCount: user.animals ? user.animals.length : 0,
                postsCount: user.postsCount || 0,
            };

            res.json({ success: true, ...stats });
        } else {
            res.status(404).json({ success: false, message: 'User not found.' });
        }
    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({ success: false, message: 'An error occurred while fetching stats.' });
    } finally {
        await dataBase.close();
    }
});

// Route to like a post
app.post(`${base_path}/posts/:postId/like`, async (req, res) => {
    const postId = req.params.postId;

    try {
        await dataBase.connect();
        const postsCollection = dataBase.getCollection('PetTalk', 'Posts');

        const result = await postsCollection.updateOne(
            { _id: new ObjectId(postId) },
            { $inc: { likes: 1 } }
        );

        if (result.modifiedCount > 0) {
            res.json({ success: true, message: "Post liked successfully!" });
        } else {
            res.status(400).json({ success: false, message: "Failed to like the post." });
        }
    } catch (error) {
        console.error("Error liking post:", error);
        res.status(500).json({ success: false, message: "Server error." });
    } finally {
        await dataBase.close();
    }
});


// Route to get comments for a specific post
app.get(`${base_path}/posts/:postId/comments`, async (req, res) => {
    const postId = req.params.postId;

    try {
        await dataBase.connect();
        const postsCollection = dataBase.getCollection('PetTalk', 'Posts');
        const post = await postsCollection.findOne({ _id: new ObjectId(postId) });

        if (!post) {
            return res.status(404).json({ success: false, message: "Post not found." });
        }

        res.json({ success: true, comments: post.comments || [] });
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ success: false, message: "Failed to fetch comments." });
    } finally {
        await dataBase.close();
    }
});

// Route to add a comment to a specific post
app.post(`${base_path}/posts/:postId/comment`, async (req, res) => {
    const postId = req.params.postId;
    const {text } = req.body;
    const username = req.session.username;

    if (!username || !text) {
        return res.status(400).json({ success: false, message: "Incomplete comment data." });
    }

    try {
        await dataBase.connect();
        const postsCollection = dataBase.getCollection('PetTalk', 'Posts');
        
        const result = await postsCollection.updateOne(
            { _id: new ObjectId(postId) },
            { $push: { comments: { username, text, timestamp: new Date() } } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ success: false, message: "Post not found." });
        }

        res.json({ success: true, message: "Comment added successfully!" });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ success: false, message: "Failed to add comment." });
    } finally {
        await dataBase.close();
    }
});

// Route to scrape, save, and fetch book data
app.get(`${base_path}/news`, async (req, res) => {
    try {
        // Scrape book data
        const books = await scrapeBooks();

        // Connect to the database and get the collection
        await dataBase.connect();
        const scrapeCollection = dataBase.getCollection('PetTalk', 'ScrapeData');

        // Insert the new data into the collection
        const insertResult = await scrapeCollection.insertMany(books);

        if (!insertResult.acknowledged) {
            throw new Error("Failed to save scraped data.");
        }

        // Fetch the saved data from the collection
        const savedData = await scrapeCollection.find({}).toArray();

        res.json({ success: true, data: savedData });
    } catch (error) {
        console.error("Error scraping news:", error);
        res.status(500).json({ success: false, message: "Failed to fetch news." });
    } finally {
        await dataBase.close();
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}${base_path}`);
});

async function fetchDogData() {
    const dogResponse = await axios.get('https://api.thedogapi.com/v1/images/search?limit=10&include_breeds=true', {
        headers: {
            'x-api-key': DOG_API_KEY,
        },
    });

    return dogResponse.data.map((dog) => {
        const breed = dog.breeds[0];
        return {
            imageUrl: dog.url,
            breedName: breed ? breed.name : 'Unknown Breed',
            temperament: breed ? breed.temperament : 'Unknown Temperament',
            lifespan: breed ? breed.life_span : 'Unknown Lifespan',
            type: 'dog',
        };
    }).filter((dog) => dog.breedName !== 'Unknown Breed' && dog.temperament !== 'Unknown Temperament' && dog.lifespan !== 'Unknown Lifespan');
}

async function fetchCatData() {
    const catResponse = await axios.get('https://api.thecatapi.com/v1/images/search?limit=10&include_breeds=true', {
        headers: {
            'x-api-key': CAT_API_KEY,
        },
    });

    return catResponse.data.map((cat) => {
        const breed = cat.breeds[0];
        return {
            imageUrl: cat.url,
            breedName: breed ? breed.name : 'Unknown Breed',
            temperament: breed ? breed.temperament : 'Unknown Temperament',
            lifespan: breed ? breed.life_span : 'Unknown Lifespan',
            type: 'cat',
        };
    }).filter((cat) => cat.breedName !== 'Unknown Breed' && cat.temperament !== 'Unknown Temperament' && cat.lifespan !== 'Unknown Lifespan');
}

// Function to scrape book data
async function scrapeBooks() {
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: 'c:/Program Files/Google/Chrome/Application/chrome.exe'
    });

    const page = await browser.newPage();

    try {
        await page.goto('https://books.toscrape.com', { waitUntil: 'domcontentloaded' });

        const books = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.product_pod')).map(book => ({
                title: book.querySelector('h3 a').title,
                price: book.querySelector('.price_color').textContent,
                availability: book.querySelector('.instock.availability').textContent.trim()
            }));
        });

        await browser.close();
        return books;
    } catch (error) {
        console.error('Error scraping books:', error);
        await browser.close();
        throw error;
    }
}
