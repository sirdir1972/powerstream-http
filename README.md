# ioBroker EcoFlow API Control Script

This script is designed to control and monitor EcoFlow PowerStream and Delta 2 Max devices using the EcoFlow HTTP API. It allows direct API communication for setting parameters like charging power and USB output, and it integrates tightly with ioBroker to make device data available and configurable.

## Features

- Communication with EcoFlow devices via the official API
- Control of:
  - PowerStream inverters
  - Delta 2 Max batteries
- Ability to:
  - Set USB output state
  - Configure slow charging watts
  - Set permanent AC output power
  - Set supply priority (grid vs solar)
- Auto-discovery of devices
- Live updating of ioBroker states
- Dynamic power distribution based on battery SoC and actual power demand
- Custom ignore list for selected serial numbers
- Configurable quiet hours (`DoSleepFrom`, `DoSleepTo`)

## Requirements

- ioBroker with JavaScript adapter
- EcoFlow developer access key and secret
- At least one EcoFlow device

## Configuration

Edit the `ConfigData` block in the script:

```js
var ConfigData = {
    PSIgnore: [{ serial : ''}],              // serial numbers to ignore
    D2M: [ { serial : ''}],                  // list of Delta 2 Max devices
    statePath: "0_userdata.0.ecoflow_public_api.", // ioBroker state prefix
    demandState: "0_userdata.0.sumpower.actualDemand", // ioBroker object holding demand in watts
    DoSleepFrom: 24,                         // script sleeps from this hour
    DoSleepTo: 8                             // script resumes at this hour
};
```

Also set your API credentials:

```js
const key = 'YOUR SECRET KEY';
const secret = 'YOUR SECRET';
```

## ioBroker Integration

This script will create and update the following types of states:

- Device data (e.g. `batSoc`, `pv1InputWatts`, `permanentWatts`)
- Writeable states (e.g. `setAC`, `setSupplyPriority`, `USB`) for controlling devices
- `regulate` → toggles automatic power distribution logic
- `Debug` → enable/disable detailed logging

## How Power Distribution Works

Every few seconds, the script:

- Retrieves current power demand (from `demandState`)
- Collects battery SoC from all active PowerStream devices
- Distributes available power proportionally based on battery state
- Ensures each device's AC power is updated only when needed

## Custom Commands

- `setUSB(serial, onoff)` — enable/disable USB output on Delta 2 Max
- `setSlowChgWatts(serial, watts)` — set charging speed
- `setPermanentWatts(serial, watts)` — configure output watts
- `setPrio(serial, prio)` — set supply priority (0 or 1)

## Notes

- Values are rounded to nearest 10W steps
- Max allowed power per device is capped at 8000W
- The script runs independently of MQTT and does not require it

## License

(c) 2025 sirdir  
Use and modify freely for personal or non-commercial use.