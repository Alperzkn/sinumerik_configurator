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
 * Mock responses with CORRECT domain knowledge:
 * - Base scope includes 3 axes/spindles
 * - S60 only when extended safety needed
 * - Proper MLFB codes
 * - Correct quantities
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
  // 5 linear/rotary + 1 spindle = 6 total axes. Base=3, so 3 extra needed.
  if (is5Axis) {
    return {
      controlUnit: {
        id: "NCU_1750",
        reason: "5-axis simultaneous requires NCU 1750+ for Dynamics 5 Axis (S43)",
      },
      cncSoftware: { variant: "full_scope", swVersion: "6.25 SP1" },
      technologyPackages: [
        { id: "S43", reason: "Dynamics 5 Axis includes M30, M48, P18, S07, S17, S62, P28 and all ShopMill functions" },
      ],
      additionalOptions: [
        { orderCode: "A03", name: "3 additional axes/spindles", quantity: 3, reason: "6 total (5 axes + 1 spindle) - 3 base = 3 additional licenses" },
      ],
      drives: {
        mainFamily: "S120_booksize",
        feedMotorModules: 5,
        spindleMotorModules: 1,
        lineModule: "Active Line Module 36kW",
        lineModuleArticle: "6SL3130-7TE23-6AA3",
        feedMotorModuleArticle: "6SL3120-1TE21-0AD0",
        spindleMotorModuleArticle: "6SL3120-1TE23-0AD0",
        reason: "S120 booksize: 5x 9A Motor Modules (feed) + 1x 30A Motor Module (spindle) + Active Line Module 36kW + Interface Module 6SL3100-0BE23-6AB0",
      },
      motors: {
        feedMotors: "SIMOTICS S-1FT7",
        feedMotorArticle: "1FT7064-5AF71-1DA1",
        spindleMotors: "SIMOTICS M-1PH8",
        spindleMotorArticle: "1PH8133-1DF10-0LA1",
        reason: "1FT7 SH63 9Nm@3000rpm servo motors for feed axes, 1PH8 SH132 11kW@1500rpm for spindle",
      },
      hmi: { type: "thin_client", model: 'ITC1900 V3 19"', reason: "19\" Thin Client for NCU cabinet-based setup" },
      mcp: { model: "MCP 1900", articleNumber: "6FC5303-0AP02-0AA0", reason: "19\" Machine Control Panel matching ITC1900 panel size" },
      safety: {
        options: ["S60", "S61"],
        reason: "Extended safety recommended for 5-axis: S60 enables F-PLC, S61 covers all axis monitoring",
      },
      totalAxes: 6,
      totalChannels: 1,
      notes: [
        "Base scope includes 3 axes — only 3 additional licenses needed for 6 total",
        "Full scope CNC software required (S43 not available in export version)",
        "Feed motors: 1FT7064-5AF71-1DA1 (SH63, 9Nm, 3000rpm) → Motor Module 6SL3120-1TE21-0AD0 (9A) per axis",
        "Spindle motor: 1PH8133-1DF10-0LA1 (SH132, 11kW, 1500rpm) → Motor Module 6SL3120-1TE24-5AC0 (45A)",
        "Line Module: Active 36kW 6SL3130-7TE23-6AA3 + Interface 6SL3100-0BE23-6AB0",
        "NCU 1760 recommended for HSC/mold making applications",
      ],
      estimatedComplexity: "advanced",
    };
  }

  // ─── CNC LATHE ───
  // 2 axes (X, Z) + 1 spindle = 3 total. Base=3, so NO extra axes needed.
  if (isLathe) {
    return {
      controlUnit: {
        id: "NCU_1740",
        reason: "3 axes/spindles within NCU 1740 base scope (20 max)",
      },
      cncSoftware: { variant: "export", swVersion: "6.25 SP1" },
      technologyPackages: [
        { id: "S41", reason: "Dynamics Operate includes ShopTurn for conversational turning programming" },
      ],
      additionalOptions: [],
      drives: {
        mainFamily: "S120_booksize",
        feedMotorModules: 2,
        spindleMotorModules: 1,
        lineModule: "Smart Line Module 36kW",
        lineModuleArticle: "6SL3130-6TE23-6AA3",
        feedMotorModuleArticle: "6SL3120-1TE21-0AD0",
        spindleMotorModuleArticle: "6SL3120-1TE21-8AD0",
        reason: "S120 booksize: 2x 9A Motor Modules (feed) + 1x 18A Motor Module (spindle). Total 19.3kW → Smart 36kW Line Module (70% simultaneity)",
      },
      motors: {
        feedMotors: "SIMOTICS S-1FT7",
        feedMotorArticle: "1FT7044-5AF71-1DA1",
        spindleMotors: "SIMOTICS M-1PH8",
        spindleMotorArticle: "1PH8107-1DF10-0LA1",
        reason: "1FT7 SH48 5Nm@3000rpm for X/Z feed axes, 1PH8 SH100 7.5kW@1500rpm for main turning spindle",
      },
      hmi: { type: "thin_client", model: 'ITC1500 V3 15"', reason: "15\" Thin Client — standard for lathe operation" },
      mcp: { model: "MCP 1500", articleNumber: "6FC5303-0AP01-0AA0", reason: "15\" Machine Control Panel matching ITC1500 panel size" },
      safety: {
        options: [],
        reason: "Basic safety (STO, SS1, SBC) included in base scope. Sufficient for simple CNC lathe.",
      },
      totalAxes: 3,
      totalChannels: 1,
      notes: [
        "2 axes + 1 spindle = 3 total — fully covered by base scope, no additional axis licenses needed",
        "Feed motors: 1FT7044-5AF71-1DA1 (SH48, 5Nm, 3000rpm) → Motor Module 6SL3120-1TE13-0AD0 (3A) per axis",
        "Spindle motor: 1PH8107-1DF10-0LA1 (SH100, 7.5kW, 1500rpm) → Motor Module 6SL3120-1TE23-0AD0 (30A)",
        "Line Module: Smart 10kW 6SL3130-6AE21-0AB1",
        "Consider adding C-axis for milling on lathe (1 extra axis license needed)",
      ],
      estimatedComplexity: "basic",
    };
  }

  // ─── GRINDING ───
  // 3 axes (X, Y, Z) + 1 wheel spindle = 4 total. Base=3, so 1 extra needed.
  if (isGrinding) {
    return {
      controlUnit: {
        id: "NCU_1740",
        reason: "4 axes/spindles within NCU 1740 capacity",
      },
      cncSoftware: { variant: "export", swVersion: "6.25 SP1" },
      technologyPackages: [],
      additionalOptions: [
        { orderCode: "A01", name: "1 additional axis/spindle", quantity: 1, reason: "4 total (3 axes + 1 wheel spindle) - 3 base = 1 additional license" },
        { orderCode: "M34", name: "Grinding oscillation functions", quantity: 1, reason: "Block-related, modal and asynchronous oscillation for grinding" },
        { orderCode: "S35", name: "Grinding Advanced", quantity: 1, reason: "Extended grinding functions including dressing cycles" },
      ],
      drives: {
        mainFamily: "S120_booksize",
        feedMotorModules: 3,
        spindleMotorModules: 1,
        lineModule: "Smart Line Module 36kW",
        lineModuleArticle: "6SL3130-6TE23-6AA3",
        feedMotorModuleArticle: "6SL3120-1TE15-0AD0",
        spindleMotorModuleArticle: "6SL3120-1TE21-8AD0",
        reason: "S120 booksize: 3x 5A Motor Modules (feed, 2.7kW each) + 1x 18A Motor Module (wheel, 9.7kW). Total 17.8kW → Smart 36kW (70% simultaneity = 12.5kW)",
      },
      motors: {
        feedMotors: "SIMOTICS S-1FT7",
        feedMotorArticle: "1FT7062-5AF71-1DA1",
        feedMotorShaftHeight: 63,
        spindleMotors: "SIMOTICS M-1PH8",
        spindleMotorArticle: "1PH8107-1DF10-0LA1",
        spindleMotorShaftHeight: 100,
        reason: "1FT7 SH63 6Nm@3000rpm for X/Y/Z feed, 1PH8 SH100 7.5kW@1500rpm for wheel spindle",
      },
      hmi: { type: "thin_client", model: 'ITC1500 V3 15"', reason: "15\" Thin Client for grinding operation" },
      mcp: { model: "MCP 1500", articleNumber: "6FC5303-0AP01-0AA0", reason: "15\" MCP for grinding operation" },
      safety: {
        options: [],
        reason: "Basic safety (STO, SS1, SBC) sufficient for standard grinding machine",
      },
      totalAxes: 4,
      totalChannels: 1,
      notes: [
        "3 axes + 1 spindle = 4 total — only 1 additional axis license needed beyond base 3",
        "Feed motors: 1FT7062-5AF71-1DA1 (SH63, 6Nm, 3000rpm) → Motor Module 6SL3120-1TE15-0AD0 (5A)",
        "Wheel spindle: 1PH8107-1DF10-0LA1 (SH100, 7.5kW, 1500rpm) → Motor Module 6SL3120-1TE21-8AD0 (18A)",
        "Add M28 (TRAANG oblique axis) if oblique-axis grinding required",
      ],
      estimatedComplexity: "standard",
    };
  }

  // ─── LASER CUTTING ───
  // 3 axes (X, Y, Z) + no spindle = 3 total. Base=3, NO extra needed.
  if (isLaser) {
    return {
      controlUnit: {
        id: "NCU_1740",
        reason: "3 axes within NCU 1740 base scope",
      },
      cncSoftware: { variant: "export", swVersion: "6.25 SP1" },
      technologyPackages: [],
      additionalOptions: [
        { orderCode: "M37", name: "Laser power control", quantity: 1, reason: "Path velocity-dependent analog output for laser power" },
        { orderCode: "M38", name: "Laser switching high-speed", quantity: 1, reason: "High-speed laser on/off switching signals" },
        { orderCode: "S07", name: "Advanced Surface", quantity: 1, reason: "Smooth path control for quality laser cuts" },
        { orderCode: "M43", name: "Cross-mode actions ASUB", quantity: 1, reason: "Required for synchronized laser control" },
      ],
      drives: {
        mainFamily: "S120_booksize",
        feedMotorModules: 3,
        spindleMotorModules: 0,
        lineModule: "Active Line Module 16kW",
        lineModuleArticle: "6SL3130-7TE21-6AA4",
        feedMotorModuleArticle: "6SL3120-1TE21-0AD0",
        reason: "S120 booksize: 3x 9A Motor Modules + Active Line Module 16kW + Interface Module 6SL3100-0BE21-6AB0",
      },
      motors: {
        feedMotors: "SIMOTICS S-1FT7",
        feedMotorArticle: "1FT7082-5AF71-1DA1",
        feedMotorShaftHeight: 80,
        spindleMotors: "",
        reason: "1FT7 SH80 13Nm@3000rpm high-dynamic servo motors for fast laser cutting paths",
      },
      hmi: { type: "thin_client", model: 'ITC1900 V3 19"', reason: "19\" for laser program visualization" },
      mcp: { model: "MCP 1900", articleNumber: "6FC5303-0AP02-0AA0", reason: "19\" MCP for laser operation" },
      safety: {
        options: ["S60", "S61"],
        reason: "Extended safety for laser: safe speed monitoring during door-open operation",
      },
      totalAxes: 3,
      totalChannels: 1,
      notes: [
        "3 axes = base scope — no additional axis licenses needed",
        "Feed motors: 1FT7082-5AF71-1DA1 (SH80, 13Nm, 3000rpm) → Motor Module 6SL3120-1TE21-0AD0 (9A)",
        "Active Line Module: 6SL3130-7TE21-6AA4 + Interface 6SL3100-0BE21-6AB0",
        "Laser source and laser-specific safety are external to SINUMERIK scope",
      ],
      estimatedComplexity: "standard",
    };
  }

  // ─── ROBOT CELL ───
  // 6 joint axes, no spindle = 6 total. Base=3, so 3 extra needed.
  if (isRobot) {
    return {
      controlUnit: {
        id: "NCU_1750",
        reason: "6-axis robot requires NCU 1750 for multi-axis interpolation (>4 axes)",
      },
      cncSoftware: { variant: "full_scope", swVersion: "6.25 SP1" },
      technologyPackages: [],
      additionalOptions: [
        { orderCode: "A03", name: "3 additional axes", quantity: 3, reason: "6 robot axes - 3 base = 3 additional licenses" },
        { orderCode: "M15", name: "Multi-axis interpolation >4 axes", quantity: 1, reason: "Required for 6-axis robot interpolation" },
        { orderCode: "R05", name: "Run MyRobot /Direct Control ROBX AR", quantity: 1, reason: "Articulated arm robot transformation" },
        { orderCode: "M43", name: "Cross-mode actions ASUB", quantity: 1, reason: "Required for robot operation" },
        { orderCode: "S00", name: "SINUMERIK Operate /NCU", quantity: 1, reason: "Required for robot HMI" },
      ],
      drives: {
        mainFamily: "S120_booksize",
        feedMotorModules: 6,
        spindleMotorModules: 0,
        lineModule: "Active Line Module 55kW",
        lineModuleArticle: "6SL3130-7TE25-5AA3",
        feedMotorModuleArticle: "6SL3120-1TE21-8AD0",
        reason: "S120 booksize: 6x 18A Motor Modules (9.7kW each = 58.2kW total). 70% simultaneity = 40.7kW → Active 55kW + Interface 6SL3100-0BE25-5AB0",
      },
      motors: {
        feedMotors: "SIMOTICS S-1FT7",
        feedMotorArticle: "1FT7084-5AF71-1DA1",
        feedMotorShaftHeight: 80,
        spindleMotors: "",
        reason: "1FT7 SH80 20Nm@3000rpm servo motors for robot joints (exact motor per joint varies)",
      },
      hmi: { type: "thin_client", model: 'ITC1500 V3 15"', reason: "15\" Thin Client for robot teach/operate" },
      mcp: { model: "MCP 1500", articleNumber: "6FC5303-0AP01-0AA0", reason: "15\" MCP for robot operation" },
      safety: {
        options: ["S60", "K06"],
        reason: "S60 enables F-PLC, K06 = 6 safe axes. SIMATIC Safe Kinematics also needed (6ES7823-0FE04-1AA0).",
      },
      totalAxes: 6,
      totalChannels: 1,
      notes: [
        "6 axes - 3 base = 3 additional axis licenses needed",
        "Joint motors: 1FT7084-5AF71-1DA1 (SH80, 20Nm, 3000rpm) → Motor Module 6SL3120-1TE21-8AD0 (18A)",
        "Active Line Module: 6SL3130-7TE23-6AA3 + Interface 6SL3100-0BE23-6AB0",
        "Full scope CNC software required (M15, R05 not available in export version)",
        "Contact Siemens for Run MyRobot /Direct Control engineering package",
      ],
      estimatedComplexity: "complex",
    };
  }

  // ─── MILL-TURN CENTER ───
  // Typical: X1, Z1, C1, X2, Z2 = 5 axes + 2 spindles = 7 total. Base=3, 4 extra.
  if (isMillTurn) {
    return {
      controlUnit: {
        id: "NCU_1750",
        reason: "Mill-turn with 7 axes/spindles and 2 channels benefits from NCU 1750",
      },
      cncSoftware: { variant: "full_scope", swVersion: "6.25 SP1" },
      technologyPackages: [
        { id: "S41", reason: "Dynamics Operate for ShopTurn/ShopMill programming" },
      ],
      additionalOptions: [
        { orderCode: "A04", name: "4 additional axes/spindles", quantity: 4, reason: "7 total (5 axes + 2 spindles) - 3 base = 4 additional" },
        { orderCode: "C11", name: "Additional machining channel", quantity: 1, reason: "2nd channel for simultaneous turning + milling" },
        { orderCode: "M30", name: "Machining package 5 axes", quantity: 1, reason: "For B-axis milling head with 5-axis capability" },
        { orderCode: "M43", name: "Cross-mode actions ASUB", quantity: 1, reason: "Required for multi-channel synchronized operation" },
      ],
      drives: {
        mainFamily: "S120_booksize",
        feedMotorModules: 5,
        spindleMotorModules: 2,
        lineModule: "Active Line Module 55kW",
        lineModuleArticle: "6SL3130-7TE25-5AA3",
        feedMotorModuleArticle: "6SL3120-1TE21-0AD0",
        spindleMotorModuleArticle: "6SL3120-1TE24-5AC0",
        reason: "S120 booksize: 5x 9A (4.8kW) + 2x 45A (24kW) = 72kW total. 70% simultaneity = 50.4kW → Active 55kW + Interface 6SL3100-0BE25-5AB0",
      },
      motors: {
        feedMotors: "SIMOTICS S-1FT7",
        feedMotorArticle: "1FT7064-5AF71-1DA1",
        feedMotorShaftHeight: 63,
        spindleMotors: "SIMOTICS M-1PH8",
        spindleMotorArticle: "1PH8133-1DF10-0LA1",
        spindleMotorShaftHeight: 132,
        reason: "1FT7 SH63 9Nm@3000rpm for feed/rotary axes, 1PH8 SH132 11kW@1500rpm for main + milling spindle",
      },
      hmi: { type: "thin_client", model: 'ITC1900 V3 19"', reason: "19\" for complex mill-turn programming" },
      mcp: { model: "MCP 1900", articleNumber: "6FC5303-0AP02-0AA0", reason: "19\" MCP for mill-turn operation" },
      safety: {
        options: ["S60", "S61"],
        reason: "Extended safety with S60 + S61 for production mill-turn center",
      },
      totalAxes: 7,
      totalChannels: 2,
      notes: [
        "7 total axes/spindles - 3 base = 4 additional licenses needed",
        "Feed motors: 1FT7064-5AF71-1DA1 (SH63, 9Nm, 3000rpm) → Motor Module 6SL3120-1TE21-0AD0 (9A)",
        "Spindle motors: 1PH8133-1DF10-0LA1 (SH132, 11kW, 1500rpm) → Motor Module 6SL3120-1TE24-5AC0 (45A)",
        "Active Line Module: 6SL3130-7TE23-6AA3 + Interface 6SL3100-0BE23-6AB0",
        "Full scope required for M30 (5-axis machining package)",
        "2 channels allow simultaneous turning on main spindle + milling on sub-spindle",
      ],
      estimatedComplexity: "advanced",
    };
  }

  // ─── DEFAULT: 3-AXIS MILLING CENTER ───
  // 3 axes (X, Y, Z) + 1 spindle = 4 total. Base=3, so 1 extra needed.
  return {
    controlUnit: {
      id: "NCU_1740",
      reason: "4 axes/spindles within NCU 1740 capacity (max 20)",
    },
    cncSoftware: { variant: "export", swVersion: "6.25 SP1" },
    technologyPackages: [
      { id: "S42", reason: "Dynamics 3 Axis Milling includes Advanced/Top Surface, measuring cycles, ShopMill" },
    ],
    additionalOptions: [
      { orderCode: "A01", name: "1 additional axis/spindle", quantity: 1, reason: "4 total (3 axes + 1 spindle) - 3 base = 1 additional license" },
    ],
    drives: {
      mainFamily: "S120_booksize",
      feedMotorModules: 3,
      spindleMotorModules: 1,
      lineModule: "Smart Line Module 36kW",
      lineModuleArticle: "6SL3130-6TE23-6AA3",
      feedMotorModuleArticle: "6SL3120-1TE21-0AD0",
      spindleMotorModuleArticle: "6SL3120-1TE23-0AD0",
      reason: "S120 booksize: 3x 9A (4.8kW) + 1x 30A (16kW) = 30.4kW total. 70% simultaneity = 21.3kW → Smart 36kW",
    },
    motors: {
      feedMotors: "SIMOTICS S-1FT7",
      feedMotorArticle: "1FT7062-5AF71-1DA1",
      spindleMotors: "SIMOTICS M-1PH8",
      spindleMotorArticle: "1PH8107-1DF10-0LA1",
      reason: "1FT7 SH63 6Nm@3000rpm for X/Y/Z feed axes, 1PH8 SH100 7.5kW@1500rpm for milling spindle",
    },
    hmi: { type: "thin_client", model: 'ITC1500 V3 15"', reason: "15\" Thin Client for standard milling" },
    mcp: { model: "MCP 1500", articleNumber: "6FC5303-0AP01-0AA0", reason: "15\" Machine Control Panel with Powerride for feed/spindle override" },
    safety: {
      options: [],
      reason: "Basic safety (STO, SS1, SBC) sufficient for standard 3-axis mill.",
    },
    totalAxes: 4,
    totalChannels: 1,
    notes: [
      "3 axes + 1 spindle = 4 total — only 1 additional axis license beyond base 3",
      "Feed motors: 1FT7062-5AF71-1DA1 (SH63, 6Nm, 3000rpm) → Motor Module 6SL3120-1TE15-0AD0 (5A) per axis",
      "Spindle motor: 1PH8107-1DF10-0LA1 (SH100, 7.5kW, 1500rpm) → Motor Module 6SL3120-1TE23-0AD0 (30A)",
      "Line Module: Smart 10kW 6SL3130-6AE21-0AB1",
      "Upgrade to NCU 1750 + S43 for future 5-axis capability",
    ],
    estimatedComplexity: "standard",
  };
}
