import { API } from 'homebridge';

import { PLATFORM_NAME } from './settings';
import { NuvoEssentiaPlatform } from './NuvoEssentiaPlatform';

/**
 * This method registers the platform with Homebridge
 */
export = (api: API) => {
  api.registerPlatform(PLATFORM_NAME, NuvoEssentiaPlatform);
};
