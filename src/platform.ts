import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { NuvoEssentiaZone } from './zone';
import { NuvoEssentiaSource } from './source';

import SerialPort from 'serialport';

const Readline = SerialPort.parsers.Readline;

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

  private port: SerialPort;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {

    this.log.debug('Finished initializing platform:', this.config.serialPortPath);

    this.port = new SerialPort(this.config.serialPortPath, {
      autoOpen:false,
      baudRate:this.config.baudRate,
    });

    this.port.on('open', () => {
      this.log.info('Serial port open...');
    });

    this.port.on('error', (err) => {
      this.log.error('Error on serial port:');
      this.log.error(err);
    });

    const parser = this.port.pipe(new Readline({ delimiter: '\r' }));

    parser.on('data', data => {
      this.log.debug('data recevied:' + data);
    });

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {

      log.debug('Executed didFinishLaunching callback');

      //open the serial port
      this.port.open();


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

        // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
        // existingAccessory.context.device = device;
        // this.api.updatePlatformAccessories([existingAccessory]);

        // create the accessory handler for the restored accessory
        // this is imported from `platformAccessory.ts`
        new NuvoEssentiaZone(this, existingAccessory);

        //HACK - we need to update the config of cached accessories or our changes don't have any effect
        //without purging the cache. Figure out how to do this correctly.
        existingAccessory.context.config = zone;

        this.zones.push(existingAccessory);

        // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, eg.:
        // remove platform accessories when no longer present
        // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
        // this.log.debug('Removing existing accessory from cache:', existingAccessory.displayName);
      } else {
        // the accessory does not yet exist, so we need to create it
        this.log.debug('Adding new accessory:', zone.name);

        // create a new accessory
        const accessory = new this.api.platformAccessory(zone.name, uuid);

        // store a copy of the device object in the `accessory.context`
        // the `context` property can be used to store any data about the accessory you may need
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

        new NuvoEssentiaSource(this, existingAccessory);

        //HACK - we need to update the config of cached accessories or our changes don't have any effect
        //without purging the cache. Figure out how to do this correctly.
        existingAccessory.context.config = src;

        this.sources.push(existingAccessory);

      // the accessory does not yet exist, so we need to create it
      } else {
        this.log.debug('Adding new source accessory:', src.name);

        // create a new accessory
        const accessory = new this.api.platformAccessory(src.name, uuid);

        // store a copy of the device object in the `accessory.context`
        // the `context` property can be used to store any data about the accessory you may need
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

  sleep(ms :number){
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  async turnOnZone(zoneId :number){
    this.log.debug('Turning on zone ' + zoneId);
    const cmd = `*Z0${zoneId}ON\r`;
    this.log.debug(cmd);
    this.port.write(cmd);
    await this.sleep(this.config.cmdDelay);
  }

  async turnOffZone(zoneId :number){
    this.log.debug('Turning off zone ' + zoneId);
    const cmd = `*Z0${zoneId}OFF\r`;
    this.log.debug(cmd);
    this.port.write(cmd);
    await this.sleep(this.config.cmdDelay);
  }

  async muteZone(zoneId :number){
    this.log.debug('Turning off zone ' + zoneId);
    const cmd = `*Z0${zoneId}MTON\r`;
    this.log.debug(cmd);
    this.port.write(cmd);
    await this.sleep(this.config.cmdDelay);
  }

  async unmuteZone(zoneId :number){
    this.log.debug('Turning off zone ' + zoneId);
    const cmd = `*Z0${zoneId}MTOFF\r`;
    this.log.debug(cmd);
    this.port.write(cmd);
    await this.sleep(this.config.cmdDelay);
  }

  async setVolume(zoneId :number, volume :number){
    this.log.debug(`Setting volume of zone ${zoneId} to ${volume}`);
    const cmd = `*Z0${zoneId}VOL${volume}\r`;
    this.log.debug(cmd);
    this.port.write(cmd);
    await this.sleep(this.config.cmdDelay);
  }

  async setBass(zoneId :number, volume :number){
    this.log.debug(`Setting bass of zone ${zoneId} to ${volume}`);
    const cmd = `*Z0${zoneId}BASS${volume}\r`;
    this.log.debug(cmd);
    this.port.write(cmd);
    await this.sleep(this.config.cmdDelay);
  }

  async setTreble(zoneId :number, volume :number){
    this.log.debug(`Setting treble of zone ${zoneId} to ${volume}`);
    const cmd = `*Z0${zoneId}TREB${volume}\r`;
    this.log.debug(cmd);
    this.port.write(cmd);
    await this.sleep(this.config.cmdDelay);
  }

  async setSource(zoneId :number, sourceId :number){
    this.log.debug(`Setting source of zone ${zoneId} to ${sourceId}`);
    const cmd = `*Z0${zoneId}SRC${sourceId}\r`;
    this.log.debug(cmd);
    this.port.write(cmd);
    await this.sleep(this.config.cmdDelay);
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
    const sources = this.sources.filter(s => s.context.config.enabledZones.find(z => {
      const enabledZoneId = parseInt(z, 10);
      return enabledZoneId === zoneId;
    }));
    return sources;
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