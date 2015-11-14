module.exports = init;

var Primus = require('primus');
var Emitter = require('primus-emitter');
var Socket = Primus.createSocket({ transformer: 'websockets', parser: 'JSON', plugin: { emitter: Emitter } });

var Service = null;
var Characteristic = null;

function init(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerPlatform('homebridge-airproxy', 'AirProxy', AirProxyPlatform);
}

function AirProxyPlatform(log, config) {
  this.log = log;
  this.airProxyClient = new Socket(config.host);
  this.namesToDevices = {};
  this.devices = [];
}

AirProxyPlatform.prototype.accessories = function (callback) {
  this.log('Fetching audio devices...');
  this.airProxyClient.once('groups', function (groups) {
    this.manageGroups(groups);
    callback(this.devices);
  }.bind(this));
  this.airProxyClient.on('groups', function (groups) {
    this.manageGroups(groups);
  }.bind(this));
};

AirProxyPlatform.prototype.manageGroups = function (groups) {
  var group = groups[0];
  if (!group) return;
  group.zones.forEach(function (zone) {
    var device = this.namesToDevices[zone.name];
    if (!device) {
      device = new AudioDeviceAccessory(group, zone, this.airProxyClient, this.log);
      this.namesToDevices[zone.name] = device;
      this.devices.push(device);
    } else {
      device.setVolume(zone.volume);
      device.setEnabled(zone.enabled);
    }
  }.bind(this));
};

function AudioDeviceAccessory(group, zone, airProxyClient, log) {
  this.id = zone.name;
  this.name = zone.name + ' Speakers';
  this.originalName = zone.name;
  this.isEnabled = zone.enabled;
  this.volume = zone.volume;
  this.groupName = group.name;
  this.log = log;
  this.airProxyClient = airProxyClient;
}

AudioDeviceAccessory.prototype.setVolume = function (volume) {
  this.volume = volume;
};

AudioDeviceAccessory.prototype.setEnabled = function (enabled) {
  this.isEnabled = enabled;
};

AudioDeviceAccessory.prototype.getServices = function () {
  // Use lightbulb service as no audio service exists
  var service = new Service.Lightbulb(this.name);

  service.getCharacteristic(Characteristic.On)
    .on('get', function (callback) {
      callback(null, this.isEnabled ? 1 : 0);
    }.bind(this))
    .on('set', function (value, callback) {
      this.isEnabled = value;
      var data = { enabled: value, groupName: this.groupName, zoneName: this.originalName };
      this.log('setting on state:', JSON.stringify(data));
      this.airProxyClient.send('zoneStateChange', data);
      callback();
    }.bind(this));

  service.addCharacteristic(Characteristic.Brightness)
    .on('get', function (callback) {
      callback(null, this.volume);
    }.bind(this))
    .on('set', function (value, callback) {
      this.volume = value;
      var data = { volume: value, name: this.originalName };
      this.log('setting volume:', JSON.stringify(data));
      this.airProxyClient.send('zoneVolumeChange', data);
      callback();
    }.bind(this));

  var informationService = new Service.AccessoryInformation();

  informationService
    .setCharacteristic(Characteristic.Manufacturer, 'Test')
    .setCharacteristic(Characteristic.Model, 'Test')
    .setCharacteristic(Characteristic.SerialNumber, this.name)
    .addCharacteristic(Characteristic.FirmwareRevision, 'test');

  return [ service, informationService ];
};
