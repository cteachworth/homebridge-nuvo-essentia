import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { NuvoEssentiaZone } from './zone';
import { NuvoEssentiaSource } from './source';
import Essentia from './Essentia';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class NuvoEssentiaPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  private zones: PlatformAccessory[] = [];

  private sources: PlatformAccessory[] = [];

  readonly essentia: Essentia;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {

    this.essentia = new Essentia({
      serialPortPath: this.config.serialPortPath,
      baudRate: this.config.baudRate,
      cmdDelay: this.config.cmdDelay,
      log: this.log,
    });


    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {

      log.debug('Executed didFinishLaunching callback');

      // run the method to discover / register your devices as accessories
      this.discoverDevices();

    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.debug('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  discoverDevices() {

    this.createZones();

    this.createSources();

  }

  createZones(){
    for (const zone of this.config.zones) {

      // generate a unique id for the accessory this should be generated from
      // something globally unique, but constant, for example, the device serial
      // number or MAC address
      const uuid = this.api.hap.uuid.generate('homebridge-essentia-zone:' + zone.id);

      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        // the accessory already exists
        this.log.debug('Restoring existing zone accessory from cache:', existingAccessory.displayName);

        //we need to update the config of cached accessories or our config changes
        //don't have any effect without purging the cache.
        existingAccessory.context.config = zone;
        this.api.updatePlatformAccessories([existingAccessory]);

        // create the accessory handler for the restored accessory
        // this is imported from `platformAccessory.ts`
        new NuvoEssentiaZone(this, existingAccessory);

        this.zones.push(existingAccessory);

      } else {
        // the accessory does not yet exist, so we need to create it
        this.log.debug('Adding new accessory:', zone.name);

        // create a new accessory
        const accessory = new this.api.platformAccessory(zone.name, uuid);

        // store a copy of the device config object in the `accessory.context`
        accessory.context.config = zone;

        // create the accessory handler for the newly create accessory
        // this is imported from `platformAccessory.ts`
        new NuvoEssentiaZone(this, accessory);

        this.zones.push(accessory);

        // link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }

  createSources(){
    for (const src of this.config.sources) {

      //if you can repeat sources then this is no longer unique
      //if you use a name it will change every time you change the name
      const uuid = this.api.hap.uuid.generate('homebridge-essentia-src:' + src.id);

      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      //the accessory already exists
      if (existingAccessory) {

        this.log.debug('Restoring existing source accessory from cache:', existingAccessory.displayName);

        //we need to update the config of cached accessories or our config changes
        //don't have any effect without purging the cache.
        existingAccessory.context.config = src;
        this.api.updatePlatformAccessories([existingAccessory]);

        new NuvoEssentiaSource(this, existingAccessory);

        this.sources.push(existingAccessory);

      // the accessory does not yet exist, so we need to create it
      } else {
        this.log.debug('Adding new source accessory:', src.name);

        // create a new accessory
        const accessory = new this.api.platformAccessory(src.name, uuid);

        // store a copy of the device config object in the `accessory.context`
        accessory.context.config = src;

        // create the accessory handler for the newly create accessory
        // this is imported from `platformAccessory.ts`
        new NuvoEssentiaSource(this, accessory);

        this.sources.push(accessory);

        // link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }

  getSourceAccessoryById(sourceId :number) {
    return this.sources.find(s => s.context.config.id === sourceId);
  }

  getZoneAccessoryById(zoneId :number){
    return this.zones.find(z => z.context.config.id === zoneId);
  }

  getActiveSourceIdWithPrecedence(sourceId :number){

    let activeSourceId = this.config.defaultInputId;

    for(const source of this.sources){

      if(source.context.config.id !== sourceId ){

        const characteristic = source.getService(this.api.hap.Service.Switch)?.getCharacteristic(this.Characteristic.On);

        if(characteristic?.value && source.context.config.turnOffOtherSources ){
          activeSourceId = source.context.config.id;
        }

      }

    }

    return activeSourceId;

  }

  getSourceAccesoriesForZone(zoneId :number){
    return this.sources.filter(s => s.context.config.enabledZones.find(z => parseInt(z, 10) === zoneId));
  }

  turnOffOtherSources(sourceId :number){

    const sourceCfg = this.getSourceAccessoryById(sourceId)?.context.config;

    for(const otherSource of this.sources){

      const otherSourceCfg = otherSource.context.config;

      //if it's not this source and the other source contains any of the same zones
      if(otherSourceCfg.id !== sourceCfg.id && otherSourceCfg.enabledZones.some(z => sourceCfg.enabledZones.includes(z))){

        const characteristic = otherSource.getService(this.api.hap.Service.Switch)?.getCharacteristic(this.Characteristic.On);

        if(characteristic?.value){
          this.log.debug('Turning off source ' + otherSourceCfg.id);
          characteristic.setValue(false);
        }

      }
    }
  }

}