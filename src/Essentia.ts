import { Logger } from 'homebridge'; //purely for types
import SerialPort from 'serialport';

class Essentia {

    readonly port: SerialPort;

    readonly parser: SerialPort.parsers.Readline;

    readonly serialPortPath: string;

    readonly baudRate: number;

    readonly cmdDelay: number;

    readonly log: Logger;

    private commandQueue: unknown[] = [];

    private commandRunning = false;

    private currentCommand;

    constructor({
      serialPortPath = '/dev/ttyUSB0',
      baudRate = 9600,
      cmdDelay = 100,
      log,
    }){

      this.log = log;
      this.serialPortPath = serialPortPath;
      this.baudRate = baudRate;
      this.cmdDelay = cmdDelay;

      this.port = new SerialPort(this.serialPortPath, {
        autoOpen:false,
        baudRate:this.baudRate,
      });

      this.port.on('open', () => {
        this.log.info('Serial port open...');
      });

      this.port.on('error', (err) => {
        this.log.error('Error on serial port:');
        this.currentCommand.reject(err);
        this.commandRunning = false;
        this.processCommandQueue();
      });

      this.parser = this.port.pipe(new SerialPort.parsers.Readline({ delimiter: '\r' }));

      this.parser.on('data', data => {
        this.log.debug('Data recevied on serial port:' + data);
        this.currentCommand.resolve(data);
        this.commandRunning = false;
        this.processCommandQueue();
      });

      //open the serial port
      this.port.open();

    }

    processCommandQueue(){

      if(this.commandQueue.length){

        this.currentCommand = this.commandQueue.shift();
        this.commandRunning = true;

        const cmd = this.currentCommand.cmd;

        setTimeout(() => {
          this.log.debug('Sending queued command ' + cmd);
          this.port.write(cmd);
        }, this.cmdDelay);

      }

    }

    queueCommand(cmd :string){

      this.log.debug('There are ' + this.commandQueue.length + ' queued commands');

      const promise = new Promise<string>((resolve, reject) => {
        this.commandQueue.push({
          cmd:cmd,
          resolve:resolve,
          reject:reject,
        });
      });

      if(!this.commandRunning){
        this.processCommandQueue();
      }

      return promise;

    }

    parseConnectionSR(status: string){

      const parts = status.split(',');

      return{
        zone: parts[0].substr(2, 3),   // zone number with leading zero from 1 to 12
        power: parts[0].substr(7, 9),  // " ON" or "OFF"
        source: parts[1][3],           // source number
        group: parts[2][3],            // source group number
        volume: parts[3].substr(4, 5), // can be 00 to 79 (level below max dB), MT (mute), or XT (external mute)
      };

    }

    parseZoneSetSR(status: string){

      const parts = status.split(',');

      return{
        zone: parts[0].substr(2, 3),   // zone number with leading zero from 1 to 12
        bass: parts[1].substr(4, 5),   // -8 to +8
        treble: parts[1][3],           // -8 to +8
        source: parts[2][3],           // source group number
      };

    }

    async getZoneStatus(zoneId :number): Promise<string> {
      this.log.debug('Getting zone status for ' + zoneId);
      const cmd = `*Z0${zoneId}CONSR\r`;
      return await this.queueCommand(cmd);
    }

    async isZoneOn(zoneId :number): Promise<boolean> {
      const result = await this.getZoneStatus(zoneId);
      const status = this.parseConnectionSR(result);
      this.log.debug(status.power);
      return status.power.trim() === 'ON';
    }

    async turnOnZone(zoneId :number): Promise<boolean>{
      this.log.debug('Turning on zone ' + zoneId);
      const cmd = `*Z0${zoneId}ON\r`;
      const result = await this.queueCommand(cmd);
      const status = this.parseConnectionSR(result);
      this.log.debug(status.power);
      return status.power.trim() === 'ON';
    }

    async turnOffZone(zoneId :number): Promise<boolean>{
      this.log.debug('Turning off zone ' + zoneId);
      const cmd = `*Z0${zoneId}OFF\r`;
      const result = await this.queueCommand(cmd);
      const status = this.parseConnectionSR(result);
      this.log.debug(status.power);
      return status.power === 'OFF';
    }

    async isZoneMuted(zoneId :number): Promise<boolean> {
      const result = await this.getZoneStatus(zoneId);
      const status = this.parseConnectionSR(result);
      this.log.debug(status.volume);
      return status.volume === 'MT';
    }

    async muteZone(zoneId :number): Promise<boolean>{
      this.log.debug('Muting zone ' + zoneId);
      const cmd = `*Z0${zoneId}MTON\r`;
      const result = await this.queueCommand(cmd);
      const status = this.parseConnectionSR(result);
      this.log.debug(status.volume);
      return status.volume === 'MT';
    }

    async unmuteZone(zoneId :number): Promise<boolean>{
      this.log.debug('Unmuting zone ' + zoneId);
      const cmd = `*Z0${zoneId}MTOFF\r`;
      const result = await this.queueCommand(cmd);
      const status = this.parseConnectionSR(result);
      this.log.debug(status.volume);
      return status.volume !== 'MT';
    }

    async setVolume(zoneId :number, volume :number): Promise<boolean>{
      this.log.debug(`Setting volume of zone ${zoneId} to ${volume}`);
      const cmd = `*Z0${zoneId}VOL${volume}\r`;
      const result = await this.queueCommand(cmd);
      const status = this.parseConnectionSR(result);
      this.log.debug(status.volume);
      return parseInt(status.volume, 10) === volume;
    }

    async setBass(zoneId :number, bass :number): Promise<boolean>{
      this.log.debug(`Setting bass of zone ${zoneId} to ${bass}`);
      const cmd = `*Z0${zoneId}BASS${bass}\r`;
      const result = await this.queueCommand(cmd);
      const status = this.parseZoneSetSR(result);
      this.log.debug(status.bass);
      return parseInt(status.bass, 10) === bass;
    }

    async setTreble(zoneId :number, treble :number): Promise<boolean>{
      this.log.debug(`Setting treble of zone ${zoneId} to ${treble}`);
      const cmd = `*Z0${zoneId}TREB${treble}\r`;
      const result = await this.queueCommand(cmd);
      const status = this.parseZoneSetSR(result);
      this.log.debug(status.treble);
      return parseInt(status.treble, 10) === treble;
    }

    async setSource(zoneId :number, sourceId :number): Promise<boolean>{
      this.log.debug(`Setting source of zone ${zoneId} to ${sourceId}`);
      const cmd = `*Z0${zoneId}SRC${sourceId}\r`;
      const result = await this.queueCommand(cmd);
      const status = this.parseConnectionSR(result);
      this.log.debug(status.source);
      return parseInt(status.source, 10) === sourceId;
    }

}

export = Essentia;