# Uber Lite - Graph-Based Ride Dispatch Engine

A full-stack (MERN) interactive ride-sharing simulation. Instead of relying on third-party mapping APIs, this project features a fully custom interactive grid map where users can construct their own environments, place autos, and simulate real-time ride dispatching using advanced graph traversal algorithms.



## Core Features & Algorithmic Implementation

* **Custom Interactive Map Creation:** Users can manually draw paths, set roadblocks, and define source/destination points on a dynamic React grid. The grid state is seamlessly preserved across page refreshes using React's `useEffect` hook to fetch/sync map states.
* **Smart Auto Dispatch:** Calculates the shortest distance between all available autos on the grid and the user's source point, instantly dispatching the nearest vehicle.
* **A* Pathfinding & Traffic Integration:** The core routing engine is powered by the **A* Algorithm** (expanding on Dijkstra's algorithm). It calculates the optimal route from the auto $\rightarrow$ source $\rightarrow$ destination. The algorithm dynamically factors in a "traffic factor" (edge weights) to find the most efficient path and calculate the Estimated Time of Arrival (ETA).
* **Persistent Graph Data:** Full MongoDB integration to handle the seamless creation, fetching, and deletion of custom maps, node coordinates, and auto placements.

## Tech Stack
* **Frontend:** React.js, Vite
* **Backend:** Node.js, Express.js
* **Database:** MongoDB (Mongoose)
* **Core Algorithms:** A* Search Algorithm, Dijkstra's Algorithm Concepts

## Local Setup Instructions
1. Clone the repository: `git clone https://github.com/yourusername/uber-lite-engine.git`
2. **Backend Setup:**
   ```bash
   cd backend
   npm install
   # Create a .env file and add your MONGO_URI
   npm start
