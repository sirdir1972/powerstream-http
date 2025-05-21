// ver 0.11
// (c) 2025 sirdir

const axios = require('axios');
const crypto = require('crypto');

var ConfigData = {
    PSIgnore: [{ serial : ''}],
    D2M: [ { serial : ''}],
    statePath: "0_userdata.0.ecoflow_public_api.",
    demandState: "0_userdata.0.sumpower.actualDemand",
    DoSleepFrom: 24,
    DoSleepTo: 8
}
const url = 'https://api-e.ecoflow.com/iot-open/sign/device/quota';
const key = 'YOUR KEY';
const secret = 'YOUR SECRET';

var powerStreamSerials = []
var allPowerStreamSerials = []
let debugEnabled = false;

function hmac_sha256(data, key) {
  const hmac = crypto.createHmac('sha256', key);
  hmac.update(data);
  return hmac.digest('hex');
}

function logDebug(message) {
    var debugEnabled = getState(ConfigData.statePath + "Debug").val
    if (debugEnabled) {
        log(message);
    }
}

function createSignature(params, secretKey) {
  const queryString = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  return crypto.createHmac('sha256', secretKey).update(queryString).digest('hex');
}

function get_qstring(params, prefix = '') {
  if (!params) {
    return '';
  }
  const keys = Object.keys(params).sort();
  return keys.map((key) => {
    const value = params[key];
    if (typeof value === 'object' && !Array.isArray(value)) {
      return get_qstring(value, `${prefix}${key}.`);
    } else if (Array.isArray(value)) {
      return value.map((v, i) => `${prefix}${key}[${i}]=${v}`).join('&');
    } else {
      return `${prefix}${key}=${value}`;
    }
  }).join('&');
}

async function post_api(url, key, secret, body) {
  const nonce = String(Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000);
  const timestamp = String(Date.now());
  const headers = {
    accessKey: key,
    nonce: nonce,
    timestamp: timestamp,
    'Content-Type': 'application/json;charset=UTF-8',
  };

  // Create a combined string of body and headers for signing
  const bodyString = get_qstring(body);
  const headerString = get_qstring({ accessKey: key, nonce: nonce, timestamp: timestamp });
  const sign_str = bodyString + (bodyString ? '&' : '') + headerString;

  headers.sign = hmac_sha256(sign_str, secret);

  try {
    const response = await axios.put(url, body, { headers: headers });
    if (response.status === 200) {
      return response.data;
    } else {
      console.error(`post_api: HTTP-Statuscode ${response.status}, Response: ${JSON.stringify(response.data)}`);
      return null;
    }
  } catch (error) {
    console.error(`post_api: Error during request: ${error.message}`);
    return null;
  }
}

async function setUSB(serial, onoff) {
  const body = {
    "id": 123,
    "sn": serial,
    "version": "1.0",
    "moduleType": 1,
    "operateType": "dcOutCfg",
    "params": {
        "enabled": onoff
    }
};
const payload = await post_api(url, key, secret, body);
  if (payload.message == 'Success') {
      if (payload.message == 'Success') { 
          logDebug('Set USB to ' + onoff)
          return(0)}
  } else {
    logDebug('Error sending POST request. setUSB ' + onoff);
  }
}


async function setSlowChgWatts(serial, watts) {
  const body = {
    "id": 1,
    "version": "1.0",
    sn: serial,
    "moduleType": 3,
    "operateType": "acChgCfg",
    "params": {
        "fastChgWatts": 2400,
        "slowChgWatts": watts,
        "chgPauseFlag": 0
    }
  };
  //log(body)
  const payload = await post_api(url, key, secret, body);
  if (payload.message == 'Success') {
      if (payload.message == 'Success') { 
          logDebug('Set setSlowChgWatts to ' + watts)
          return(0)}
  } else {
    logDebug('Error sending POST request. setSlowChgWatts ' + serial);
  }
}

async function getDeviceList() {
  const nonce = Math.floor(Math.random() * 1000000);
  const timestamp = Date.now();
  const params = {
    accessKey: key,
    nonce: nonce,
    timestamp: timestamp,
  };

  const signature = createSignature(params, secret);
  params.sign = signature;

   const url = '/iot-open/sign/device/list'
   const host = "api-e.ecoflow.com"
  //var url = '/iot-open/sign/device/quota/all'
  var response = await axios.get(`https://${host}${url}`, {
    headers: params
  });
  //logDebug(response.data)
  powerStreamSerials=extractSerialNumbers(response.data)
  allPowerStreamSerials = extractAllSerialNumbers(response.data)
  logDebug("ps online: " + allPowerStreamSerials)
}

async function getStatus(sn) {
  const nonce = String(Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000);
  const timestamp = String(Math.floor(Date.now()));
  var params = { sn: sn }
  const headers = { accessKey: key, nonce: nonce, timestamp: timestamp };
  const sign_str = (params ? get_qstring(params) + '&' : '') + get_qstring(headers);
  headers.sign = hmac_sha256(sign_str, secret);
   const host = "api-e.ecoflow.com"
  var url = '/iot-open/sign/device/quota/all'
  var response = await axios.get(`https://${host}${url}`, {
   headers: headers, params: params });
  updateObjectStatus(response.data,sn)
  //powerStreamSerials=extractSerialNumbers(response.data)
  //logDebug("ps online: " + powerStreamSerials)
}

async function getStatusDelta(sn) {
  const nonce = String(Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000);
  const timestamp = String(Math.floor(Date.now()));
  var params = { sn: sn }
  const headers = { accessKey: key, nonce: nonce, timestamp: timestamp };
  const sign_str = (params ? get_qstring(params) + '&' : '') + get_qstring(headers);
  headers.sign = hmac_sha256(sign_str, secret);
   const host = "api-e.ecoflow.com"
  var url = '/iot-open/sign/device/quota/all'
  //logDebug (sn)
  var response = await axios.get(`https://${host}${url}`, { headers: headers, params: params });
  //logDebug(response.data)
  updateObjectStatusDM(response.data,sn)
  //updateObjectStatus(response.data,sn)
  //powerStreamSerials=extractSerialNumbers(response.data)
  //logDebug("ps online: " + powerStreamSerials)
}
function updateObjectStatus(response,sn) {
  const status = response.data;
  path = ConfigData.statePath + sn 
  //logDebug(status)
  const supplyPriority = status['20_1.supplyPriority'];
  const batSoc = status['20_1.batSoc'];
  const invOutputWatts = status['20_1.invOutputWatts'];
  const batInputWatts = status['20_1.batInputWatts'];
  const pv1InputWatts = status['20_1.pv1InputWatts'];
  const pv2InputWatts = status['20_1.pv2InputWatts'];
  const pv1Temp = status['20_1.pv1Temp'];
  const pv2Temp = status['20_1.pv2Temp'];
  const upperLimit = status['20_1.upperLimit']
  const batErrCode = status['20_1.batErrCode'];

//log (supplyPriority)
setState(path + ".supplyPriority", supplyPriority)
setState(path + ".batSoc", batSoc)
setState(path + ".invOutputWatts",invOutputWatts)
setState(path + ".batInputWatts", batInputWatts)
setState(path + ".pv1InputWatts", pv1InputWatts)
setState(path + ".pv2InputWatts", pv2InputWatts)
setState(path + ".pv1Temp", pv1Temp)
setState(path + ".pv2Temp", pv2Temp)
setState(path + ".batErrCode",batErrCode)
setState(path + '.upperLimit',upperLimit)
//  return { supplyPriority, batSoc };
}

function updateObjectStatusDM(response,sn) {
  if(!existsState(ConfigData.statePath + sn)) {
      initMyObjectAsNumber(sn + ".setAC",0)
      initMyObjectAsNumber(sn + ".USB",0)
  }

  const status = response.data;
  path = ConfigData.statePath + sn 
  //logDebug(status)
  var USBstate = toInt(status['pd.dcOutState']);
  const USBNewState = toInt(getState(ConfigData.statePath + sn + ".USB").val)
  //logDebug (USBstate + " " + USBNewState)
  if (USBstate != USBNewState) {
      setUSB(sn,USBNewState)
  }
  
  const setAC = toInt(getState(path  + ".setAC").val)
  const soc = status['bms_bmsStatus.soc'];
  
  var SlowChgWatts= status['inv.SlowChgWatts'];
  const inputWatts = status['inv.inputWatts'];
  //logDebug('setAC' + setAC + " SlowChgWatts: " + SlowChgWatts)

  if (setAC != SlowChgWatts) {
      setSlowChgWatts(sn,setAC)
      SlowChgWatts = setAC
  }
//log (supplyPriority)
setState(path + ".soc", soc)
setState(path + ".inputWatts", inputWatts)
setState(path + ".SlowChgWatts",SlowChgWatts)
setState(path + ".USB",USBNewState)

//  return { supplyPriority, batSoc };
}

function extractSerialNumbers(response) {
    // Extract serial numbers to ignore from ConfigData.PSIgnore
    const ignoredSerials = ConfigData.PSIgnore.map(item => item.serial);

    return response.data
        .filter(item => 
            item.productName === 'PowerStream' && 
            item.online === 1 && 
            !ignoredSerials.includes(item.sn) // Exclude ignored serial numbers
        )
        .map(item => item.sn);
}


function extractAllSerialNumbers(response) {
    // Extract serial numbers to ignore from ConfigData.PSIgnore
    return response.data
        .filter(item => 
            item.productName === 'PowerStream' && 
            item.online === 1
        )
        .map(item => item.sn);
}

async function setPermanentWatts(deviceSN, wattsValue) {
    wattsValue = Math.round(wattsValue / 10) * 10;
    if (wattsValue > 8000) wattsValue = 8000;
    if (wattsValue < 0) wattsValue = 0;
  
  const body = {
    sn: deviceSN,
    cmdCode: 'WN511_SET_PERMANENT_WATTS_PACK',
    params: {
      permanentWatts: wattsValue,
    },
  };

  const payload = await post_api(url, key, secret, body);
  
      if (payload.message == 'Success') { 
          setState(ConfigData.statePath + deviceSN + ".setAC",wattsValue)
          setState(ConfigData.statePath + deviceSN + ".permanentWatts",wattsValue)        
          return(0)
    //console.log(JSON.stringify(payload, null, 2));
  } else {
    logDebug('Error sending POST request. setPermanentwatts' + deviceSN + " " + wattsValue);
  }
}
 
async function setPrio(deviceSN, prio) {
  //  logDebug("SetPrio called")
  const body = {
    "sn": deviceSN,
    "cmdCode": "WN511_SET_SUPPLY_PRIORITY_PACK",
    "params": {
        "supplyPriority": prio
    }
  };

  const payload = await post_api(url, key, secret, body);

  if (payload.message == 'Success') {
    logDebug (deviceSN + " set to prio: " + prio)
    //console.log(JSON.stringify(payload, null, 2));
  } else {
    //logDebug(JSON.stringify(payload, null, 2));  
    logDebug('Error sending POST request.' + deviceSN);
  }
} 

async function distributePower() {
    const regulate = getState(ConfigData.statePath + "regulate").val
    const myDate = new Date();
    var myHour = toInt(myDate.getHours().toString().padStart(2, "0"));
    
    if (myHour == 0) myHour = 24
    //logDebug('hour: ' + myHour + ' Myhour < ' + (myHour < (toInt(ConfigData.DoSleepFrom))) + ' >= ' + (myHour >= toInt(ConfigData.DoSleepTo)))

    if (myHour < (toInt(ConfigData.DoSleepFrom)) && myHour >= (toInt(ConfigData.DoSleepTo))) {
    if (regulate === true) {
    try {
        var demandValue = toInt(getState(ConfigData.demandState).val);
        logDebug(`demand: ${demandValue}`);

        if (typeof demandValue !== 'number' || isNaN(demandValue)) {
            console.error(`Invalid demand value or data type: ${demandValue}`);
            return;
        }
        if (demandValue < 0) {
            demandValue = 0
        }
        var demand = demandValue * 10;
        let totalSoc = 0;
        const powerStreamData = [];

        // Gather SOC data for each PowerStream
        for (const serial of powerStreamSerials) {
            const socPath = ConfigData.statePath + serial + ".batSoc";
            const soc = getState(socPath).val;
            totalSoc += soc;
            powerStreamData.push({ serial, soc });
        }

        // Distribute power based on SOC
        for (const { serial, soc } of powerStreamData) {
            let powerPerStream = 0;
            if (totalSoc > 0) {
                const share = soc / totalSoc;
                powerPerStream = Math.round((demand * share) / 10) * 10; // Ensure powerPerStream is in steps of 10
            }

            if (powerPerStream > 8000) {
                powerPerStream = 8000;
            }

            const path = ConfigData.statePath + serial + ".permanentWatts";
            const currWatts = getState(path).val;

            if (currWatts !== powerPerStream) {
                setPermanentWatts(serial, powerPerStream);
                logDebug(`Setting ${serial} to ${powerPerStream}W`);
                //setState(path, powerPerStream);
            }
        }
    } catch (error) {
        console.error('Error in power distribution:', error);
    }
}
}
}

function updatePrio(serial) {
     //for (const serial of allPowerStreamSerials) {
            path = ConfigData.statePath + serial 
            const currentlySetPrio = getState(path + ".supplyPriority").val
            const newSetPrio = getState(path + ".setSupplyPriority").val
            // logDebug (serial + " " + currentlySetPrio + " " + newSetPrio)
            if (currentlySetPrio != newSetPrio) {
                setPrio(serial,newSetPrio)
                logDebug('updating setPrio for ' + serial + " to :" + newSetPrio)
                setState(path + ".supplyPriority", newSetPrio)
            }
            //logDebug (getState(path + ".supplyPriority").val + " " + getState(path + ".setSupplyPriority").val)
      //  }

}
function updateStatus() {
    for (const serial of allPowerStreamSerials) {
        // log (serial)
        if(!existsState(ConfigData.statePath + serial)) {
            initMyObjectAsNumber(serial + '.setAC',0)
            initMyObjectAsNumber( serial + '.setSupplyPriority',0)
            initMyObjectAsNumber( serial + '.supplyPriority',0)
            initMyObjectAsNumber( serial + '.invOutputWatts',0)
            initMyObjectAsNumber( serial + '.batInputWatts',0)
            initMyObjectAsNumber( serial + '.pv1InputWatts',0)
            initMyObjectAsNumber( serial + '.pv2InputWatts',0)
            initMyObjectAsNumber( serial + '.permanentWatts',0)
            initMyObjectAsNumber( serial + '.pv1Temp',0)
            initMyObjectAsNumber( serial + '.pv2Temp',0)
            initMyObjectAsNumber( serial + '.batSoc',0)
            initMyObjectAsNumber( serial + '.supplyPriority',0)
            initMyObjectAsNumber( serial + '.batErrCode',0)
            initMyObjectAsNumber(serial + '.upperLimit',0)
        }
        getStatus(serial)
        updatePSWriteables(serial)
    }
    ConfigData.D2M.forEach(device => {
    updateDMWriteables(device.serial)
});
}

function updateDMWriteables(serial) {
    getStatusDelta(serial)
}
function updatePSWriteables(serial) 
{
    updateAC(serial)
    updatePrio(serial)
}
function updateAC(serial) {
    const setAC = toInt(getState(ConfigData.statePath + serial + ".setAC").val)
    const permanentWatts = toInt(getState(ConfigData.statePath + serial + ".permanentWatts").val)
    if (setAC != permanentWatts) {
        logDebug(".setAC changed settimg PermanentWatts for " + serial + " to " +setAC)
        setPermanentWatts(serial,setAC)

    }
}

function initMyObjectAsNumber(myObject, myValue) {
    let debug = ConfigData.Debug
    let myvar = ConfigData.statePath + myObject 
    if(!existsState(myvar)) {
       createState(myvar, myValue, {type: "number"})
       logDebug ("creating object: " + myvar + " as number")
    } else {
      //  logDebug ("anscheinend existiert " + myvar + " schon")
    }
}

function initMyObjectAsBoolean(myObject, myValue) {
    let debug = ConfigData.Debug
    let myvar = ConfigData.statePath + myObject 
    if(!existsState(myvar)) {
       createState(myvar, myValue, {type: "boolean"})
       if (debug) log ("creating object: " + myvar + " as boolean")
    } else {
     //   if (debug) log ("anscheinend existiert " + myvar + " schon")
    }
}

async function main() {
    initMyObjectAsBoolean("regulate",true)
    initMyObjectAsBoolean("Debug",true)
    await getDeviceList();
    updateStatus();

    setInterval(getDeviceList, 60000);
    //logDebug(powerStreamSerials)
    setInterval(distributePower, 5000);
    setInterval(updateStatus,10000)
    logDebug('Skript gestartet');
}

main();
