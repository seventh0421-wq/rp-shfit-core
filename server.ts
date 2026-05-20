import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

// Standard port is 3000
const PORT = 3000;

// Lazy initialize Gemini client to avoid crashes if GEMINI_API_KEY is missing
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not defined. Please add it to your secrets or environment variables.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API router for availability parsing
  app.post("/api/parse-availability", async (req, res) => {
    try {
      const { rawText, slots, roles } = req.body;

      if (!rawText || !rawText.trim()) {
        res.status(400).json({ error: "請提供要解析的文字內容。" });
        return;
      }

      const client = getAiClient();
      
      const prompt = `
你是一位專門協助《最終幻想14》（FF14）RP店主進行店員排班的助手。
請幫我解析以下這段從 Discord / LINE 通訊軟體複製過來的店員排班意願訊息。

排班意願訊息：
"""
${rawText}
"""

目前店裡定義的主角角色（Roles）列表：
${JSON.stringify(roles)}

目前店裡的營業時段（Slots）列表：
${JSON.stringify(slots.map((s: any) => ({ id: s.id, name: `${s.day} ${s.time}` })))}

請遵守以下規則進行解析：
1. 分析排班意願訊息，找出所有提到的店員（Staff Member）。
2. 針對每位店員，抓出他們提及可以或不方便上班的時段（可用 slots 的 id 來對應）。
3. 時段意願評級（status）：
   - 如果店員說「可以、ok、全通、能來、無事」，設為 "available"（可排班）。
   - 如果店員說「都可以但可能晚點、看情況、可備用、可能可」，設為 "maybe"（備用/調劑）。
   - 如果店員說「不行、有宿、有事、請假、要看演出」，設為 "unavailable"（不可排班）。
   - 如果未提及該時段，亦設為 "unavailable" 或不回傳（預設不方便）。
4. 解析店員是否提到了特定角色（例如「我可以當調酒師」、「這天可以當 Host」），並跟「角色列表」進行匹配。
5. 解析店員是否提到他們這週的排班次數上限，例如「最多只挑一次」、「排一班就好」，如果沒有提到，則給予預設值 2。

請將解析結果以 JSON 形式回傳，結構符合下方定義的 JSON Schema。
      `;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              parsedStaff: {
                type: Type.ARRAY,
                description: "解析出來的所有店員排班意願",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: {
                      type: Type.STRING,
                      description: "店員名稱 / RP 角色名"
                    },
                    maxShifts: {
                      type: Type.INTEGER,
                      description: "每週最多排班數。若無說明則設為 2"
                    },
                    roles: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "店員提到可勝任的工作職能（必須匹配角色列表中的角色）"
                    },
                    availabilities: {
                      type: Type.ARRAY,
                      description: "該店員與各個時段的意願配對",
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          slotId: {
                            type: Type.STRING,
                            description: "店裡時段的時間 ID（必須與傳入的 slots 列表中的 id 一致）"
                          },
                          status: {
                            type: Type.STRING,
                            description: "意願狀態：'available'（可排）、'maybe'（備用）、'unavailable'（不可）"
                          },
                          reason: {
                            type: Type.STRING,
                            description: "原因或補充說明，例如：'21:30 後才可以'"
                          }
                        },
                        required: ["slotId", "status"]
                      }
                    }
                  },
                  required: ["name", "maxShifts", "roles", "availabilities"]
                }
              }
            },
            required: ["parsedStaff"]
          }
        }
      });

      const text = response.text || "";
      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error("解析意願出錯:", error);
      res.status(500).json({ error: error.message || "伺服器在解析排班意願時出錯。" });
    }
  });

  // Verify server configuration has Vite and routes in development or production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FF14 Roster Server] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
