# README.md

# Line Webhook App

This project is a webhook application for the LINE Messaging API that receives data from an MQTT broker. It processes sensor data and sends formatted flex messages to the LINE platform.

## Project Structure

```
line-webhook-app
├── src
│   ├── index.ts              # Entry point of the application
│   ├── config
│   │   └── mqtt.ts           # MQTT connection configuration
│   ├── services
│   │   ├── lineService.ts     # Service for sending messages to LINE
│   │   └── mqttService.ts     # Service for handling MQTT connections
│   ├── types
│   │   ├── message.ts         # Interfaces for flex message structure
│   │   └── sensor.ts          # Interface for sensor data structure
│   └── templates
│       └── flexMessage.ts     # Function to generate flex message template
├── package.json               # npm configuration file
├── tsconfig.json              # TypeScript configuration file
└── README.md                  # Project documentation
```

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   ```

2. Navigate to the project directory:
   ```
   cd line-webhook-app
   ```

3. Install the dependencies:
   ```
   npm install
   ```

## Usage

1. Update the MQTT configuration in `src/config/mqtt.ts` with your broker details.
2. Run the application:
   ```
   npm start
   ```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or features.

## License

This project is licensed under the MIT License.