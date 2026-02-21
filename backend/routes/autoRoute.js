const { getautos, getnodes, getroads, Reset, getMapData, requestRide } =  require('../controllers/controller_nar.js');

const express = require('express')


const allRoutes = express.Router();

allRoutes.post('/nodes', getnodes);

allRoutes.post('/autos', getautos);

allRoutes.post('/roads', getroads);

allRoutes.delete('/reset', Reset);

allRoutes.get('/map', getMapData);

allRoutes.post('/request-ride', requestRide);

module.exports = allRoutes;