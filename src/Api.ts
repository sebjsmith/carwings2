import * as crypto from 'crypto';
import * as superagent from 'superagent';

export class Api {
    private static NNA_BASE_ENDPOINT = 'https://gdcportalgw.its-mo.com/gworchest_160803EC/gdc';
    private static NE_BASE_ENDPOINT = 'https://gdcportalgw.its-mo.com/api_v181217_NE/gdc';
    private static INITIAL_APP_STRINGS = 'geORNtsZe5I4lRGjG9GZiA';

    private static getBaseEndpoint(regionCode: string, baseEndpoint?: string) {
        if (baseEndpoint) {
            return baseEndpoint;
        } else {
            return (regionCode === 'NNA' ? Api.NNA_BASE_ENDPOINT : Api.NE_BASE_ENDPOINT);
        }
    }

    public async connectAsync(
        regionCode: string,
        locale: string,
        baseEndpoint: string) {
        return await this.postForm(Api.getBaseEndpoint(regionCode, baseEndpoint) + '/InitialApp.php',
            {
                'initial_app_strings': Api.INITIAL_APP_STRINGS,
                'RegionCode': regionCode,
                'lg': locale
            });
    }

    public async loginAsync(
        regionCode: string,
        locale: string,
        userId: string,
        password: string,
        passwordEncryptionKey: string,
        baseEndpoint: string) {

        const encryptedPassword = Api.encryptPassword(password, passwordEncryptionKey);

        return await this.postForm(Api.getBaseEndpoint(regionCode, baseEndpoint) + '/UserLoginRequest.php',
            {
                'initial_app_strings': Api.INITIAL_APP_STRINGS,
                'RegionCode': regionCode,
                'lg': locale,
                'UserId': userId,
                'Password': encryptedPassword
            });
    }

    public async requestStatusAsync(
        regionCode: string,
        locale: string,
        customSessionId: string,
        dcmId: string,
        gdcUserId: string,
        vin: string,
        timeZone: string,
        baseEndpoint: string) {
        return await this.postForm(Api.getBaseEndpoint(regionCode, baseEndpoint) + '/BatteryStatusCheckRequest.php',
            {
                'initial_app_strings': Api.INITIAL_APP_STRINGS,
                'RegionCode': regionCode,
                'lg': locale,
                'custom_sessionid': customSessionId,
                'DCMID': dcmId,
                'UserId': gdcUserId,
                'VIN': vin,
                'tz': timeZone
            });
    }

    public async requestStatusResultAsync(
        regionCode: string,
        locale: string,
        customSessionId: string,
        dcmId: string,
        vin: string,
        timeZone: string,
        resultKey: string,
        baseEndpoint: string) {
        return await this.postForm(Api.getBaseEndpoint(regionCode, baseEndpoint) + '/BatteryStatusCheckResultRequest.php', {
            'initial_app_strings': Api.INITIAL_APP_STRINGS,
            'RegionCode': regionCode,
            'lg': locale,
            'custom_sessionid': customSessionId,
            'DCMID': dcmId,
            'VIN': vin,
            'tz': timeZone,
            'resultKey': resultKey
        });
    }

    public async requestCachedStatusAsync(
        regionCode: string,
        locale: string,
        customSessionId: string,
        dcmId: string,
        gdcUserId: string,
        vin: string,
        timeZone: string,
        baseEndpoint: string) {
        return await this.postForm(Api.getBaseEndpoint(regionCode, baseEndpoint) + '/BatteryStatusRecordsRequest.php',
            {
                'initial_app_strings': Api.INITIAL_APP_STRINGS,
                'RegionCode': regionCode,
                'lg': locale,
                'custom_sessionid': customSessionId,
                'DCMID': dcmId,
                'UserId': gdcUserId,
                'VIN': vin,
                'tz': timeZone
            });
    }

    public async requestClimateControlStatusAsync(
        regionCode: string,
        locale: string,
        customSessionId: string,
        dcmId: string,
        gdcUserId: string,
        vin: string,
        timeZone: string,
        baseEndpoint: string) {
        return await this.postForm(Api.getBaseEndpoint(regionCode, baseEndpoint) + '/RemoteACRecordsRequest.php', {
            'initial_app_strings': Api.INITIAL_APP_STRINGS,
            'RegionCode': regionCode,
            'lg': locale,
            'custom_sessionid': customSessionId,
            'DCMID': dcmId,
            'UserId': gdcUserId,
            'VIN': vin,
            'tz': timeZone
        });
    }

    public async requestClimateControlTurnOnAsync(
        regionCode: string,
        locale: string,
        customSessionId: string,
        dcmId: string,
        gdcUserId: string,
        vin: string,
        timeZone: string,
        baseEndpoint: string) {
        return await this.postForm(Api.getBaseEndpoint(regionCode, baseEndpoint) + '/ACRemoteRequest.php',
            {
                'initial_app_strings': Api.INITIAL_APP_STRINGS,
                'RegionCode': regionCode,
                'lg': locale,
                'custom_sessionid': customSessionId,
                'DCMID': dcmId,
                'UserId': gdcUserId,
                'VIN': vin,
                'tz': timeZone
            });
    }

    public async requestClimateControlTurnOnResultAsync(
        regionCode: string,
        locale: string,
        customSessionId: string,
        dcmId: string,
        vin: string,
        timeZone: string,
        resultKey: string,
        baseEndpoint: string) {
        return await this.postForm(Api.getBaseEndpoint(regionCode, baseEndpoint) + '/ACRemoteResult.php', {
            'initial_app_strings': Api.INITIAL_APP_STRINGS,
            'RegionCode': regionCode,
            'lg': locale,
            'custom_sessionid': customSessionId,
            'DCMID': dcmId,
            'VIN': vin,
            'tz': timeZone,
            'resultKey': resultKey
        });
    }

    public async requestClimateControlTurnOffAsync(
        regionCode: string,
        locale: string,
        customSessionId: string,
        dcmId: string,
        gdcUserId: string,
        vin: string,
        timeZone: string,
        baseEndpoint: string) {
        return await this.postForm(Api.getBaseEndpoint(regionCode, baseEndpoint) + '/ACRemoteOffRequest.php',
            {
                'initial_app_strings': Api.INITIAL_APP_STRINGS,
                'RegionCode': regionCode,
                'lg': locale,
                'custom_sessionid': customSessionId,
                'DCMID': dcmId,
                'UserId': gdcUserId,
                'VIN': vin,
                'tz': timeZone
            });
    }

    public async requestClimateControlTurnOffResultAsync(
        regionCode: string,
        locale: string,
        customSessionId: string,
        dcmId: string,
        vin: string,
        timeZone: string,
        resultKey: string,
        baseEndpoint: string) {
        return await this.postForm(Api.getBaseEndpoint(regionCode, baseEndpoint) + '/ACRemoteOffResult.php',
            {
                'initial_app_strings': Api.INITIAL_APP_STRINGS,
                'RegionCode': regionCode,
                'lg': locale,
                'custom_sessionid': customSessionId,
                'DCMID': dcmId,
                'VIN': vin,
                'tz': timeZone,
                'resultKey': resultKey
            });
    }

    public async requestChargingStartAsync(
        regionCode: string,
        locale: string,
        customSessionId: string,
        dcmId: string,
        gdcUserId: string,
        vin: string,
        timeZone: string,
        baseEndpoint: string) {
        return await this.postForm(Api.getBaseEndpoint(regionCode, baseEndpoint) + '/BatteryRemoteChargingRequest.php',
            {
                'initial_app_strings': Api.INITIAL_APP_STRINGS,
                'RegionCode': regionCode,
                'lg': locale,
                'custom_sessionid': customSessionId,
                'DCMID': dcmId,
                'UserId': gdcUserId,
                'VIN': vin,
                'tz': timeZone
            });
    }

    private async postForm(url: string, form: object) {
        try {
            const beforeTimestamp = Date.now();
            console.log(url);
            console.log(form);
            const response = await superagent
                .post(url)
                .type('form')
                .set('Accept', 'application/json')
                .send(form);
            if (response.status !== 200) {
                throw new Error('Response was status code: ' + response.status + ' (' + response.text + ')');
            }
            console.log((Date.now() - beforeTimestamp) + ' miliseconds taken');
            console.log(response.text);
            return JSON.parse(response.text);
        } catch (error) {
            throw error;
        }
    }

    private static encryptPassword(password: string, passwordEncryptionKey: string) {
        const cipher = crypto.createCipheriv('bf-ecb', new Buffer(passwordEncryptionKey), new Buffer(''));

        let encrypted = cipher.update(password, 'utf8', 'base64');

        encrypted += cipher.final('base64');

        return encrypted;
    }
}
