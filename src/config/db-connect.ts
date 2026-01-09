import mongoose from "mongoose";


async function dbConnect():Promise<void> {
    try {
      const mongoUri = process.env.MONGO_URI;
      await mongoose.connect(mongoUri!);
      console.log("Connected to db successfully 🎉.")
    } catch (err) {
       console.log("Error while connecting to db::",err);
       process.exit(1)
    } 
}

export default dbConnect