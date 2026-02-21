const Node = require('../models/Node.js'); 
const Road = require('../models/Road.js');
const Auto = require('../models/Auto.js');
const { runAStar } = require('../utils/astar.js');

const requestRide = async (req, res) => {
    try {
        const { autoId, pickupNodeId, dropoffNodeId } = req.body;

        const nodes = await Node.find({});
        const roads = await Road.find({});
        const auto = await Auto.findOne({ autoId });

        if (!auto) {
            return res.status(404).json({ error: "Auto not found in database." });
        }

        let closestNode = null;
        let minDistance = Infinity;
        
        nodes.forEach(n => {
            
            const dist = Math.abs(n.x - auto.currentX) + Math.abs(n.y - auto.currentY);
            if (dist < minDistance) {
                minDistance = dist;
                closestNode = n;
            }
        });

        if (!closestNode) {
            return res.status(400).json({ error: "No nodes available on the map." });
        }

        const pickupResult = runAStar(closestNode.nodeId, pickupNodeId, nodes, roads);
        if (pickupResult.error) {
            return res.status(400).json({ error: "Cannot find a valid road to the passenger." });
        }

        const dropoffResult = runAStar(pickupNodeId, dropoffNodeId, nodes, roads);
        if (dropoffResult.error) {
            return res.status(400).json({ error: "Cannot find a valid road to the destination." });
        }

        const combinedPath = [...pickupResult.path, ...dropoffResult.path.slice(1)];
        const totalEta = pickupResult.totalTime + dropoffResult.totalTime;

        res.status(200).json({
            message: "Ride calculated successfully!",
            autoStartLocation: { x: auto.currentX, y: auto.currentY },
            pickupPath: pickupResult.path,
            dropoffPath: dropoffResult.path,
            combinedPath: combinedPath,
            eta: totalEta
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const getnodes = async (req, res) => {
    try {
        const { nodeId, x, y, name } = req.body;
        
        const node = await Node.findOneAndUpdate(
            { nodeId: nodeId }, 
            { x, y, name }, 
            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );

        res.status(200).json({ message: "Node saved", node });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const getroads = async (req, res) => {
    try {
        const { fromNode, toNode, distance, trafficMultiplier } = req.body;
        
        const newRoad = new Road({ fromNode, toNode, distance, trafficMultiplier });
        await newRoad.save();
        
        res.status(201).json({ message: "Road created successfully", road: newRoad });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const getautos = async (req, res) => {
    try {
        const { autoId, driverName, currentX, currentY } = req.body;
        
        const newAuto = new Auto({ autoId, driverName, currentX, currentY });
        await newAuto.save();
        
        res.status(201).json({ message: "Auto deployed successfully", auto: newAuto });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const Reset = async (req, res) => {
    try {
        await Promise.all([
            Node.deleteMany({}),
            Road.deleteMany({}),
            Auto.deleteMany({})
        ]);
        
        res.status(200).json({ message: "Database completely wiped clean! Ready for a new map." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const getMapData = async (req, res) => {
    try {
        
        const nodes = await Node.find({});
        
        const roads = await Road.find({});
        
        const autos = await Auto.find({});
        
        res.status(200).json({ nodes, roads, autos });

    } catch (error) {
        res.status(500).json({ error : error.message });
    }
}

module.exports = { getnodes, getroads, getautos, Reset, getMapData, requestRide };