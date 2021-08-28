const path = '/dev/ttyUSB0';
const baudRate = 9600;

const SerialPort = require('serialport');

const Readline = SerialPort.parsers.Readline;

const port = new SerialPort(path, {
  autoOpen:true,
  baudRate:baudRate,
});


const parser = port.pipe(new Readline({ delimiter: '\r' }));

//read response
parser.on('data', data => {
  console.log('Parser Data:' + data);
});

/*
port.on('data', data => {
  console.log('Data:' + data);
  console.log(data);
});
*/

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function onOpen(err){
  port.write('*Z01SETSR\r');
  await sleep(1000);
  port.write('*Z02SETSR\r');
  await sleep(1000);
  port.write('*Z03SETSR\r');
  await sleep(1000);
  port.write('*Z04SETSR\r');
  await sleep(1000);
  port.write('*Z05SETSR\r');
  await sleep(1000);
  port.write('*Z06SETSR\r');
}

port.on('open', onOpen);

port.on('error', console.log);


