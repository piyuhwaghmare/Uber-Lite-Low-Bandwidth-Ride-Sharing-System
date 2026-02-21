const mongoose = require('mongoose');

const RoadSchema = new mongoose.Schema({

    fromNode: { 
        type: String, 
        ref: 'Node', 
        required: true 
    },
    toNode: { 
        type: String, 
        ref: 'Node', 
        required: true 
    },
    distance: { 
        type: Number, 
        required: true 
    },
    speedLimit: { 
        type: Number, 
        default: 40 
    }, 
    trafficMultiplier: { 
        type: Number, 
        default: 1.0 
    }
});

module.exports = mongoose.model('Road', RoadSchema, 'roads');