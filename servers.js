const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { Stream } = require('stream');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.set('view engine', 'ejs');

app.use(express.static('public'));


const users = [];
const streams = {};

// Middleware to check if user is authenticated

// Authenticate the user based on the authorization token
const authenticateUser = (req, res, next) => {
    const { authorization } = req.headers;
  
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  
    const token = authorization.substring(7); // Remove "Bearer " prefix
  
    // Validate the token and retrieve the user information
    const user = users.find((u) => u.token === token);
  
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  
    // Set the authenticated user information in the request object
    req.user = user;
  
    // Proceed to the next middleware or route handler
    next();
  };
  
// Register a new user
app.post('/api/v1/signup', (req, res) => {
    const { username, password } = req.body;
  
    // Check if the username or password is empty or undefined
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
  
    // Check if the username is already taken
    const existingUser = users.find((user) => user.username === username);
    if (existingUser) {
      return res.status(409).json({ message: 'Username is already taken' });
    }
  
    // Create a new user object
    const user = {
      id: uuidv4(),
      username,
      password,
      token: uuidv4(), // Generate a unique token for authentication
      isLoggedIn: false, // Set initial login status to false
    };
  
    // Add the user to the users array
    users.push(user);
    console.log(user); // Logging the new user object
  
    // Return the user object
    res.status(201).json({ user });
  });
  
  // Authenticate and login a user
  app.post('/api/v1/login', (req, res) => {
    const { username, password } = req.body;
  
    // Check if the username or password is empty or undefined
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
  
    // Find the user with the matching username and password
    const user = users.find((u) => u.username === username && u.password === password);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
  
    // Check if the user is already logged in
    if (user.isLoggedIn) {
      return res.status(200).json({ message: 'User is already logged in' });
    }
  
    // Generate a new token for authentication
    //user.token = uuidv4();
    user.isLoggedIn = true; // Update login status
  
    // Return the authenticated user object
    res.status(200).json({ user });
  });
  
  
  

// Create a new stream
app.post('/api/v1/streams', authenticateUser, (req, res) => {
  const { title, description } = req.body;
  const { user } = req;

  // Generate a new stream ID
  const streamId = uuidv4();

  // Create a new stream object
  const stream = {
    id: streamId,
    title,
    description,
    userId: user.id,
    owner: user.username,
    viewers: 0,
  };

  // Store the stream in the streams object
  streams[streamId] = stream;

  // Return the created stream object
  res.status(201).json({ stream });
});

// Get all streams
app.get('/api/v1/streams', (req, res) => {
  // Return an array of all stream objects
  const allStreams = Object.values(streams);
  res.status(200).json({ streams: allStreams });
});

// Get a specific stream
app.get('/api/v1/stream/:streamId', (req, res) => {
  const { streamId } = req.params;

  // Check if the stream exists
  const stream = streams[streamId];
  if (!stream) {
    return res.status(404).json({ message: 'Stream not found' });
  }

  // Return the stream object
  res.status(200).json({ stream });
});

// Update a stream
app.put('/api/v1/stream/:streamId', authenticateUser, (req, res) => {
  const { streamId } = req.params;
  const { user } = req;
  const { title, description } = req.body;

  // Check if the stream exists and belongs to the authenticated user
  const stream = streams[streamId];
  if (!stream || stream.userId !== user.id) {
    return res.status(404).json({ message: 'Stream not found' });
  }

  // Update the stream title and description
  stream.title = title;
  stream.description = description;

  // Return the updated stream object
  res.status(200).json({ stream });
});

// Delete a stream
app.delete('/api/v1/stream/:streamId', authenticateUser, (req, res) => {
  const { streamId } = req.params;
  const { user } = req;

  // Check if the stream exists and belongs to the authenticated user
  const stream = streams[streamId];
  if (!stream || stream.userId !== user.id) {
    return res.status(404).json({ message: 'Stream not found' });
  }

  // Delete the stream from the streams object
  delete streams[streamId];

  // Return a success message
  res.status(200).json({ message: 'Stream deleted successfully' });
});

// Stream a specific stream
app.get('/watch/:streamId', (req, res) => {
  const { streamId } = req.params;

  // Check if the stream exists
  const stream = streams[streamId];
  if (!stream) {
    return res.status(404).json({ message: 'Stream not found' });
  }

  // Increase the viewer count for the stream
  stream.viewers++;

  // Create a readable stream to simulate the video/audio data
  const videoStream = new Stream();

  // Implement your video/audio streaming logic here using the videoStream

  // Set the appropriate headers for video/audio streaming
  res.writeHead(200, {
    'Content-Type': 'video/mp4', // Replace with the appropriate content type for your stream
    'Transfer-Encoding': 'chunked',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  // Pipe the videoStream to the response
  videoStream.pipe(res);

  // Handle stream end event to decrease the viewer count
  videoStream.on('end', () => {
    stream.viewers--;

    // Clean up resources or perform any necessary cleanup
    // ...
  });

  // Handle stream error event
  videoStream.on('error', (err) => {
    console.error('Stream error:', err);

    // Handle stream error and send an appropriate response
    res.status(500).json({ message: 'An error occurred during streaming' });

    // Clean up resources or perform any necessary cleanup
    // ...
  });
});

// Render the home page with a list of streams
app.get('/', (req, res) => {
  const streamList = Object.values(streams);
  const user = req.user; // Assuming the authenticated user object is available in req.user
  res.render('index', { streams: streamList, user });
});


app.get('/create-stream', (req, res) => {
  
  const user = req.user; // Assuming the authenticated user object is available in req.user
  res.render('create-stream', { user });
});

app.get('/login', (req, res) => {
  
  const user = req.user; // Assuming the authenticated user object is available in req.user
  res.render('login', { user });
});

app.get('/signup', (req, res) => {
 
  const user = req.user; // Assuming the authenticated user object is available in req.user
  res.render('signup', {  user });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
