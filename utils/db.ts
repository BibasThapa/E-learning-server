import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const dbUrl: string = process.env.DB_URL || '';

const connectDB = async () => {
    try {
        const connection = await mongoose.connect(dbUrl);
        console.log(`Database connected with host: ${connection.connection.host}`);
    } catch (error:any) {
        console.log(error.message);
        setTimeout(connectDB, 500);  
    }
};

export default connectDB;
