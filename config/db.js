import mongoose from "mongoose";
const connect = async () => {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("DB Connected");
  } catch (error) {
    console.log("Error While Connecting To DB: " + error);
    process.exit(1);
  }
};
export default connect;
