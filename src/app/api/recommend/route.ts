import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { retrieveCatalogContext } from "@/lib/ai/catalog-retriever";

export const maxDuration = 60;

export async function POST(request: Request) {
  let userMessage = "";

  try {
    const body = await request.json();
    const { systemPrompt, conversationHistory } = body;
    userMessage = body.userMessage || "";

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "your-api-key-here") {
      console.log("[AI] No API key set, using mock response");
      return NextResponse.json(getMockResponse(userMessage));
    }
    console.log("[AI] Using Anthropic API");
    console.log("[AI] System prompt size:", systemPrompt?.length || 0, "chars");
    console.log("[AI] Conversation history length:", conversationHistory?.length || 0);
    console.log("[AI] User message (last 200 chars):", userMessage.slice(-200));
    if (conversationHistory?.length > 0) {
      console.log("[AI] History roles:", conversationHistory.map((m: { role: string }) => m.role).join(" → "));
    }

    const anthropic = new Anthropic({ apiKey });

    // Retrieve relevant catalog sections — use full conversation for context
    const allText = [
      ...(conversationHistory || []).map((m: { content: string }) => m.content),
      userMessage,
    ].join(" ");
    const catalogContext = retrieveCatalogContext(allText, null);
    const fullSystemPrompt = systemPrompt + catalogContext;

    // Build messages — ensure alternating user/assistant pattern
    const messages: Anthropic.MessageParam[] = [];
    const historyMsgs = (conversationHistory || []) as { role: string; content: string }[];

    for (const msg of historyMsgs) {
      const role = msg.role as "user" | "assistant";
      // Anthropic requires alternating roles — merge consecutive same-role messages
      if (messages.length > 0 && messages[messages.length - 1].role === role) {
        messages[messages.length - 1].content += "\n\n" + msg.content;
      } else {
        messages.push({ role, content: msg.content });
      }
    }

    // Add current user message
    if (messages.length > 0 && messages[messages.length - 1].role === "user") {
      messages[messages.length - 1].content += "\n\n" + userMessage;
    } else {
      messages.push({ role: "user", content: userMessage });
    }

    console.log("[AI] Final message count:", messages.length, "roles:", messages.map(m => m.role).join(" → "));

    console.log("[AI] Full system prompt size:", fullSystemPrompt.length, "chars (~" + Math.round(fullSystemPrompt.length/4) + " tokens)");
    console.log("[AI] Sending to Anthropic...");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: fullSystemPrompt,
      messages,
    });

    console.log("[AI] Response received, tokens used:", response.usage);

    const textContent = response.content.find(
      (block) => block.type === "text"
    );
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from AI");
    }

    const text = textContent.text;
    console.log("[AI] Raw response length:", text.length);

    // Try multiple JSON extraction strategies
    let parsed: unknown = null;

    // 1. Try markdown code block: ```json ... ```
    const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      try {
        parsed = JSON.parse(codeBlockMatch[1].trim());
      } catch { /* try next */ }
    }

    // 2. Try raw JSON object
    if (!parsed) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch { /* try next */ }
      }
    }

    // 3. Try the entire response as JSON
    if (!parsed) {
      try {
        parsed = JSON.parse(text.trim());
      } catch { /* give up */ }
    }

    if (!parsed) {
      console.error("[AI] Could not extract JSON from response:", text.substring(0, 500));
      throw new Error("Could not extract JSON from AI response");
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("[AI] Recommendation error:", error);
    // Fall back to mock — pass ALL conversation text so mock can detect machine type
    const allText = [
      ...((() => { try { return JSON.parse(JSON.stringify([])); } catch { return []; } })()),
      userMessage,
    ].join(" ");
    console.error("[AI] Falling back to mock response for:", allText.substring(0, 100));
    return NextResponse.json(getMockResponse(allText), { status: 200 });
  }
}

/**
 * Mock responses — ARCHITECTURE ONLY (no motor/drive article numbers).
 * Motors, modules, line modules, and cables are sized deterministically
 * from user specs by src/lib/sizing.
 */
function getMockResponse(userMessage: string) {
  const msg = userMessage.toLowerCase();

  const is5Axis =
    msg.includes("5-axis") || msg.includes("5 axis") || msg.includes("5axis");
  const isLathe =
    msg.includes("lathe") || msg.includes("turning") || msg.includes("cnc lathe");
  const isGrinding = msg.includes("grind");
  const isLaser = msg.includes("laser");
  const isRobot = msg.includes("robot");
  const isMillTurn = msg.includes("mill-turn") || msg.includes("mill turn");

  // ─── 5-AXIS MACHINING CENTER ───
  if (is5Axis) {
    return {
      controlUnit: { id: "NCU_1750", reason: "5-axis simultaneous requires NCU 1750+ for Dynamics 5 Axis (S43)" },
      cncSoftware: { variant: "full_scope", swVersion: "6.25 SP1" },
      technologyPackages: [{ id: "S43", reason: "Dynamics 5 Axis includes M30, M48, P18, S07, S17, S62, P28 and ShopMill" }],
      additionalOptions: [
        { orderCode: "A03", name: "3 additional axes/spindles", quantity: 3, reason: "6 total (5 axes + 1 spindle) - 3 base = 3 additional licenses" },
      ],
      driveArchitecture: { family: "S120_booksize", feedAxisCount: 5, spindleCount: 1, preferActiveLineModule: true, highSpeedSpindle: true, reason: "5-axis HSC benefits from Active Line Module (regeneration) and high-speed spindle" },
      hmi: { type: "thin_client", panelSizeInch: 19, reason: "19\" Thin Client for NCU cabinet-based setup" },
      safety: { options: ["S60", "S61"], reason: "Extended safety recommended for 5-axis: S60 + S61" },
      totalAxes: 6,
      totalChannels: 1,
      notes: [
        "Base scope includes 3 axes — only 3 additional licenses needed for 6 total",
        "Full scope CNC software required (S43 not available in export version)",
        "Motors and drives are sized automatically from your moving-mass and spindle power requirements",
      ],
      estimatedComplexity: "advanced",
    };
  }

  // ─── CNC LATHE ───
  if (isLathe) {
    return {
      controlUnit: { id: "NCU_1740", reason: "3 axes/spindles within NCU 1740 base scope" },
      cncSoftware: { variant: "export", swVersion: "6.25 SP1" },
      technologyPackages: [{ id: "S41", reason: "Dynamics Operate includes ShopTurn for conversational turning" }],
      additionalOptions: [],
      driveArchitecture: { family: "S120_booksize", feedAxisCount: 2, spindleCount: 1, preferActiveLineModule: false, highSpeedSpindle: false, reason: "Standard turning: 2 linear axes + 1 main spindle; Smart Line Module sufficient" },
      hmi: { type: "thin_client", panelSizeInch: 15, reason: "15\" Thin Client — standard for lathe operation" },
      safety: { options: [], reason: "Basic safety (STO, SS1, SBC) sufficient for simple CNC lathe" },
      totalAxes: 3,
      totalChannels: 1,
      notes: [
        "2 axes + 1 spindle = 3 total — fully covered by base scope, no additional axis licenses",
        "Add C-axis for milling on lathe (1 extra axis license needed)",
      ],
      estimatedComplexity: "basic",
    };
  }

  // ─── GRINDING ───
  if (isGrinding) {
    return {
      controlUnit: { id: "NCU_1740", reason: "4 axes/spindles within NCU 1740 capacity" },
      cncSoftware: { variant: "export", swVersion: "6.25 SP1" },
      technologyPackages: [],
      additionalOptions: [
        { orderCode: "A01", name: "1 additional axis/spindle", quantity: 1, reason: "4 total (3 axes + 1 wheel spindle) - 3 base" },
        { orderCode: "M34", name: "Grinding oscillation functions", quantity: 1, reason: "Block-related, modal and asynchronous oscillation" },
        { orderCode: "S35", name: "Grinding Advanced", quantity: 1, reason: "Extended grinding functions including dressing cycles" },
      ],
      driveArchitecture: { family: "S120_booksize", feedAxisCount: 3, spindleCount: 1, preferActiveLineModule: false, highSpeedSpindle: false, reason: "3 feed axes + wheel spindle, Smart Line Module" },
      hmi: { type: "thin_client", panelSizeInch: 15, reason: "15\" Thin Client for grinding operation" },
      safety: { options: [], reason: "Basic safety sufficient for standard grinding machine" },
      totalAxes: 4,
      totalChannels: 1,
      notes: ["3 axes + 1 spindle = 4 total — 1 additional axis license needed beyond base 3"],
      estimatedComplexity: "standard",
    };
  }

  // ─── LASER CUTTING ───
  if (isLaser) {
    return {
      controlUnit: { id: "NCU_1740", reason: "3 axes within NCU 1740 base scope" },
      cncSoftware: { variant: "export", swVersion: "6.25 SP1" },
      technologyPackages: [],
      additionalOptions: [
        { orderCode: "M37", name: "Laser power control", quantity: 1, reason: "Path velocity-dependent analog output for laser power" },
        { orderCode: "M38", name: "Laser switching high-speed", quantity: 1, reason: "High-speed laser on/off switching signals" },
        { orderCode: "S07", name: "Advanced Surface", quantity: 1, reason: "Smooth path control for quality laser cuts" },
        { orderCode: "M43", name: "Cross-mode actions ASUB", quantity: 1, reason: "Required for synchronized laser control" },
      ],
      driveArchitecture: { family: "S120_booksize", feedAxisCount: 3, spindleCount: 0, preferActiveLineModule: true, highSpeedSpindle: false, reason: "High-dynamic feed axes, Active Line Module for regeneration during rapid direction changes" },
      hmi: { type: "thin_client", panelSizeInch: 19, reason: "19\" for laser program visualization" },
      safety: { options: ["S60", "S61"], reason: "Extended safety for laser: safe speed during door-open operation" },
      totalAxes: 3,
      totalChannels: 1,
      notes: ["3 axes = base scope — no additional axis licenses", "Laser source is external to SINUMERIK scope"],
      estimatedComplexity: "standard",
    };
  }

  // ─── ROBOT CELL ───
  if (isRobot) {
    return {
      controlUnit: { id: "NCU_1750", reason: "6-axis robot requires NCU 1750 for multi-axis interpolation" },
      cncSoftware: { variant: "full_scope", swVersion: "6.25 SP1" },
      technologyPackages: [],
      additionalOptions: [
        { orderCode: "A03", name: "3 additional axes", quantity: 3, reason: "6 robot axes - 3 base = 3 additional" },
        { orderCode: "M15", name: "Multi-axis interpolation >4 axes", quantity: 1, reason: "Required for 6-axis robot interpolation" },
        { orderCode: "R05", name: "Run MyRobot /Direct Control ROBX AR", quantity: 1, reason: "Articulated arm robot transformation" },
        { orderCode: "M43", name: "Cross-mode actions ASUB", quantity: 1, reason: "Required for robot operation" },
        { orderCode: "S00", name: "SINUMERIK Operate /NCU", quantity: 1, reason: "Required for robot HMI" },
      ],
      driveArchitecture: { family: "S120_booksize", feedAxisCount: 6, spindleCount: 0, preferActiveLineModule: true, highSpeedSpindle: false, reason: "6 joint drives with Active Line Module for regeneration" },
      hmi: { type: "thin_client", panelSizeInch: 15, reason: "15\" Thin Client for robot teach/operate" },
      safety: { options: ["S60", "K06"], reason: "S60 enables F-PLC, K06 = 6 safe axes" },
      totalAxes: 6,
      totalChannels: 1,
      notes: ["6 axes - 3 base = 3 additional axis licenses needed", "Full scope CNC software required"],
      estimatedComplexity: "complex",
    };
  }

  // ─── MILL-TURN CENTER ───
  if (isMillTurn) {
    return {
      controlUnit: { id: "NCU_1750", reason: "Mill-turn with 7 axes/spindles and 2 channels" },
      cncSoftware: { variant: "full_scope", swVersion: "6.25 SP1" },
      technologyPackages: [{ id: "S41", reason: "Dynamics Operate for ShopTurn/ShopMill programming" }],
      additionalOptions: [
        { orderCode: "A04", name: "4 additional axes/spindles", quantity: 4, reason: "7 total - 3 base = 4 additional" },
        { orderCode: "C11", name: "Additional machining channel", quantity: 1, reason: "2nd channel for simultaneous turning + milling" },
        { orderCode: "M30", name: "Machining package 5 axes", quantity: 1, reason: "B-axis milling head with 5-axis capability" },
        { orderCode: "M43", name: "Cross-mode actions ASUB", quantity: 1, reason: "Required for multi-channel synchronized operation" },
      ],
      driveArchitecture: { family: "S120_booksize", feedAxisCount: 5, spindleCount: 2, preferActiveLineModule: true, highSpeedSpindle: false, reason: "Dual-spindle mill-turn, Active Line Module" },
      hmi: { type: "thin_client", panelSizeInch: 19, reason: "19\" for complex mill-turn programming" },
      safety: { options: ["S60", "S61"], reason: "Extended safety with S60 + S61 for production mill-turn" },
      totalAxes: 7,
      totalChannels: 2,
      notes: ["7 total axes/spindles - 3 base = 4 additional licenses needed", "Full scope required for M30"],
      estimatedComplexity: "advanced",
    };
  }

  // ─── DEFAULT: 3-AXIS MILLING CENTER ───
  return {
    controlUnit: { id: "NCU_1740", reason: "4 axes/spindles within NCU 1740 capacity" },
    cncSoftware: { variant: "export", swVersion: "6.25 SP1" },
    technologyPackages: [{ id: "S42", reason: "Dynamics 3 Axis Milling includes Advanced/Top Surface, measuring cycles, ShopMill" }],
    additionalOptions: [{ orderCode: "A01", name: "1 additional axis/spindle", quantity: 1, reason: "4 total - 3 base = 1 additional license" }],
    driveArchitecture: { family: "S120_booksize", feedAxisCount: 3, spindleCount: 1, preferActiveLineModule: false, highSpeedSpindle: false, reason: "Standard 3-axis mill: Smart Line Module, conventional spindle" },
    hmi: { type: "thin_client", panelSizeInch: 15, reason: "15\" Thin Client for standard milling" },
    safety: { options: [], reason: "Basic safety (STO, SS1, SBC) sufficient" },
    totalAxes: 4,
    totalChannels: 1,
    notes: ["3 axes + 1 spindle = 4 total — 1 additional axis license beyond base 3"],
    estimatedComplexity: "standard",
  };
}
