import { Api } from './Api';
import { IVehicle } from './IVehicle';

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

    constructor(options?: { regionCode?: string, locale?: string, baseEndpoint?: string }) {
        if (typeof options === 'undefined') {
            options = {};
        }
        this._regionCode = options.regionCode || 'NNA'; // Default to North America
        this._locale = options.locale || 'en-US';       // Default to English (US)
        this._baseEndpoint = options.baseEndpoint;      // Default to undefined

        this._api = new Api();
    }

    private sleep = m => new Promise(r => setTimeout(r, m));

    public async login(userId: string, password: string): Promise<IVehicle> {
        const connectResponse = await this._api.connectAsync(
            this._regionCode,
            this._locale,
            this._baseEndpoint);
        {
            const passwordEncryptionKey = connectResponse.baseprm;

            if (!passwordEncryptionKey) {
                console.log(connectResponse);
                throw new Error('Response did not include password encryption key.');
            }

            const loginResponse = await this._api.loginAsync(
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

    public async requestStatus(vin: string) {
        const requestStatusResponse = await this._api.requestStatusAsync(
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

        while (true) {
            const requestStatusResultResponse = await this._api.requestStatusResultAsync(
                this._regionCode,
                this._locale,
                this._customSessionId,
                this._dcmId,
                vin,
                this._timeZone,
                resultKey,
                this._baseEndpoint);
            const responseFlag = requestStatusResultResponse.responseFlag;

            if (!responseFlag) {
                throw new Error('Response did not include response flag.');
            }

            if (responseFlag !== '0') {
                return requestStatusResultResponse;
            }

            this.sleep(Client.RESULT_POLLING_INTERVAL);
        }
    }

    public async getCachedStatus(vin: string) {
        return await this._api.requestCachedStatusAsync(
            this._regionCode,
            this._locale,
            this._customSessionId,
            this._dcmId,
            this._gdcUserId,
            vin,
            this._timeZone,
            this._baseEndpoint);
    }

    public async getClimateControlStatus(vin: string) {
        return await this._api.requestClimateControlStatusAsync(
            this._regionCode,
            this._locale,
            this._customSessionId,
            this._dcmId,
            this._gdcUserId,
            vin,
            this._timeZone,
            this._baseEndpoint);
    }

    public async requestClimateControlTurnOn(vin: string) {
        const requestClimateControlTurnOnResponse = await this._api.requestClimateControlTurnOnAsync(
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
        while (true) {
            const requestClimateControlTurnOnResultResponse = await this._api.requestClimateControlTurnOnResultAsync(
                this._regionCode,
                this._locale,
                this._customSessionId,
                this._dcmId,
                vin,
                this._timeZone,
                resultKey,
                this._baseEndpoint);

            const responseFlag = requestClimateControlTurnOnResultResponse.responseFlag;

            if (!responseFlag) {
                throw new Error('Response did not include response flag.');
            }

            if (responseFlag !== '0') {
                return requestClimateControlTurnOnResultResponse;
            }
            this.sleep(Client.RESULT_POLLING_INTERVAL);
        }
    }

    public async requestClimateControlTurnOff(vin: string) {
        const requestClimateControlTurnOffResponse = await this._api.requestClimateControlTurnOffAsync(
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
        while (true) {
            const requestClimateControlTurnOffResultResponse = await this._api.requestClimateControlTurnOffResultAsync(
                this._regionCode,
                this._locale,
                this._customSessionId,
                this._dcmId,
                vin,
                this._timeZone,
                resultKey,
                this._baseEndpoint);

            const responseFlag = requestClimateControlTurnOffResultResponse.responseFlag;

            if (!responseFlag) {
                return new Error('Response did not include response flag.');
            }

            if (responseFlag !== '0') {
                return requestClimateControlTurnOffResultResponse;
            }
            this.sleep(Client.RESULT_POLLING_INTERVAL);
        }
    }

    public async requestChargingStart(vin: string) {
        return await this._api.requestChargingStartAsync(
            this._regionCode,
            this._locale,
            this._customSessionId,
            this._dcmId,
            this._gdcUserId,
            vin,
            this._timeZone,
            this._baseEndpoint);
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
