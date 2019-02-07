'use strict';

const carwings = require('../release');
const secrets = require('./secrets.json');

const client = new carwings.Client({regionCode:secrets.regionCode});

(async function () {
    // Login
    const vehicle = await client.login(secrets.email, secrets.password);

    // Print the vehicle VIN
    console.log(vehicle);

    const cachedStatusResponse = await client.getCachedStatus(vehicle.vin);

    // Print the cached vehicle status
    console.log(cachedStatusResponse);
})();



