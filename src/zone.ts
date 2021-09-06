import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { NuvoEssentiaPlatform } from './platform';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class NuvoEssentiaZone {
  private service: Service;

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private state = {
    on:false,
  };

  constructor(
    private readonly platform: NuvoEssentiaPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Default-Manufacturer')
      .setCharacteristic(this.platform.Characteristic.Model, 'Default-Model')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');

    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);

    // set the service name, this is what is displayed as the default name on the Home app
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessory.context.config.name);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))                // SET - bind to the `setOn` method below
      .onGet(this.getOn.bind(this));               // GET - bind to the `getOn` method below

  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setOn(turnOn: CharacteristicValue) {

    const cfg = this.accessory.context.config;
    const useMute = this.platform.config.muteInsteadOfRelay;
    const essentia = this.platform.essentia;

    if(turnOn){
      useMute ? await essentia.unmuteZone(cfg.id) : await essentia.turnOnZone(cfg.id);
      await essentia.setVolume(cfg.id, 'volume' in cfg ? cfg.volume : this.platform.config.defaultVolume);
      await essentia.setTreble(cfg.id, cfg.treble);
      await essentia.setBass(cfg.id, cfg.bass);
    }else{
      useMute ? await essentia.muteZone(cfg.id) : await essentia.turnOffZone(cfg.id);
    }

  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possbile. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   *
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.
   */
  async getOn(): Promise<CharacteristicValue> {

    const cfg = this.accessory.context.config;
    const useMute = this.platform.config.muteInsteadOfRelay;
    const essentia = this.platform.essentia;

    return useMute ? await essentia.isZoneMuted(cfg.id) : await essentia.isZoneOn(cfg.id);

  }

  async setDefaults(){
    const cfg = this.accessory.context.config;
    const essentia = this.platform.essentia;
    await essentia.setVolume(cfg.id, 'volume' in cfg ? cfg.volume : this.platform.config.defaultVolume);
    await essentia.setTreble(cfg.id, cfg.treble);
    await essentia.setBass(cfg.id, cfg.bass);
  }

}
