const express = require("express");
const line = require("@line/bot-sdk");
const mqtt = require("mqtt");
const app = express();

// LINE channel configuration
const lineConfig = {
  channelAccessToken:
    "xxx",
  channelSecret: "xxx",
};

const client = new line.Client(lineConfig);

const getHappinessIcon = (pm25Level: number) => {
  if (pm25Level <= 12)
    return "https://res.cloudinary.com/satjay/image/upload/v1738324665/face-pm25/jijtdxqdaw9i4c0fn82m.png";
  if (pm25Level <= 35.4)
    return "https://res.cloudinary.com/satjay/image/upload/v1738324666/face-pm25/myz0sukbdlvso20mabuj.png";
  if (pm25Level <= 55.4)
    return "https://res.cloudinary.com/satjay/image/upload/v1738324666/face-pm25/cf8uoxwsnggo9gflc8rv.png";
  if (pm25Level <= 150.4)
    return "https://res.cloudinary.com/satjay/image/upload/v1738324666/face-pm25/fdfitpv7adhtwqlmkx6g.png";
  return "https://res.cloudinary.com/satjay/image/upload/v1738324667/face-pm25/dwjeydey3lvt8gvwdqkd.png";
};

// Create Flex Message with sensor data
function createFlexMessage(data) {
  const now = new Date().toLocaleString();
  const heroImageUrl = getHappinessIcon(data.pm2_5);
  return {
    type: "flex",
    altText: "Air Quality Report",
    contents: {
      type: "bubble",
      hero: {
        type: "image",
        url: heroImageUrl,
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

// Function to get sensor data from MQTT
async function getSensorData() {
  console.log("Starting getSensorData function");
  return new Promise((resolve, reject) => {
    console.log("Initializing MQTT connection...");
    const mqttClient = mqtt.connect("ws://172.16.202.63:8083/mqtt", {
      username: "admin",
      password: "public",
      clientId: "emqx_" + Math.random().toString(16).substr(2, 8),
    });

    // Set a timeout to prevent hanging
    console.log("Setting connection timeout...");
    const timeout = setTimeout(() => {
      console.log("Connection timeout reached");
      mqttClient.end();
      reject(new Error("MQTT connection timeout"));
    }, 10000);

    mqttClient.on("connect", () => {
      console.log("Successfully connected to MQTT broker");
      console.log("Subscribing to sensor/data topic...");
      mqttClient.subscribe("sensor/data");
    });

    mqttClient.on("message", (topic, message) => {
      console.log("Received message from topic:", topic);
      clearTimeout(timeout);
      try {
        console.log("Parsing message data...");
        const data = JSON.parse(message.toString());
        console.log("Parsed sensor data:", data);
        mqttClient.end();
        console.log("MQTT connection closed");
        resolve(data);
      } catch (error) {
        console.error("Error parsing message:", error);
        mqttClient.end();
        reject(error);
      }
    });

    mqttClient.on("error", (error) => {
      console.error("MQTT connection error:", error);
      clearTimeout(timeout);
      mqttClient.end();
      reject(error);
    });
  });
}

// Handle individual events
async function handleEvent(event) {
  if (event.type !== "message" || !event.source.userId) {
    return null;
  }

  const userId = event.source.userId;

  switch (event.message.type) {
    case "text":
      if (event.message.text === "ค่าฝุ่นเป็นตอนนี้") {
        try {
          // Send initial response
          await client.pushMessage(userId, {
            type: "text",
            text: "ได้เลยค่ะ หนูจะรายงานค่าฝุ่นในช่วงเวลานี้ใน3 ... 2 ... 1 ....",
          });

          // Get sensor data
          const data = await getSensorData();
          console.log("Received sensor data:", data);

          // Create and send flex message
          const flexMessage = createFlexMessage(data);
          await client.pushMessage(userId, flexMessage);
          console.log("Flex message sent to user:", userId);
        } catch (error) {
          console.error("Error getting sensor data:", error);
          await client.pushMessage(userId, {
            type: "text",
            text: "ขออภัยค่ะ ไม่สามารถรับข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้งในภายหลัง",
          });
        }
      } else {
        await client.pushMessage(userId, {
          type: "text",
          text: "ขอโทษค่ะ หนูไม่เข้าใจคำสั่งนี้ กรุณาพิมพ์ 'ค่าฝุ่นเป็นตอนนี้' เพื่อดูรายงานค่าฝุ่น",
        });
      }
      break;

    case "sticker":
      await client.pushMessage(userId, {
        type: "sticker",
        packageId: "11537",
        stickerId: "52002734",
      });
      break;

    case "location":
      await client.pushMessage(userId, {
        type: "location",
        title: "My Location",
        address: event.message.address,
        latitude: event.message.latitude,
        longitude: event.message.longitude,
      });
      break;
  }
}

// Webhook endpoint
app.post("/webhook", line.middleware(lineConfig), async (req, res) => {
  try {
    await Promise.all(req.body.events.map(handleEvent));
    res.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).end();
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
