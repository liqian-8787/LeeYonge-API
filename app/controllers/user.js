const bcrypt = require('bcryptjs');
const User = require('../../model/user');
const cors = require("cors");
const Session = require('../../model/session');
const { authenticate } = require('../../middleware/authenticate');

const initSession = async (userId) => {
    const token = await Session.generateToken();
    const session = new Session({ token, userId });
    await session.save();
    return session;
};

module.exports = function (app, db) {
    app.use(cors());

    //util function to check if a string is a valid 
    const isEmail = (email) => {
        if (typeof email !== 'string') {
            return false;
        }
        const emailRegex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;

        return emailRegex.test(email);
    };

    app.post('/api/users/register', async (req, res) => {
        try {
            const { firstName, lastName, email, password } = req.body;
            const user = new User({ firstName, lastName, email, password });
            const persistedUser = await user.save();

            // we'll use the ID of the new user for our new session
            const userId = persistedUser._id;
            const session = await initSession(userId);

            res
                .cookie('token', session.token, {
                    httpOnly: true,
                    sameSite: true,
                    maxAge: 2419200000,// 4 weeks
                    secure: process.env.NODE_ENV === 'production', // will only be set to true in production
                })
                .status(201)
                .json({
                    title: 'User Registration Successful',
                    detail: 'Successfully registered new user',
                    token: session.token
                });
            console.log(firstName)
        } catch (err) {
            //error handling here
            console.log(err.message)
            res.status(400).json({
                errors: [
                    {
                        title: 'Registration Error',
                        detail: 'Something went wrong during registration process.',
                        error: err.message,
                    },
                ]
            });
        }
    });

    app.post('/api/users/login', async (req, res) => {

        try {
            const { email, password } = req.body;
            //queries database to find a user with the received email
            const user = await User.findOne({ email });
            if (!user) {
                throw new Error("Email not found");
            }

            // use the ID of the user who logged in for the session
            const userId = user._id;

            //using bcrypt to compare passwords
            const passwordValidated = await bcrypt.compare(password, user.password);
            if (!passwordValidated) {
                throw new Error("Password is invalid, please try again");
            }

            // initialize our session
            const session = await initSession(userId);

            res
                .cookie('token', session.token, {
                    httpOnly: true,
                    sameSite: true,
                    secure: process.env.NODE_ENV === 'production',
                })
                .json({
                    title: 'Login Successful',
                    detail: 'Successfully validated user credentials',
                    status: 200,
                    token: session.token
                });
        } catch (err) {
            res.status(401).json({
                errors: [
                    {
                        title: 'Invalid Credentials',
                        detail: 'Check email and password combination',
                        errorMessage: err.message,
                    },
                ],
            });
        }
    })

    app.get('/api/users/profile', authenticate, async (req, res) => {
        const { userId } = req.session;
        User.findOne({ _id: userId }).then((user) => {
            const {
                firstName,
                lastName,
                email
            } = user;

            res.json({
                userId: userId, firstName: firstName, lastName: lastName, email: email,
                isLoggedIn: true
            })
        }).catch(err => {
            res.status(401).json({
                error: err,
                isLoggedIn: false
            })
        })
    })

    app.post('/api/users/logout', authenticate, async (req, res) => {

        try {

            req.session.deleteToken(req.token, (err, user) => {
                const message = "Successfully log out";
                res
                    .status(200)
                    .json({
                        title: 'User log out Successful',
                        detail: 'Successfully log out',
                        status: 200,
                        message: message
                    });
            });
        } catch (err) {
            //error handling here
            const message = 'Something went wrong during log out process.';
            res.status(400).json({
                errors: [
                    {
                        title: 'log out Error',
                        detail: 'Something went wrong during log out process.',
                        errorMessage: fetchError(err, message),
                    },
                ],
            });
        }
    })
    // note how we now pass in the authenticate function as an argument
    // to the router.get() call
    app.get('/api/users/me', authenticate, async (req, res) => {
        try {
            // using object destructuring to grab the userId from the request session
            const { userId } = req.session;
            // only retrieve the authenticated user's email
            const user = await User.findById({ _id: userId }).then(
                () => {
                    res.json({
                        title: 'Authentication successful',
                        detail: 'Successfully authenticated user',
                        isLoggedIn: true
                    });
                }
            ).catch(err => {
                res.json({
                    isLoggedIn: false
                })
            });
        } catch (err) {
            res.status(401).json({
                errors: [
                    {
                        title: 'Unauthorized',
                        detail: 'Not authorized to access this route',
                        errorMessage: err.message,
                    },
                ],
            });
        }
    })
}