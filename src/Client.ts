import { Api } from './Api';

import { IVehicle } from './IVehicle';
import { ClientOptions } from './ClientOptions';
import { IChargingStatus } from './IChargingStatus';
import { ClimateControlStatus } from './ClimateControlStatus';
import { ChargingStatus } from './ChargingStatus';
import { IOperationResult } from './IOperationResult';

import * as moment from 'moment';

export class Client {
    private static RESULT_POLLING_INTERVAL = 20000;

    private _customSessionId: string;
    private _dcmId: string;
    private _gdcUserId: string;
    private _locale: string;
    private _regionCode: string;
    private _timeZone: string;
    private _baseEndpoint: string;
    private _api: Api;

    constructor(options?: ClientOptions) {
        if (typeof options === 'undefined') {
            options = {};
        }
        this._regionCode = options.regionCode || 'NNA'; // Default to North America
        this._locale = options.locale || 'en-US';       // Default to English (US)
        this._baseEndpoint = options.baseEndpoint;      // Default to undefined

        this._api = new Api();
    }

    private sleep = (m: number) => new Promise(r => setTimeout(r, m));

    public async login(userId: string, password: string): Promise<IVehicle> {
        const connectResponse = await this._api.InitialApp(
            this._regionCode,
            this._locale,
            this._baseEndpoint);
        {
            const passwordEncryptionKey = connectResponse.baseprm;

            if (!passwordEncryptionKey) {
                console.log(connectResponse);
                throw new Error('Response did not include password encryption key.');
            }

            const loginResponse = await this._api.UserLoginRequest(
                this._regionCode,
                this._locale,
                userId,
                password,
                passwordEncryptionKey,
                this._baseEndpoint);

            this._customSessionId = Client.extractCustomSessionIdFromLoginResponse(loginResponse, this._regionCode);

            const customerInfo = Client.extractCustomerInfo(loginResponse);

            if (typeof customerInfo === 'undefined') {
                throw new Error('Login failed');
            }

            this._timeZone = customerInfo.timeZone;

            const vehicleInfo = Client.extractVehicleInfo(loginResponse);

            this._dcmId = vehicleInfo.dcmId;
            this._gdcUserId = vehicleInfo.gdcUserId;

            return {
                vin: vehicleInfo.vin
            };
        }
    }

    public async getCurrentChargingStatus(vin: string): Promise<IOperationResult<IChargingStatus>> {
        const requestStatusResponse = await this._api.BatteryStatusCheckRequest(
            this._regionCode,
            this._locale,
            this._customSessionId,
            this._dcmId,
            this._gdcUserId,
            vin,
            this._timeZone,
            this._baseEndpoint);

        const resultKey = requestStatusResponse.resultKey;

        if (!resultKey) {
            throw new Error('Response did not include response key.');
        }

        const that = this;
        return {
            waitForResult: async function () {
                while (true) {
                    const requestStatusResultResponse = await that._api.BatteryStatusCheckResultRequest(
                        that._regionCode,
                        that._locale,
                        that._customSessionId,
                        that._dcmId,
                        vin,
                        that._timeZone,
                        resultKey,
                        that._baseEndpoint);
                    const responseFlag = requestStatusResultResponse.responseFlag;

                    if (!responseFlag) {
                        throw new Error('Response did not include response flag.');
                    }

                    const batteryLevel = parseInt(requestStatusResultResponse.batteryDegradation, 10);
                    const batteryCapacity = parseInt(requestStatusResultResponse.batteryCapacity, 10);
                    const percentageCharged = Math.round(batteryLevel * 100 / batteryCapacity);

                    if (responseFlag !== '0') {
                        return {
                            chargingStatus: requestStatusResultResponse.charging === 'NO' ? ChargingStatus.off : ChargingStatus.on,
                            percentageCharged: percentageCharged,
                            timestamp: new Date()
                        };
                    }

                    that.sleep(Client.RESULT_POLLING_INTERVAL);
                }
            }
        };
    }

    public async startCharging(vin: string): Promise<void> {
        return await this._api.BatteryRemoteChargingRequest(
            this._regionCode,
            this._locale,
            this._customSessionId,
            this._dcmId,
            this._gdcUserId,
            vin,
            this._timeZone,
            this._baseEndpoint);
    }

    public async getCachedChargingStatus(vin: string): Promise<IChargingStatus> {
        const response = await this._api.BatteryStatusRecordsRequest(
            this._regionCode,
            this._locale,
            this._customSessionId,
            this._dcmId,
            this._gdcUserId,
            vin,
            this._timeZone,
            this._baseEndpoint);

        let timestamp = moment(response.BatteryStatusRecords.NotificationDateAndTime, 'YYYY/MM/DD hh:mm', false).toDate();
        let percentageCharged = 0;
        if (response.BatteryStatusRecords.BatteryStatus.SOC !== undefined) {
            percentageCharged = parseInt(response.BatteryStatusRecords.BatteryStatus.SOC.Value, 10);
        } else {
            const chargeInNissanBars = response.BatteryStatusRecords.BatteryStatus.BatteryRemainingAmount;
            const totalNissanBars = response.BatteryStatusRecords.BatteryStatus.BatteryCapacity;
            console.warn('Using aged battery charge calculation');
            percentageCharged = Math.floor(100 * chargeInNissanBars / totalNissanBars);
        }

        return {
            percentageCharged: percentageCharged,
            chargingStatus: response.BatteryStatusRecords.BatteryStatus.BatteryChargingStatus === 'NOT_CHARGING' ? ChargingStatus.off : ChargingStatus.on,
            timestamp: timestamp
        };
    }

    public async getCachedRemoteClimateControlStatus(vin: string): Promise<ClimateControlStatus> {
        const response = await this._api.RemoteACRecordsRequest(
            this._regionCode,
            this._locale,
            this._customSessionId,
            this._dcmId,
            this._gdcUserId,
            vin,
            this._timeZone,
            this._baseEndpoint);

        if (response.RemoteACRecords.RemoteACOperation === 'START') {
            return ClimateControlStatus.on;
        }
        return ClimateControlStatus.off;
    }

    public async startRemoteClimateControl(vin: string): Promise<IOperationResult<void>> {
        const requestClimateControlTurnOnResponse = await this._api.ACRemoteRequest(
            this._regionCode,
            this._locale,
            this._customSessionId,
            this._dcmId,
            this._gdcUserId,
            vin,
            this._timeZone,
            this._baseEndpoint);

        const resultKey = requestClimateControlTurnOnResponse.resultKey;
        if (!resultKey) {
            throw new Error('Response did not include response key.');
        }

        const that = this;
        return {
            waitForResult: async function () {
                while (true) {
                    const requestClimateControlTurnOnResultResponse = await that._api.ACRemoteResult(
                        that._regionCode,
                        that._locale,
                        that._customSessionId,
                        that._dcmId,
                        vin,
                        that._timeZone,
                        resultKey,
                        that._baseEndpoint);

                    const responseFlag = requestClimateControlTurnOnResultResponse.responseFlag;

                    if (!responseFlag) {
                        throw new Error('Response did not include response flag.');
                    }

                    if (responseFlag !== '0') {
                        if (requestClimateControlTurnOnResponse.hvacStatus === '0') {
                            throw new Error('Battery too low to start climate control');
                        }
                        return;
                    }
                    that.sleep(Client.RESULT_POLLING_INTERVAL);
                }
            }
        };
    }

    public async stopRemoteClimateControl(vin: string): Promise<IOperationResult<void>> {
        const requestClimateControlTurnOffResponse = await this._api.ACRemoteOffRequest(
            this._regionCode,
            this._locale,
            this._customSessionId,
            this._dcmId,
            this._gdcUserId,
            vin,
            this._timeZone,
            this._baseEndpoint);
        const resultKey = requestClimateControlTurnOffResponse.resultKey;

        if (!resultKey) {
            throw new Error('Response did not include response key.');
        }
        const that = this;
        return {
            waitForResult: async function () {
                while (true) {
                    const requestClimateControlTurnOnResultResponse = await that._api.ACRemoteOffResult(
                        that._regionCode,
                        that._locale,
                        that._customSessionId,
                        that._dcmId,
                        vin,
                        that._timeZone,
                        resultKey,
                        that._baseEndpoint);

                    const responseFlag = requestClimateControlTurnOnResultResponse.responseFlag;

                    if (!responseFlag) {
                        throw new Error('Response did not include response flag.');
                    }

                    if (responseFlag !== '0') {
                        return requestClimateControlTurnOnResultResponse;
                    }
                    that.sleep(Client.RESULT_POLLING_INTERVAL);
                }
            }
        };
    }

    private static extractCustomSessionIdFromLoginResponse(response, regionCode): string {
        let vehicleInfo;
        if (response.hasOwnProperty('VehicleInfoList')) {
            const vehicleInfoList = response.VehicleInfoList;
            if (!vehicleInfoList) {
                console.warn('Response did not include a vehicle information list.');
                return;
            }

            vehicleInfo = vehicleInfoList.vehicleInfo;
        } else {
            vehicleInfo = response.vehicleInfo;
        }

        if (!vehicleInfo) {
            console.warn('Response did not include vehicle information.');
            return;
        }

        if (!(vehicleInfo instanceof Array)) {
            console.warn('Vehicle information property is not an array.');
            return;
        }

        if (vehicleInfo.length === 0) {
            console.warn('Response did not include a vehicle.');
            return;
        }

        if (vehicleInfo.length > 1) {
            console.warn('Response included more than one vehicle.');
        }

        const vehicle = vehicleInfo[0];

        const customSessionId = vehicle.custom_sessionid;

        if (!customSessionId) {
            console.warn('Response did not include a custom session ID.');
        }

        return customSessionId;
    }

    private static extractCustomerInfo(response): {
        timeZone: string
    } {
        const customerInfo = response.CustomerInfo;

        if (!customerInfo) {
            console.warn('Response did not include a customer info object.');

            return;
        }

        const timeZone = customerInfo.Timezone;

        if (!timeZone) {
            console.warn('Response did not include a timezone.');
        }

        return {
            timeZone: timeZone
        };
    }

    private static extractVehicleInfo(response): {
        gdcUserId: string,
        dcmId: string,
        vin: string
    } {
        const vehicle = response.vehicle;

        if (!vehicle) {
            console.warn('Response did not include a vehicle object.');

            return;
        }

        const profile = vehicle.profile;

        if (!profile) {
            console.warn('Response did not include a profile.');

            return;
        }

        const gdcUserId = profile.gdcUserId;

        if (!gdcUserId) {
            console.warn('Response did not include a GDC user ID.');
        }

        const dcmId = profile.dcmId;

        if (!dcmId) {
            console.warn('Response did not include a DCM ID.');
        }

        const vin = profile.vin;

        if (!vin) {
            console.warn('Response did not include a VIN.');
        }

        return {
            gdcUserId: gdcUserId,
            dcmId: dcmId,
            vin: vin
        };
    }
}
