'use strict';

const carwings = require('../release');
const secrets = require('./secrets.json');

const client = new carwings.Client({regionCode:secrets.regionCode});

(async function () {
    const vehicle = await client.login(secrets.email, secrets.password);
    console.log(vehicle);

    // Charging
    await client.startCharging(vehicle.vin);

    const getCachedChargingStatusResponse = await client.getCachedChargingStatus(vehicle.vin);
    console.log(getCachedChargingStatusResponse);

    const getCurrentChargingStatusResponse = await (await client.getCurrentChargingStatus(vehicle.vin))
                                                    .waitForResult();
    console.log(getCurrentChargingStatusResponse);

    // Climate Control
    const getCachedRemoteClimateControlStatusResponse = await client.getCachedRemoteClimateControlStatus(vehicle.vin);
    console.log(getCachedRemoteClimateControlStatusResponse);

    const startRemoteClimateControlResponse = await (await client.startRemoteClimateControl(vehicle.vin))
                                                    .waitForResult();
    console.log(startRemoteClimateControlResponse);

    const stopRemoteClimateControlResponse = await (await client.stopRemoteClimateControl(vehicle.vin))
                                                    .waitForResult();
    console.log(stopRemoteClimateControlResponse);
})();
