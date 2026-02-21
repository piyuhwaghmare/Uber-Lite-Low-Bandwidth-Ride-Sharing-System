const heuristic = (nodeA, nodeB) => {
    return Math.abs(nodeA.x - nodeB.x) + Math.abs(nodeA.y - nodeB.y);
};

const runAStar = (startNodeId, targetNodeId, nodes, roads) => {
   
    const nodeMap = {};
    nodes.forEach(n => {
        const id = n.nodeId || n.id; 
        nodeMap[id] = n;
    });

    if (!nodeMap[startNodeId] || !nodeMap[targetNodeId]) {
        throw new Error("Start or Target node does not exist in the database.");
    }

    const graph = {};
    nodes.forEach(n => graph[n.nodeId] = []);

    roads.forEach(road => {
        
        const traffic = road.trafficMultiplier || 1.0;
        const cost = road.distance / traffic;

        if (graph[road.fromNode]) {
            graph[road.fromNode].push({ neighbor: road.toNode, cost: cost });
        }
        if (graph[road.toNode]) {
            graph[road.toNode].push({ neighbor: road.fromNode, cost: cost });
        }
    });

    let openSet = [startNodeId];
    const cameFrom = {};

    const gScore = {};
    nodes.forEach(n => gScore[n.nodeId] = Infinity);
    gScore[startNodeId] = 0;

    const fScore = {};
    nodes.forEach(n => fScore[n.nodeId] = Infinity);
    fScore[startNodeId] = heuristic(nodeMap[startNodeId], nodeMap[targetNodeId]);

    while (openSet.length > 0) {
    
        openSet.sort((a, b) => fScore[a] - fScore[b]);
        const currentId = openSet.shift();

        if (currentId === targetNodeId) {
            const path = [];
            let curr = currentId;
            while (cameFrom[curr]) {
                path.unshift(curr);
                curr = cameFrom[curr];
            }
            path.unshift(startNodeId);
            
            return {
                path: path.map(id => nodeMap[id]), 
                totalTime: gScore[targetNodeId]
            };
        }

        const neighbors = graph[currentId] || [];
        for (let edge of neighbors) {
           
            const tentative_gScore = gScore[currentId] + edge.cost;

           
            if (tentative_gScore < gScore[edge.neighbor]) {
                cameFrom[edge.neighbor] = currentId;
                gScore[edge.neighbor] = tentative_gScore;
                
                
                fScore[edge.neighbor] = tentative_gScore + heuristic(nodeMap[edge.neighbor], nodeMap[targetNodeId]);

                if (!openSet.includes(edge.neighbor)) {
                    openSet.push(edge.neighbor);
                }
            }
        }
    }

    return { path: [], totalTime: 0, error: "No path found! The road might be disconnected." };
};

module.exports = { runAStar };