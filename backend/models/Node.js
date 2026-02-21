const mongoose = require('mongoose')

const NodeSchema = new mongoose.Schema({
    nodeId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        default: "Intersection"
    },
    x: {
        type: Number,
        required: true
    },
    y: {
        type: Number,
        required: true
    }
});

module.exports = mongoose.model('Node', NodeSchema, 'nodes');