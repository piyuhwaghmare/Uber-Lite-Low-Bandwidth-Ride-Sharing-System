import React, { useState, useEffect } from 'react';
import axios from 'axios';

const GridMap = () => {
    const [step, setStep] = useState(1);
    const [dimensions, setDimensions] = useState({ rows: 15, cols: 20 });
    
    // Map State
    const [nodes, setNodes] = useState([]); 
    const [roads, setRoads] = useState([]); 
    const [autos, setAutos] = useState([]); 
    
    // Form State
    const [pathForm, setPathForm] = useState({ x1: '', y1: '', x2: '', y2: '', traffic: 1.0 });
    const [autoForm, setAutoForm] = useState({ x: '', y: '', driver: '' });
    
    // RIDER State
    const [tripData, setTripData] = useState({ source: '', destination: '' });

    // UI State
    const [toast, setToast] = useState('');

    //UI Simulation
    const [pickupId, setPickupId] = useState('');
    const [dropoffId, setDropoffId] = useState('');
    const [ridePath, setRidePath] = useState([]);
    const [rideEta, setRideEta] = useState(null);
    const [simulationPosition, setSimulationPosition] = useState(null);

    const [assignedAutoId, setAssignedAutoId] = useState(null);

    const TILE_SIZE = 40; 
    const safeRows = parseInt(dimensions.rows) || 15;
    const safeCols = parseInt(dimensions.cols) || 20;
    const gridWidth = safeCols * TILE_SIZE;
    const gridHeight = safeRows * TILE_SIZE;

    const showToast = (message) => {
        setToast(message);
        setTimeout(() => setToast(''), 3000);
    };

    const calculateDist = (x1, y1, x2, y2) => {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)).toFixed(2);
    };

    useEffect(() => {
        const fetchExistingMap = async () => {
            try {
                // Getting Entire map
                const response = await axios.get('http://localhost:5000/api/map');

                const { nodes: dbNodes, roads: dbRoads, autos: dbAutos } = response.data;

                if (dbNodes.length > 0 || dbRoads.length > 0 || dbAutos.length > 0) {
                    
                    const formattedNodes = dbNodes.map(n => ({
                        id: n.nodeId,
                        x: n.x,
                        y: n.y
                    }));
                    
                    const formattedRoads = dbRoads.map(r => {
                        const fromNode = formattedNodes.find(n => n.id === r.fromNode);
                        const toNode = formattedNodes.find(n => n.id === r.toNode);
                        
                        return {
                            x1: fromNode ? fromNode.x : 0,
                            y1: fromNode ? fromNode.y : 0,
                            x2: toNode ? toNode.x : 0,
                            y2: toNode ? toNode.y : 0,
                            traffic: r.trafficMultiplier || 1.0
                        };
                    });
                    // Restoring it
                    setNodes(formattedNodes);
                    setRoads(formattedRoads);
                    setAutos(dbAutos); 
                    
                    if (dbAutos.length > 0) setStep(4);
                    else if (dbRoads.length > 0) setStep(3);
                    else if (dbNodes.length > 0) setStep(2);
                } else {
                    console.log("Database is empty. Waiting for user to draw.");
                }
            } catch (error) {
                console.error("FETCH ERROR:", error.message);
            }
        };

        fetchExistingMap();
    }, []); // UseEffect to render after every reload once

    const handleCreatePath = async () => {
        const x1 = parseInt(pathForm.x1); 
        const y1 = parseInt(pathForm.y1);
        const x2 = parseInt(pathForm.x2);
        const y2 = parseInt(pathForm.y2);
        const traffic = parseFloat(pathForm.traffic);

        if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) return alert("Please enter valid coordinates");

        const nodeId1 = `n_${x1}_${y1}`;
        const nodeId2 = `n_${x2}_${y2}`;

        // Update UI instantly
        setNodes(prev => {
            const updated = [...prev];
            if (!updated.some(n => n.id === nodeId1)) updated.push({ id: nodeId1, x: x1, y: y1 });
            if (!updated.some(n => n.id === nodeId2)) updated.push({ id: nodeId2, x: x2, y: y2 });
            return updated;
        });

        setRoads(prev => [...prev, { x1, y1, x2, y2, traffic }]);

        // Send to Backend
        try {
            const dist = calculateDist(x1, y1, x2, y2);
            await Promise.allSettled([
                axios.post('http://localhost:5000/api/nodes', { nodeId: nodeId1, x: x1, y: y1, name: `Pt ${x1},${y1}` }),
                axios.post('http://localhost:5000/api/nodes', { nodeId: nodeId2, x: x2, y: y2, name: `Pt ${x2},${y2}` })
            ]);
            await axios.post('http://localhost:5000/api/roads', {
                fromNode: nodeId1, toNode: nodeId2, distance: Number(dist), trafficMultiplier: traffic
            });
            showToast("Road successfully added to map!");
        } catch (err) { console.log("Backend sync issue", err.message); }
        
        setPathForm({ x1: '', y1: '', x2: '', y2: '', traffic: 1.0 });
    };

    const handleAddAuto = async () => {
        const x = parseInt(autoForm.x);
        const y = parseInt(autoForm.y);
        
        if (isNaN(x) || isNaN(y) || !autoForm.driver) return alert("Invalid Auto Details");

        const newAuto = { autoId: `auto_${Date.now()}`, driverName: autoForm.driver, currentX: x, currentY: y };
        setAutos(prev => [...prev, newAuto]); 
        
        try {
            await axios.post('http://localhost:5000/api/autos', newAuto);
            showToast(`Auto deployed at Row ${x}, Col ${y}!`);
        } catch (err) { console.error(err); }
        
        setAutoForm({ x: '', y: '', driver: '' });
    };

    const handleResetMap = async () => {
        const confirmDelete = window.confirm("Are you sure you want to delete all map data? This cannot be undone.");
        if (!confirmDelete) return;

        try {
            await axios.delete('http://localhost:5000/api/reset');
            
            setNodes([]);
            setRoads([]);
            setAutos([]);
            setStep(1); 
            showToast("🧹 Map and Database successfully cleared!");
            
        } catch (err) {
            console.error("Failed to reset database", err);
            alert("Error clearing database.");
        }
    };

    // Handling Animation here
    const simulateRide = (startPos, pathNodes) => {
        if (!pathNodes || pathNodes.length === 0) return;

        const fullPath = [startPos, ...pathNodes];
        setSimulationPosition(startPos);

        let currentPathIndex = 0;
        let currentX = startPos.x;
        let currentY = startPos.y;

        const speed = 0.05;
        const frameRateMs = 30;

        const timer = setInterval(() => {
           
            if (currentPathIndex >= fullPath.length - 1) {
                clearInterval(timer);
                showToast("🎉 You have arrived at your destination!");
                return;
            }

            const targetNode = fullPath[currentPathIndex + 1];
            
            const dx = targetNode.x - currentX;
            const dy = targetNode.y - currentY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < speed) {
                
                currentX = targetNode.x;
                currentY = targetNode.y;
                currentPathIndex++;
            } else {
               
                currentX += (dx / distance) * speed;
                currentY += (dy / distance) * speed;
            }

            setSimulationPosition({ x: currentX, y: currentY });
        }, frameRateMs);
    };

    // Getting Ride Request
    const handleRequestRide = async () => {
        if (!pickupId || !dropoffId) return alert("Please select a Pickup and Dropoff location!");
        if (autos.length === 0) return alert("There are no autos on the map!");

        // 1. Find the exact coordinates of the selected pickup node
        const pickupNode = nodes.find(n => n.id === pickupId);
        
        // 2. DISPATCHER: Find the closest auto to the pickup location
        let closestAuto = null;
        let minDistance = Infinity;

        autos.forEach(auto => {
            // Using Manhattan distance (Grid distance)
            const dist = Math.abs(auto.currentX - pickupNode.x) + Math.abs(auto.currentY - pickupNode.y);
            if (dist < minDistance) {
                minDistance = dist;
                closestAuto = auto;
            }
        });

        // 3. Save the chosen auto so we know which one to animate.
        setAssignedAutoId(closestAuto.autoId);

        try {
            // 4. Send the dynamically chosen closest auto to the backend
            const response = await axios.post('http://localhost:5000/api/request-ride', {
                autoId: closestAuto.autoId, 
                pickupNodeId: pickupId,
                dropoffNodeId: dropoffId
            });

            const { combinedPath, eta, autoStartLocation } = response.data;
            
            setRidePath(combinedPath);
            setRideEta(eta);
            
            simulateRide(autoStartLocation, combinedPath);
            
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.error || "Failed to calculate path.");
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'row', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#0f172a' }}>
            <style>
                {`
                    .btn-hover { transition: all 0.2s ease-in-out; }
                    .btn-hover:hover { transform: translateY(-2px); filter: brightness(1.1); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
                    .btn-hover:active { transform: translateY(0); }
                `}
            </style>

            <div style={{
                position: 'fixed', top: toast ? '20px' : '-100px', left: '50%', transform: 'translateX(-50%)',
                backgroundColor: '#10b981', color: 'white', padding: '12px 24px', borderRadius: '8px',
                fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', transition: 'top 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', zIndex: 1000
            }}>
                {toast}
            </div>
            
            <div style={{ width: '80%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: '20px' }}>
                <div style={{ 
                    position: 'relative', backgroundColor: '#1e293b', border: '2px solid #334155',
                    width: `${gridWidth}px`, height: `${gridHeight}px`, display: 'grid',
                    gridTemplateColumns: `repeat(${safeCols}, ${TILE_SIZE}px)`, gridTemplateRows: `repeat(${safeRows}, ${TILE_SIZE}px)`
                }}>
                    
                    {Array.from({ length: safeRows * safeCols }).map((_, i) => {
                        const row = Math.floor(i / safeCols);
                        const col = i % safeCols;
                        return (
                            <div key={i} style={{ border: '1px solid #334155' }}>
                            
                                <span style={{ fontSize: '8px', color: '#475569', padding: '2px' }}>{row},{col}</span>
                            </div>
                        );
                    })}

                <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
    
                    {roads.map((road, i) => (
                        <line key={i}
                            x1={road.y1 * TILE_SIZE + TILE_SIZE/2} y1={road.x1 * TILE_SIZE + TILE_SIZE/2}
                            x2={road.y2 * TILE_SIZE + TILE_SIZE/2} y2={road.x2 * TILE_SIZE + TILE_SIZE/2}
                            stroke={road.traffic < 0.5 ? "#ef4444" : road.traffic < 0.8 ? "#efcc00" : "#3b82f6"} 
                            strokeWidth="6" strokeDasharray={road.traffic < 0.5 ? "10,10" : "0"}
                        />
                    ))}
    
                    {ridePath.length > 1 && ridePath.map((node, index) => {
                        if (index === ridePath.length - 1) return null;
                        const nextNode = ridePath[index + 1];
                        return (
                            <line
                                key={`path-${index}`}
                                // Swap x and y to match Row/Col mapping, and center it
                                x1={node.y * TILE_SIZE + TILE_SIZE/2} 
                                y1={node.x * TILE_SIZE + TILE_SIZE/2}
                                x2={nextNode.y * TILE_SIZE + TILE_SIZE/2}
                                y2={nextNode.x * TILE_SIZE + TILE_SIZE/2}
                                stroke="#3b82f6"
                                strokeWidth="6"
                                strokeLinecap="round"
                                opacity="0.6"
                            />
                        );
                    })}
                </svg>

                    {nodes.map((node, i) => {
                        let dotColor = '#ffffff'; 
                        let borderColor = '#0284c7'; 
                        let size = '16px';

                        if (step === 4) {
                          if (pickupId === node.id) { dotColor = '#22c55e'; borderColor = '#166534'; size = '24px'; } 
                          if (dropoffId === node.id) { dotColor = '#ef4444'; borderColor = '#991b1b'; size = '24px'; } 
                        }

                        return (
                            <div key={`node-${i}`} title={`Row ${node.x}, Col ${node.y}`}
                                style={{
                                    position: 'absolute', 
                                    left: node.y * TILE_SIZE + TILE_SIZE/2,
                                    top: node.x * TILE_SIZE + TILE_SIZE/2,
                                    transform: 'translate(-50%, -50%)', zIndex: 20, backgroundColor: dotColor, width: size, height: size,
                                    borderRadius: '50%', border: `4px solid ${borderColor}`, transition: '0.3s'
                                }}
                            />
                        );
                    })}

                    {autos.map((auto, i) => {
                     // UPDATED: Only animate the auto that was assigned to this ride.
                     const isMoving = simulationPosition && auto.autoId === assignedAutoId;
                     
                     const renderX = isMoving ? simulationPosition.x : auto.currentX;
                     const renderY = isMoving ? simulationPosition.y : auto.currentY;
                 
                     return (
                         <div key={`auto-${i}`}
                             style={{
                                 position: 'absolute', 
                                 left: renderY * TILE_SIZE + TILE_SIZE/2, 
                                 top: renderX * TILE_SIZE + TILE_SIZE/2,  
                                 transform: 'translate(-50%, -50%)', 
                                 zIndex: 30, 
                                 backgroundColor: '#facc15', 
                                 padding: '4px 8px',
                                 borderRadius: '4px', 
                                 fontSize: '12px', 
                                 fontWeight: 'bold', 
                                 color: '#000', 
                                 border: '2px solid #ca8a04',
                                 boxShadow: isMoving ? '0 0 15px #facc15' : 'none' 
                             }}>
                             🛺 {auto.driverName}
                         </div>
                     );
                 })}
                </div>
            </div>

            <div style={{ width: '20%', height: '100%', backgroundColor: '#ffffff', padding: '24px', display: 'flex', flexDirection: 'column', overflowY: 'auto', borderLeft: '1px solid #e2e8f0', fontFamily: 'sans-serif' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px', color: step === 4 ? '#22c55e' : '#0f172a' }}>
                    {step === 4 ? 'Uber Rider App' : 'Map Builder'}
                </h2>

                {step === 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h3 style={{ fontSize: '14px', color: '#64748b', textTransform: 'uppercase' }}>1. Set Canvas</h3>
                        <input type="number" placeholder="Rows" value={dimensions.rows} onChange={e => setDimensions({...dimensions, rows: e.target.value})} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                        <input type="number" placeholder="Cols" value={dimensions.cols} onChange={e => setDimensions({...dimensions, cols: e.target.value})} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                        <button onClick={() => setStep(2)} className="btn-hover" style={{ padding: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Next: Build Roads</button>
                    </div>
                )}

                {step === 2 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h3 style={{ fontSize: '14px', color: '#64748b', textTransform: 'uppercase' }}>2. Connect Points</h3>
                        <p style={{ fontSize: '11px', color: '#94a3b8' }}>Input coordinates as (Row, Column)</p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input type="number" placeholder="Row 1" value={pathForm.x1} onChange={e => setPathForm({...pathForm, x1: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                            <input type="number" placeholder="Col 1" value={pathForm.y1} onChange={e => setPathForm({...pathForm, y1: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input type="number" placeholder="Row 2" value={pathForm.x2} onChange={e => setPathForm({...pathForm, x2: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                            <input type="number" placeholder="Col 2" value={pathForm.y2} onChange={e => setPathForm({...pathForm, y2: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                        </div>
                        <select value={pathForm.traffic} onChange={e => setPathForm({...pathForm, traffic: e.target.value})} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                            <option value="1.0">Smooth Traffic (1.0)</option>
                            <option value="0.5">Moderate (0.5)</option>
                            <option value="0.1">Heavy Jam (0.1)</option>
                        </select>
                        <button onClick={handleCreatePath} className="btn-hover" style={{ padding: '12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Draw Road</button>
                        <button onClick={() => setStep(3)} className="btn-hover" style={{ padding: '12px', backgroundColor: 'transparent', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', marginTop: '10px' }}>Next: Place Autos</button>
                    </div>
                )}

                {step === 3 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h3 style={{ fontSize: '14px', color: '#64748b', textTransform: 'uppercase' }}>3. Place Auto</h3>
                        <input type="text" placeholder="Driver Name" value={autoForm.driver} onChange={e => setAutoForm({...autoForm, driver: e.target.value})} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input type="number" placeholder="Row" value={autoForm.x} onChange={e => setAutoForm({...autoForm, x: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                            <input type="number" placeholder="Col" value={autoForm.y} onChange={e => setAutoForm({...autoForm, y: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                        </div>
                        <button onClick={handleAddAuto} className="btn-hover" style={{ padding: '12px', backgroundColor: '#eab308', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Deploy Auto</button>
                        <button onClick={() => setStep(4)} className="btn-hover" style={{ padding: '16px', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', marginTop: '24px', fontWeight: 'bold' }}>✅ FINISH MAP & START</button>
                    </div>
                )}

                {/* --- STEP 4: RIDER APP --- */}
{step === 4 && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.5s' }}>
        <div style={{ padding: '12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
            <p style={{ fontSize: '12px', color: '#166534', margin: 0 }}>Map is Live! Request your ride below.</p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>Pickup Location (Source)</label>
            {/* UPDATED: Hooked to pickupId */}
            <select value={pickupId} onChange={e => setPickupId(e.target.value)} style={{ padding: '10px', border: '2px solid #22c55e', borderRadius: '6px', outline: 'none' }}>
                <option value="">Select Pickup Point...</option>
                {nodes.map((n, i) => <option key={i} value={n.id}>Point ({n.x}, {n.y})</option>)}
            </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>Dropoff Location (Destination)</label>
            {/* UPDATED: Hooked to dropoffId */}
            <select value={dropoffId} onChange={e => setDropoffId(e.target.value)} style={{ padding: '10px', border: '2px solid #ef4444', borderRadius: '6px', outline: 'none' }}>
                <option value="">Select Drop Point...</option>
                {nodes.map((n, i) => <option key={i} value={n.id}>Point ({n.x}, {n.y})</option>)}
            </select>
        </div>

        {/* UPDATED: Hooked to handleRequestRide */}
        <button onClick={handleRequestRide} className="btn-hover" style={{ padding: '16px', backgroundColor: '#000000', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: '12px', fontWeight: 'bold', fontSize: '16px' }}>
            Request Ride
        </button>

        {/* NEW: Display the ETA when it's calculated! */}
        {rideEta && (
             <div style={{ padding: '12px', backgroundColor: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '8px', textAlign: 'center' }}>
                 <p style={{ fontSize: '14px', color: '#0369a1', margin: 0 }}>
                     <strong>Estimated Route Time:</strong> {rideEta.toFixed(1)} mins
                 </p>
             </div>
        )}
    </div>
)}
                <button 
    onClick={handleResetMap} 
    className="btn-hover" 
    style={{ 
        padding: '12px', 
        backgroundColor: '#ef4444',
        color: 'white', 
        border: 'none', 
        borderRadius: '6px', 
        cursor: 'pointer', 
        marginTop: 'auto',
        fontWeight: 'bold' 
    }}>
    🗑️ Delete Map & Reset Database
</button>
            </div>
        </div>
    );
};

export default GridMap;