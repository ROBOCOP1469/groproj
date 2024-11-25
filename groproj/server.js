var express             = require('express'),
    app                 = express(),
    passport            = require('passport'),
    FacebookStrategy    = require('passport-facebook').Strategy,
    LocalStrategy = require("passport-local").Strategy,
    mongoose = require("mongoose"),
    session             = require('express-session'),
	{ MongoClient, ServerApiVersion, ObjectId } = require("mongodb"),
	formidable 			= require('express-formidable'),
	fsPromises 			= require('fs').promises;

app.set('view engine', 'ejs');

/*MongoDB settings*/
const mongourl = 'mongodb+srv://admin:admin@cluster0.uwyrf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
const dbName = 'test';
const collectionName = "stocks";
const client = new MongoClient(mongourl, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
const insertDocument = async (db, doc) => {
    var collection = db.collection(collectionName);
    let results = await collection.insertOne(doc);
	console.log("insert one document:" + JSON.stringify(results));
    return results;
}

const findDocument = async (db, criteria) => {
    var collection = db.collection(collectionName);
    let results = await collection.find(criteria).toArray();
	console.log("find the documents:" + JSON.stringify(results));
    return results;
}
const updateDocument = async (db, criteria, updateData) => {
    var collection = db.collection(collectionName);
    let results = await collection.updateOne(criteria, { $set: updateData });
	console.log("update one document:" + JSON.stringify(results));
    return results;
}
const deleteDocument = async (db, criteria) => {
    var collection = db.collection(collectionName);
    let results = await collection.deleteMany(criteria);
	console.log("delete one document:" + JSON.stringify(results));
    return results;
}
/*End of MongoDB settings*/
/*
const userSchema = new mongoose.Schema({
	username: {
	type: String,
	required: true,
	unique: true },
	password: {
	type: String,
	required: true }
});

userSchema.methods.verifyPassword = function(password) {
	return this.password == password;
};


const User = mongoose.model("User", userSchema);
*/


const users = [
    { username: 'admin', password: 'admin' },
    { username: 'user1', password: 'password1' },
    { username: 'user2', password: 'password2' }
];

//var user = {};  

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: "yourSecretKey", resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

/*

passport.serializeUser(function (user, done) {done(null, username);});
passport.deserializeUser(function (username, done) {done(null, user);});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: "yourSecretKey", resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());


passport.use(new FacebookStrategy({
    "clientID"        : '1278088996428493',
    "clientSecret"    : 'b0b879957b67ab0037e302b117fdd74d',
    "callbackURL"     : 'http://localhost:8099/auth/facebook/callback'
  },  
  function (token, refreshToken, profile, done) {
    console.log("Facebook Profile: " + JSON.stringify(profile));
    console.log(profile);
    user = {};
    user['id'] = profile.id;
    user['name'] = profile.displayName;
    user['type'] = profile.provider;  
    console.log('user object: ' + JSON.stringify(user));
    return done(null,user);  
  })
);*/
/*
passport.use(new LocalStrategy(	
  function(username, password, done) {
    User.findOne({ username: username }, function (err, user) {
      if (err) { return done(err); }
      if (!user) { return done(null, false); }
      if (!user.verifyPassword(password)) { return done(null, false); }
      return done(null, user);
    });
  }
));*/

passport.use(new LocalStrategy(	
  function(username, password, done) {
  	const user = users.find(user => user.username === username);
  	
  	if (!user) {
  	return done(null, false, {message: 'Incorrect username or password' });
  	}
  	if (user.password !== password) {
  	return done(null, false, {message: 'Incorrect username or password' });
    	}
    	return done(null, user);
  }
));

passport.serializeUser(function (user, done) {done(null, user.username);});
passport.deserializeUser(function (username, done) {
	const user = users.find(user => user.username === username);
	done(null, user);
});

app.use((req,res,next) => {
    let d = new Date();
    console.log(`TRACE: ${req.path} was requested at ${d.toLocaleDateString()}`);  
    next();
});

const isLoggedIn = (req,res,next) => {
    if (req.isAuthenticated())
        return next();
    res.redirect('/login');
}
app.get("/login", function (req, res) {
	res.status(200).render('login');
});

app.post('/login', passport.authenticate('local', {
    successRedirect: "/",
    failureRedirect: "/login"
}),
  function(req, res) {
    res.redirect('/');
  });
  
/*
app.get("/login", function (req, res) {
	res.status(200).render('login');
});

app.get("/auth/facebook", passport.authenticate("facebook", { scope : "email" }));
app.get("/auth/facebook/callback",
    passport.authenticate("facebook", {
        successRedirect : "/content",
        failureRedirect : "/"
}));

app.post("/login", passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login"
}));*/

/*CRUD handler functions*/
const handle_Create = async (req, res) => {
	await client.connect();
	console.log("Connected successfully to server");
    const db = client.db(dbName);
    let newDoc = {
        userid: req.user.id,
        bookingid: req.fields.bookingid,
        mobile: req.fields.mobile
    };
    if (req.files.filetoupload && req.files.filetoupload.size > 0) {
        const data = await fsPromises.readFile(req.files.filetoupload.path);
        newDoc.photo = Buffer.from(data).toString('base64');
    }
	await insertDocument(db, newDoc);
    res.redirect('/');
}
const handle_Find = async (req, res, criteria) => {
	await client.connect();
    console.log("Connected successfully to server");
	const db = client.db(dbName);
	const docs = await findDocument(db);
    res.status(200).render('list',{nBookings: docs.length, bookings: docs, user: req.user});
}
const handle_Details = async (req, res, criteria) => {
	await client.connect();
	console.log("Connected successfully to server");
    const db = client.db(dbName);
    let DOCID = { _id: ObjectId.createFromHexString(criteria._id) };
    const docs = await findDocument(db, DOCID);
    res.status(200).render('details', { booking: docs[0], user: req.user});
}
const handle_Edit = async (req, res, criteria) => {
	await client.connect();
	console.log("Connected successfully to server");
    const db = client.db(dbName);
    let DOCID = { '_id': ObjectId.createFromHexString(criteria._id) };
    let docs = await findDocument(db, DOCID);
    if (docs.length > 0 && docs[0].userid == req.user.id) {
        res.status(200).render('edit', { booking: docs[0], user: req.user});
    } else {
        res.status(500).render('info', { message: 'Unable to edit - you are not booking owner!', user: req.user});
    }
}
const handle_Update = async (req, res, criteria) => {
		await client.connect();
		console.log("Connected successfully to server");
        const db = client.db(dbName);
        const DOCID = {
            _id: ObjectId.createFromHexString(req.fields._id)
        }
        let updateData = {
            bookingid: req.fields.bookingid,
            mobile: req.fields.mobile,
        };
        if (req.files.filetoupload && req.files.filetoupload.size > 0) {
            const data = await fsPromises.readFile(req.files.filetoupload.path);
            updateData.photo = Buffer.from(data).toString('base64');
        }
        const results = await updateDocument(db, DOCID, updateData);
		res.status(200).end(`Updated ${results.modifiedCount} document(s)`);
}
const handle_Delete = async (req, res) => {
	await client.connect();
	console.log("Connected successfully to server");
    const db = client.db(dbName);
    let DOCID = { '_id': ObjectId.createFromHexString(req.query._id) };
    let docs = await findDocument(db, DOCID);
    if (docs.length > 0 && docs[0].userid == req.user.id) {   // user object by Passport.js
		await deleteDocument(db, DOCID);
        res.status(200).render('info', { message: `Booking ID ${docs[0].bookingid} removed.`, user: req.user});
    } else {
        res.status(500).render('info', { message: 'Unable to delete - you are not booking owner!', user: req.user});
    }
}
/*End of CRUD handler functions*/
app.use(formidable());

app.get('/', isLoggedIn, (req,res) => {
    res.redirect('/content');
})

app.get("/content", isLoggedIn, function (req, res) {
    //res.render('list', {user: req.user});//Task 1-template
	handle_Find(req, res, req.query.docs);//Task 2-Provide the UI `list.ejs`
});

app.get('/create', isLoggedIn, (req,res) => {
    res.status(200).render('create',{user:req.user});//Provide the UI `create.ejs`
})
app.post('/create', isLoggedIn, (req, res) => {
    handle_Create(req, res);//Redirect to the home page
});

app.get('/details',isLoggedIn, (req,res) => {
    handle_Details(req, res, req.query);//Provide the UI `details.ejs`
})

app.get('/edit', isLoggedIn, (req,res) => {
    handle_Edit(req, res, req.query);//Provide the UI `edit.ejs` or prvide the UI `info.ejs` if failed the editing
})

app.post('/update', isLoggedIn, (req,res) => {
    handle_Update(req, res, req.query);//Provide the UI `info.ejs`
})

app.get('/delete', isLoggedIn, (req,res) => {
    handle_Delete(req, res);//Provide the UI `info.ejs`
});

app.get("/logout", function(req, res) {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

app.get('/*', (req,res) => {
    res.status(404).render('info', {message: `${req.path} - Unknown request!` });
})

const port = process.env.PORT || 8099;
app.listen(port, () => {console.log(`Listening at http://localhost:${port}`);});
