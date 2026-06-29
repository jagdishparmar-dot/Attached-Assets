import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

router.post("/ai/route-plan", async (req, res): Promise<void> => {
  const { addresses, driverName } = req.body as { addresses?: string[]; driverName?: string };

  if (!addresses || addresses.length === 0) {
    res.status(400).json({ error: "addresses array is required" });
    return;
  }

  const numbered = addresses.map((a, i) => `${i + 1}. ${a}`).join("\n");

  const prompt = `You are a logistics route optimizer for Coldverse Supply Chain, a cold-chain delivery company in India.
${driverName ? `Driver name: ${driverName}` : ""}
Plan the most efficient delivery route for the following ${addresses.length} stop${addresses.length !== 1 ? "s" : ""}. Consider traffic patterns, distance, and fuel efficiency.

Delivery stops:
${numbered}

Respond in this exact format (keep it concise and practical for a driver):

🗺️ OPTIMIZED ROUTE ORDER
[List stops in optimal order with stop number → address, e.g. "Stop 1 → 42 MG Road, Mumbai"]

⏱️ TIMING GUIDE
[Estimated time per stop and cumulative time]

💡 DRIVER TIPS
[2-3 practical tips for today's route]

📊 SUMMARY
Total stops: ${addresses.length} | Est. total time: [X hrs Y mins]`;

  const completion = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 700,
  });

  const plan = completion.choices[0]?.message?.content ?? "Unable to generate route plan.";
  res.json({ plan });
});

export default router;
