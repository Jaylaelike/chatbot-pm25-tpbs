const express = require("express");
const line = require("@line/bot-sdk");
const mqtt = require("mqtt");
const app = express();



// LINE channel configuration
const lineConfig = {
  channelAccessToken:
    "FcXxzf11t/3W8rDZkeP83c/Ul0llpAcLG/0zMLzp1b5MFdsvLXq0fo18UN6TfiKdIX+Qd1SgLL6eNZ4ZoiXr5r6FMlZkiYv7j9E56XwJJ4J7/SUaXVTyS7FxXwKx4dPhJyVQY4SsM2tK5i+8F9k3xQdB04t89/1O/w1cDnyilFU=",
  channelSecret: "8095082a08f2161bd9e28fec24d73b9f",
};

const client = new line.Client(lineConfig);

// Create Flex Message with sensor data
function createFlexMessage(data) {
  const now = new Date().toLocaleString();
  return {
    type: "flex",
    altText: "Air Quality Report",
    contents: {
      type: "bubble",
      hero: {
        type: "image",
        url: "https://res.cloudinary.com/satjay/image/upload/v1738324666/face-pm25/fdfitpv7adhtwqlmkx6g.png",
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


// const lineConfig = {
//   channelAccessToken:
//     "FcXxzf11t/3W8rDZkeP83c/Ul0llpAcLG/0zMLzp1b5MFdsvLXq0fo18UN6TfiKdIX+Qd1SgLL6eNZ4ZoiXr5r6FMlZkiYv7j9E56XwJJ4J7/SUaXVTyS7FxXwKx4dPhJyVQY4SsM2tK5i+8F9k3xQdB04t89/1O/w1cDnyilFU=",
//   channelSecret: "8095082a08f2161bd9e28fec24d73b9f",
// };

// const client = new line.Client(lineConfig);

// // Create Flex Message with sensor data
// function createFlexMessage(data: { pm2_5: any; pm10: any }) {
//   const now = new Date().toLocaleString();

//   return {
//     type: "flex",
//     altText: "Air Quality Report",
//     contents: {
//       type: "bubble",
//       hero: {
//         type: "image",
//         url: "https://res.cloudinary.com/satjay/image/upload/v1738324666/face-pm25/fdfitpv7adhtwqlmkx6g.png",
//         size: "full",
//         aspectRatio: "20:13",
//         aspectMode: "cover",
//         action: {
//           type: "uri",
//           uri: "https://line.me/",
//         },
//       },
//       body: {
//         type: "box",
//         layout: "vertical",
//         spacing: "md",
//         contents: [
//           {
//             type: "text",
//             text: "Air Quality Report",
//             size: "xl",
//             weight: "bold",
//           },
//           {
//             type: "box",
//             layout: "vertical",
//             spacing: "sm",
//             contents: [
//               {
//                 type: "box",
//                 layout: "baseline",
//                 contents: [
//                   {
//                     type: "text",
//                     text: "PM2.5",
//                     weight: "bold",
//                     margin: "sm",
//                     flex: 0,
//                   },
//                   {
//                     type: "text",
//                     text: `${data.pm2_5} ug/m^2`,
//                     size: "sm",
//                     align: "end",
//                     color: "#aaaaaa",
//                   },
//                 ],
//               },
//               {
//                 type: "box",
//                 layout: "baseline",
//                 contents: [
//                   {
//                     type: "text",
//                     text: "PM10",
//                     weight: "bold",
//                     margin: "sm",
//                     flex: 0,
//                   },
//                   {
//                     type: "text",
//                     text: `${data.pm10} ug/m^2`,
//                     size: "sm",
//                     align: "end",
//                     color: "#aaaaaa",
//                   },
//                 ],
//               },
//             ],
//           },
//           {
//             type: "text",
//             text: now,
//             wrap: true,
//             color: "#aaaaaa",
//             size: "xxs",
//           },
//         ],
//       },
//     },
//   };
// }

// // LINE webhook endpoint
// app.post(
//   "/webhook",
//   line.middleware(lineConfig),
//   async (
//     req: { body: { events: any } },
//     res: {
//       json: (arg0: { success: boolean }) => void;
//       status: (arg0: number) => {
//         (): any;
//         new (): any;
//         end: { (): void; new (): any };
//       };
//     }
//   ) => {
//     try {
//       const mqttClient = mqtt.connect("ws://172.16.202.63:8083/mqtt", {
//         username: "admin",
//         password: "public",
//         clientId: "emqx_" + Math.random().toString(16).substr(2, 8),
//       });

//       const mqttMessagePromise = new Promise((resolve, reject) => {
//         mqttClient.on("connect", () => {
//           console.log("Connected to MQTT broker");
//           mqttClient.subscribe("sensor/data");
//           console.log("Subscribed to sensor/data topic");
//         });

//         mqttClient.on(
//           "message",
//           async (topic: any, message: { toString: () => string }) => {
//             try {
//               const data = JSON.parse(message.toString());
//               console.log("Received MQTT data:", data);

//               const flexMessage = createFlexMessage(data);
//               console.log("Created Flex Message:", flexMessage);

//               // Get the user ID from the event
//               const events = req.body.events;
//               if (events && events.length > 0) {
//                 const userId = events[0].source.userId;
//                 if (userId) {
//                   await client.pushMessage(userId, flexMessage);
//                   console.log("Message sent to user:", userId);
//                 }
//               }

//               resolve(true);
//             } catch (error) {
//               console.error("Error processing MQTT message:", error);
//               reject(error);
//             } finally {
//               mqttClient.end();
//               console.log("MQTT connection closed");
//             }
//           }
//         );

//         mqttClient.on("error", (error: any) => {
//           console.error("MQTT client error:", error);
//           reject(error);
//         });
//       });

//       const events = req.body.events;
//       console.log("Processing events:", events);

//       await Promise.all([mqttMessagePromise, ...events.map(handleEvent)]);
//       console.log("All events processed successfully");

//       res.json({ success: true });
//     } catch (error) {
//       console.error("Webhook error:", error);
//       res.status(500).end();
//     }
//   }
// );


// async function handleEvent(event: {
//   [x: string]: any;
//   type: string;
//   message: {
//     [x: string]: any;
//     type: string;
//     text?: string;
//   };
// }) {
//   if (event.type !== "message") {
//     return null;
//   }

//   const userId = event.source.userId;
//   if (!userId) return null;

//   switch (event.message.type) {
//     case "text":
//       if (event.message.text === "ค่าฝุ่นเป็นตอนนี้") {
//         await client.pushMessage(userId, {
//           type: "text",
//           text: "ได้เลยค่ะ หนูจะรายงานค่าฝุ่นในช่วงเวลานี้ใน3 ... 2 ... 1 ....",
//         });
//         // Create and send flex message for air quality data
//         const mqttClient = mqtt.connect("mqtt://broker.hivemq.com");
//         const data = await new Promise((resolve) => {
//           mqttClient.subscribe("air-quality");
//           mqttClient.on("message", (topic, message) => {
//             const sensorData = JSON.parse(message.toString());
//             resolve(sensorData);
//             mqttClient.end();
//           });
//         });
//         const flexMessage = createFlexMessage(data as { pm2_5: any; pm10: any });
//         await client.pushMessage(userId, flexMessage);
//       } else {
//         // Only send the error message without creating or sending flex message
//         await client.pushMessage(userId, {
//           type: "text",
//           text: "ขอโทษค่ะ หนูไม่เข้าใจคำสั่งนี้ กรุณาพิมพ์ 'ค่าฝุ่นเป็นตอนนี้' เพื่อดูรายงานค่าฝุ่น"
//         });
//         return null; // Exit the function early
//       }
//       break;
    
//     // Rest of the cases remain unchanged
//     case "sticker":
//       await client.pushMessage(userId, {
//         type: "sticker",
//         packageId: "11537",
//         stickerId: "52002734"
//       });
//       break;

//     case "location":
//       await client.pushMessage(userId, {
//         type: "location",
//         title: "My Location",
//         address: event.message.address,
//         latitude: event.message.latitude,
//         longitude: event.message.longitude
//       });
//       break;
//   }
// }

// const PORT = process.env.PORT || 3001;
// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });
