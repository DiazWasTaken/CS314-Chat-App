const mongoose = require("mongoose");

//define a schema for your data
const messageSchema = new mongoose.Schema(
    {
        message: {
            type: String,
            required: true,
        },
    },
    {timestamps: true}
); // 'timestamps' will automatically add 'createdAt and updatedAt' fields

//create a model based on the schema
const Message = mongoose.model("Message", messageSchema);
