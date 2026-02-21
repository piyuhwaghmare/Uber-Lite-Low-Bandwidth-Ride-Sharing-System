const mongoose = require('mongoose');

const AutoSchema = new mongoose.Schema({

    autoId: { 
        type: String, 
        required: true, 
        unique: true 
    },
    driverName: { 
        type: String, 
        required: true 
    },
    currentX: { 
        type: Number, 
        required: true 
    },
    currentY: { 
        type: Number, 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['IDLE', 'PICKUP', 'ON_TRIP'], 
        default: 'IDLE' 
    }
});

module.exports = mongoose.model('Auto', AutoSchema, 'autos');