import { Service, PlatformAccessory, CharacteristicValue, API } from 'homebridge';

import { NuvoEssentiaPlatform } from './platform';

const PLUGIN_NAME = 'homebridge-nuvo-esssentia-tv';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class NuvoEssentiaTVZone {
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

    this.accessory.category = this.platform.api.hap.Categories.TELEVISION;

    //add the TV service
    this.service = this.accessory.getService(this.platform.Service.Television) ||
      this.accessory.addService(this.platform.Service.Television);

    //set the name - this will break it
    //this.service.setCharacteristic(this.platform.Characteristic.ConfiguredName, accessory.context.zone.name);

    // set sleep discovery characteristic to always discoverable
    this.service.setCharacteristic(this.platform.Characteristic.SleepDiscoveryMode,
      this.platform.Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE);

    //handle on/off events
    this.service.getCharacteristic(this.platform.Characteristic.Active)
      .onSet((newValue) => {
        this.platform.log.info('set Active => setNewValue: ' + newValue);
        this.service.updateCharacteristic(this.platform.Characteristic.Active, 1);
      });

    //set the default input
    this.service.setCharacteristic(this.platform.Characteristic.ActiveIdentifier, 1);

    //handle changing the input
    this.service.getCharacteristic(this.platform.Characteristic.ActiveIdentifier)
      .onSet((newValue) => {

        // the value will be the value you set for the Identifier Characteristic
        // on the Input Source service that was selected - see input sources below.

        this.platform.log.info('set Active Identifier => setNewValue: ' + newValue);
      });

    //handle remote control input
    this.service.getCharacteristic(this.platform.Characteristic.RemoteKey)
      .onSet((newValue) => {
        switch(newValue) {
          case this.platform.Characteristic.RemoteKey.REWIND: {
            this.platform.log.info('set Remote Key Pressed: REWIND');
            break;
          }
          case this.platform.Characteristic.RemoteKey.FAST_FORWARD: {
            this.platform.log.info('set Remote Key Pressed: FAST_FORWARD');
            break;
          }
          case this.platform.Characteristic.RemoteKey.NEXT_TRACK: {
            this.platform.log.info('set Remote Key Pressed: NEXT_TRACK');
            break;
          }
          case this.platform.Characteristic.RemoteKey.PREVIOUS_TRACK: {
            this.platform.log.info('set Remote Key Pressed: PREVIOUS_TRACK');
            break;
          }
          case this.platform.Characteristic.RemoteKey.ARROW_UP: {
            this.platform.log.info('set Remote Key Pressed: ARROW_UP');
            break;
          }
          case this.platform.Characteristic.RemoteKey.ARROW_DOWN: {
            this.platform.log.info('set Remote Key Pressed: ARROW_DOWN');
            break;
          }
          case this.platform.Characteristic.RemoteKey.ARROW_LEFT: {
            this.platform.log.info('set Remote Key Pressed: ARROW_LEFT');
            break;
          }
          case this.platform.Characteristic.RemoteKey.ARROW_RIGHT: {
            this.platform.log.info('set Remote Key Pressed: ARROW_RIGHT');
            break;
          }
          case this.platform.Characteristic.RemoteKey.SELECT: {
            this.platform.log.info('set Remote Key Pressed: SELECT');
            break;
          }
          case this.platform.Characteristic.RemoteKey.BACK: {
            this.platform.log.info('set Remote Key Pressed: BACK');
            break;
          }
          case this.platform.Characteristic.RemoteKey.EXIT: {
            this.platform.log.info('set Remote Key Pressed: EXIT');
            break;
          }
          case this.platform.Characteristic.RemoteKey.PLAY_PAUSE: {
            this.platform.log.info('set Remote Key Pressed: PLAY_PAUSE');
            break;
          }
          case this.platform.Characteristic.RemoteKey.INFORMATION: {
            this.platform.log.info('set Remote Key Pressed: INFORMATION');
            break;
          }
        }
      });

    /**
     * Create a speaker service to allow volume control
    */

    const speakerService = this.accessory.addService(this.platform.api.hap.Service.TelevisionSpeaker);

    speakerService
      .setCharacteristic(this.platform.Characteristic.Active, this.platform.Characteristic.Active.ACTIVE)
      .setCharacteristic(this.platform.Characteristic.VolumeControlType, this.platform.Characteristic.VolumeControlType.ABSOLUTE);

    // handle volume control
    speakerService.getCharacteristic(this.platform.Characteristic.VolumeSelector)
      .onSet((newValue) => {
        this.platform.log.info('set VolumeSelector => setNewValue: ' + newValue);
      });


    /**
   * Create TV Input Source Services
   * These are the inputs the user can select from.
   * When a user selected an input the corresponding Identifier Characteristic
   * is sent to the TV Service ActiveIdentifier Characteristic handler.
    */

    // HDMI 1 Input Source
    const hdmi1InputService = this.accessory.addService(this.platform.api.hap.Service.InputSource, 'hdmi1', 'HDMI 1');
    hdmi1InputService
      .setCharacteristic(this.platform.Characteristic.Identifier, 1)
      .setCharacteristic(this.platform.Characteristic.ConfiguredName, 'Source 1')
      .setCharacteristic(this.platform.Characteristic.IsConfigured, this.platform.Characteristic.IsConfigured.CONFIGURED)
      .setCharacteristic(this.platform.Characteristic.InputSourceType, this.platform.Characteristic.InputSourceType.HDMI);
    this.service.addLinkedService(hdmi1InputService); // link to tv service

    // HDMI 2 Input Source
    const hdmi2InputService = this.accessory.addService(this.platform.api.hap.Service.InputSource, 'hdmi2', 'HDMI 2');
    hdmi2InputService
      .setCharacteristic(this.platform.Characteristic.Identifier, 2)
      .setCharacteristic(this.platform.Characteristic.ConfiguredName, 'Source 2')
      .setCharacteristic(this.platform.Characteristic.IsConfigured, this.platform.Characteristic.IsConfigured.CONFIGURED)
      .setCharacteristic(this.platform.Characteristic.InputSourceType, this.platform.Characteristic.InputSourceType.HDMI);
    this.service.addLinkedService(hdmi2InputService); // link to tv service

    // Netflix Input Source
    const netflixInputService = this.accessory.addService(this.platform.api.hap.Service.InputSource, 'netflix', 'Netflix');
    netflixInputService
      .setCharacteristic(this.platform.Characteristic.Identifier, 3)
      .setCharacteristic(this.platform.Characteristic.ConfiguredName, 'Source 3')
      .setCharacteristic(this.platform.Characteristic.IsConfigured, this.platform.Characteristic.IsConfigured.CONFIGURED)
      .setCharacteristic(this.platform.Characteristic.InputSourceType, this.platform.Characteristic.InputSourceType.HDMI);
    this.service.addLinkedService(netflixInputService); // link to tv service


    /**
     * Publish as external accessory
     * Only one TV can exist per bridge, to bypass this limitation, you should
     * publish your TV as an external accessory.
     */

    //this also breaks it
    //this.platform.api.publishExternalAccessories(PLUGIN_NAME, [this.accessory]);
  }

}
