import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: {
        type: String, required: [true, 'Username is required'],
        trim: true,
        minlength: 2,
        maxlength: 50,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/\S+@\S+\.\S+/, 'Please bro fill a valid email address'],
    },
    passwordHash: {
        type: String,
        required: [true, 'User password is required'],
        minlength: 6,
        select: false,
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    }
}, {timestamps: true} );

const User = mongoose.model('User', userSchema);

export default User;
 
//{ name: 'Andrei', email: 'andreistolojan@gmail.com', passwordHash: 'hashed-password' }
