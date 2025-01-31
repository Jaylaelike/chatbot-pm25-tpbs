const express = require("express");
const line = require("@line/bot-sdk");
const mqtt = require("mqtt");
const app = express();

// LINE channel configuration
const lineConfig = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(lineConfig);

// Create Flex Message with sensor data
function createFlexMessage(data: { pm2_5: any; pm10: any }) {
  const now = new Date().toLocaleString();

  return {
    type: "flex",
    altText: "Air Quality Report",
    contents: {
      type: "bubble",
      hero: {
        type: "image",
        url: "https://media.istockphoto.com/id/1393275788/th/%E0%B8%A3%E0%B8%B9%E0%B8%9B%E0%B8%96%E0%B9%88%E0%B8%B2%E0%B8%A2/%E0%B8%A1%E0%B8%A5%E0%B8%9E%E0%B8%B4%E0%B8%A9%E0%B8%97%E0%B8%B2%E0%B8%87%E0%B8%AD%E0%B8%B2%E0%B8%81%E0%B8%B2%E0%B8%A8%E0%B8%95%E0%B8%A3%E0%B8%A7%E0%B8%88%E0%B8%AA%E0%B8%AD%E0%B8%9A-pm2-5-%E0%B8%97%E0%B8%B5%E0%B9%88%E0%B8%95%E0%B8%B4%E0%B8%94%E0%B8%95%E0%B8%B1%E0%B9%89%E0%B8%87%E0%B9%83%E0%B8%99%E0%B8%AA%E0%B8%A7%E0%B8%99%E0%B8%AA%E0%B8%B2%E0%B8%98%E0%B8%B2%E0%B8%A3%E0%B8%93%E0%B8%B0.jpg?s=1024x1024&w=is&k=20&c=NP6yjD5wHJg-43vck1kbFQo_MD-TrC7GdK36WsDmZA8=",
        size: "full",
        aspectRatio: "20:13",
        aspectMode: "cover",
        action: {
          type: "uri",
          uri: "https://line.me/",
        },
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "text",
            text: "Air Quality Report",
            size: "xl",
            weight: "bold",
          },
          {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "baseline",
                contents: [
                  {
                    type: "text",
                    text: "PM2.5",
                    weight: "bold",
                    margin: "sm",
                    flex: 0,
                  },
                  {
                    type: "text",
                    text: `${data.pm2_5} ug/m^2`,
                    size: "sm",
                    align: "end",
                    color: "#aaaaaa",
                  },
                ],
              },
              {
                type: "box",
                layout: "baseline",
                contents: [
                  {
                    type: "text",
                    text: "PM10",
                    weight: "bold",
                    margin: "sm",
                    flex: 0,
                  },
                  {
                    type: "text",
                    text: `${data.pm10} ug/m^2`,
                    size: "sm",
                    align: "end",
                    color: "#aaaaaa",
                  },
                ],
              },
            ],
          },
          {
            type: "text",
            text: now,
            wrap: true,
            color: "#aaaaaa",
            size: "xxs",
          },
        ],
      },
    },
  };
}

// LINE webhook endpoint
app.post(
  "/webhook",
  line.middleware(lineConfig),
  async (
    req: { body: { events: any } },
    res: {
      json: (arg0: { success: boolean }) => void;
      status: (arg0: number) => {
        (): any;
        new (): any;
        end: { (): void; new (): any };
      };
    }
  ) => {
    try {
      const mqttClient = mqtt.connect("ws://172.16.202.63:8083/mqtt", {
        username: "admin",
        password: "public",
        clientId: "emqx_" + Math.random().toString(16).substr(2, 8),
      });

      const mqttMessagePromise = new Promise((resolve, reject) => {
        mqttClient.on("connect", () => {
          console.log("Connected to MQTT broker");
          mqttClient.subscribe("sensor/data");
          console.log("Subscribed to sensor/data topic");
        });

        mqttClient.on(
          "message",
          async (topic: any, message: { toString: () => string }) => {
            try {
              const data = JSON.parse(message.toString());
              console.log("Received MQTT data:", data);

              const flexMessage = createFlexMessage(data);
              console.log("Created Flex Message:", flexMessage);

              // Get the user ID from the event
              const events = req.body.events;
              if (events && events.length > 0) {
                const userId = events[0].source.userId;
                if (userId) {
                  await client.pushMessage(userId, flexMessage);
                  console.log("Message sent to user:", userId);
                }
              }

              resolve(true);
            } catch (error) {
              console.error("Error processing MQTT message:", error);
              reject(error);
            } finally {
              mqttClient.end();
              console.log("MQTT connection closed");
            }
          }
        );

        mqttClient.on("error", (error: any) => {
          console.error("MQTT client error:", error);
          reject(error);
        });
      });

      const events = req.body.events;
      console.log("Processing events:", events);

      await Promise.all([mqttMessagePromise, ...events.map(handleEvent)]);
      console.log("All events processed successfully");

      res.json({ success: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).end();
    }
  }
);

// Handle LINE events reply message to user
async function handleEvent(event: {
  [x: string]: any;
  type: string;
  message: {
    [x: string]: any;
    type: string;
  };
}) {
  if (event.type !== "message" || event.message.type !== "text") {
    return null;
  }

  // Send a text message acknowledging the user's message
  const userId = event.source.userId;
  if (userId) {
    await client.pushMessage(userId, {
      type: "text",
      text: "ได้เลยค่ะ หนูจะรายงานค่าฝุ่นในช่วงเวลานี้ใน3 ... 2 ... 1 ....",
    });
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
