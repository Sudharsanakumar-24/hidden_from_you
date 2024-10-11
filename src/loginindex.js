const express = require('express');
const bcrypt = require("bcryptjs");
const collection = require("./config");
const multer = require('multer');
const session = require('express-session');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.set('view engine', 'ejs');
app.use(express.static("public"));

app.use(session({
    secret: '8e7c6c1a9d14f0b0bfbaba7a3f56e4c5',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

app.get("/", (req, res) => {
    res.render("login", { errors: {} }); 
});

app.get("/login", (req, res) => {
    res.render("login", { errors: req.query.errors || {} }); 
});

app.get("/signup", (req, res) => {
    res.render("signup", { errors: req.query.errors || {}, data: {} }); 
});

// Random string generator (for traversal)
function generateTraversalString(length) {
    const directions = ['PL', 'PS', 'NL', 'NR'];
    let result = '';
    for (let i = 0; i < length; i++) {
        result += directions[Math.floor(Math.random() * directions.length)];
    }
    return result;
}

// Random string generator for node data
function generateRandomDataString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters[Math.floor(Math.random() * characters.length)];
    }
    return result;
}

// Tree and traversal logic
class Node {
    constructor(data) {
        this.prev_left = null;
        this.prev_right = null;
        this.data = data;
        this.left = null;
        this.right = null;
    }
}

let keynode = null;
let globalTree = null; 

class Tree {
    constructor() {
        this.root = null;
        this.copy = null;
    }

    insert(root, i, randomData) {
        let temp = new Node(randomData);
        //console.log(`Inserting node with data: ${randomData}`);
        if(i === 4999){
            keynode = temp;
        }
        if (!root) {
            root = temp;
        } else {
            if (!root.left) {
                root.left = temp;
                temp.prev_right = root;
            } else if (!root.right) {
                root.right = temp;
                temp.prev_left = root;
            } else {
                let ptr = root;
                
                while (ptr.left) {
                    ptr = ptr.left;
                }
                
                if (!ptr.prev_right.right) {
                    ptr.prev_right.right = temp;
                    temp.prev_left = ptr.prev_right;
                    let cur = temp.prev_left.prev_right.right;
                    cur.left = temp;
                    temp.prev_right = cur;
                    copy = temp;
                } else if (copy !== null && !copy.prev_right.right) {
                    if (!copy.prev_right.prev_right) {
                        copy.prev_right.right = temp;
                        temp.prev_left = copy.prev_right;
                        copy = null;
                    } else {
                        copy.prev_right.right = temp;
                        temp.prev_left = copy.prev_right;
                        let k = temp.prev_left.prev_right.right;
                        k.left = temp;
                        temp.prev_right = k;
                        copy = temp;
                    }
                } else if (!ptr.left && !ptr.right) {
                    ptr.left = temp;
                    temp.prev_right = ptr;
                }
            }
        }
    
        return root;
    }

    createStructure() {
        let tree = new Tree();
        for (let i = 0; i < 10000; i++) {
            tree.insert(tree.root, i, generateRandomDataString(Math.floor(Math.random() * (40 - 20 + 1)) + 20));
        }
        globalTree = tree; 
        return tree;
    }

    traverseAndCollectString(keynode, traversalString) {
        let collectedData = '';
        let currentNode = keynode;
        
        // for (let i = 0; i < traversalString.length; i ++){
        //     if (traversalString[i] === 'N') {
        //         if(currentNode.prev_left === null)
        //             continue;
        //         currentNode = currentNode.prev_left;
        //     } else if (traversalString[i] === 'S') {
        //         if(currentNode.prev_right === null)
        //             continue;
        //         currentNode = currentNode.prev_right;
        //     } else if (traversalString[i] === 'W') {
        //         if(currentNode.left === null)
        //             continue;
        //         currentNode = currentNode.left;
        //     } else if (traversalString[i] === 'E') {
        //         if(currentNode.right === null)
        //             continue;
        //         currentNode = currentNode.right;
        //     }
        //     collectedData += currentNode.data;
        //     console.log(collectedData);
        //     return collectedData; // Return the collected data string
        // }
        // Iterate through the traversal string two characters at a time
        traversalString.split('').forEach(step => {
            if (step === 'PL') {
                currentNode = currentNode.prev_left;
            } else if (step === 'PR') {
                currentNode = currentNode.prev_right;
            } else if (step === 'NL') {
                currentNode = currentNode.left;
            } else if (step === 'NR') {
                currentNode = currentNode.right;
            }

            if (!currentNode) return null; // Invalid traversal
            collectedData += currentNode.data;
            //console.log(collectedData);
        });
        return collectedData;
    }    
}

const create_tree = new Tree().createStructure();

// Create the tree only once
if (!globalTree) {
    new Tree().createStructure();
}

// Request password route
app.post('/request-password', async (req, res) => {
    const { username, password } = req.body; // Password entered by the user

    try {
        // Find the user in the database by username
        const user = await collection.findOne({ username });
        if (!user) {
            return res.status(400).json({ success: false, message: 'Username not found' });
        }

        return res.json({ success: true, message: 'Login successful' });
        // Retrieve the traversal string from the user's record
        const traversalString = user.traversalString;

        // Use the global tree and keynode for traversal
        const nodeDataString = globalTree.traverseAndCollectString(keynode, traversalString);
        
        if (nodeDataString) {
            // Compare the generated string with the stored encrypted password
            const isPasswordCorrect = await bcrypt.compare(nodeDataString, user.password);

            if (isPasswordCorrect) {
                return res.json({ success: true, message: 'Login successful' });
            } else {
                return res.status(401).json({ success: false, message: 'Incorrect password' });
            }
        } else {
            return res.status(500).json({ success: false, message: 'Failed to traverse the tree' });
        }
    } catch (error) {
        console.error('Error during password verification:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Generate password during signup
app.post("/generate-password", async (req, res) => {
    const { username } = req.body;
    if (!username) {
        return res.status(400).send({ error: 'Username is required' });
    }
    // let nodeDataString = null;
    // let traversalString = null;
    // do{
    //     traversalString = generateTraversalString(10);
    //     nodeDataString = globalTree.traverseAndCollectString(keynode, traversalString);
    // } while(nodeDataString===null);
    // Generate a random traversal string
    const traversalString = generateTraversalString(Math.floor(Math.random() * (40 - 20 + 1)) + 20);
    const nodeDataString = globalTree.traverseAndCollectString(keynode, traversalString);
    console.log(traversalString);
    console.log(nodeDataString);
    if (nodeDataString) {
        const saltRounds = 10;
        const encryptedPassword = await bcrypt.hash(nodeDataString, saltRounds);

        const data = {
            username,
            password: encryptedPassword,
            traversalString,
        };

        try {
            await collection.create(data); 
            res.status(200).send({ password: nodeDataString, traversalString: traversalString  });
        } catch (insertError) {
            console.error(insertError);
            return res.status(500).send({ error: 'Failed to create user' });
        }
    } else {
        return res.status(400).send({ error: 'Failed to generate valid password' });
    }
});

// Signup route
app.post("/signup", async (req, res) => {
    const data = {
        username: req.body.username,
    };

    let errors = {};

    const existingUsername = await collection.findOne({ username: data.username });
    if (existingUsername) {
        errors.username = "User already exists. Please choose a different username.";
        return res.render("signup", { errors, data });
    }

    // const traversalString = generateTraversalString(Math.floor(Math.random() * (100 - 20 + 1)) + 20);
    // const tree = new Tree().createStructure();
    // const nodeDataString = globalTree.traverseAndCollectString(keynode, traversalString);

    // if (nodeDataString) {
    //     const saltRounds = 10;
    //     const encryptedPassword = await bcrypt.hash(nodeDataString, saltRounds);
    //     data.password = encryptedPassword;
    //     data.traversalString = traversalString;

    //     try {
    //         await collection.create(data);
    //         res.redirect("/login");
    //     } catch (insertError) {
    //         console.error(insertError);
    //         return res.render("signup", { errors, data });
    //     }
    // } else {
    //     errors.traversal = "Error in tree traversal";
    //     return res.render("signup", { errors, data });
    // }
});

// Login route
app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    const user = await collection.findOne({ username });
    if (!user) {
        return res.status(400).json({ error: 'Invalid username or password' });
    }

    // const isMatch = await bcrypt.compare(password, user.password);
    // if (isMatch) {
    //     req.session.user = user; // Store user in session
    //     res.redirect('/dashboard'); // Redirect to a dashboard or home page
    // } else {
    //     return res.status(400).json({ error: 'Invalid username or password' });
    // }
});

// Logout route
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to logout' });
        }
        res.redirect('/login'); // Redirect to login page after logout
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})