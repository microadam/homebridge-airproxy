# homebridge-airproxy
AirProxy plugin for homebridge: https://github.com/nfarina/homebridge

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-airproxy
3. Update your configuration file. See the sample below.

# Configuration

Configuration sample:

 ```
"platforms": [
        {
          "platform": "AirProxy",
          "host" : "http://127.0.0.1:7878"
        }
    ]

```

Host is the location (ip and port) of the AirProxy websocket server
