const mongoose = require("mongoose") 




function connectToDB(){

    mongoose.connect(process.env.MONGO_URI)
        .then(() => {
            console.log("connected to the database")
        })
        .catch((err) => {
            console.log(err + "error conneting to db")
            process.exit(1)
        })
}

module.exports = connectToDB