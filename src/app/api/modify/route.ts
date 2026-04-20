import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

/**
 * Configuration modification endpoint.
 *
 * Takes the current config summary and a user request, returns a structured
 * change instruction that the frontend applies via config-mutations.
 *
 * Schema:
 *   request:  { systemPrompt: string, userMessage: string }
 *   response: ModifyInstruction (see schema in modify-engine.ts)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { systemPrompt, userMessage } = body;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "your-api-key-here") {
      console.log("[Modify] No API key — returning heuristic mock");
      return NextResponse.json(getHeuristicMockResponse(userMessage || ""));
    }

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const textContent = response.content.find((b) => b.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from AI");
    }

    const text = textContent.text;
    let parsed: unknown = null;
    const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      try { parsed = JSON.parse(codeBlockMatch[1].trim()); } catch { /* try next */ }
    }
    if (!parsed) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]); } catch { /* try next */ }
      }
    }
    if (!parsed) {
      try { parsed = JSON.parse(text.trim()); } catch { /* give up */ }
    }
    if (!parsed) {
      console.error("[Modify] Could not extract JSON from response:", text.substring(0, 300));
      return NextResponse.json(
        { action: "no_change", summary: "I couldn't generate a valid modification. Please rephrase your request.", changes: {} },
        { status: 200 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("[Modify] Error:", error);
    return NextResponse.json(
      {
        action: "no_change",
        summary: `Modification failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        changes: {},
      },
      { status: 200 }
    );
  }
}

/**
 * Heuristic fallback when no API key is configured. Pattern-matches a few
 * common requests so the modify pane remains useful in dev/demo mode.
 */
function getHeuristicMockResponse(req: string) {
  const r = req.toLowerCase();

  // Active line module request
  if (r.includes("active line module") || r.includes("active line") || r.includes("regenerative")) {
    return {
      action: "swap",
      changes: {
        preferActiveLineModule: true,
      },
      summary: "Switched to Active Line Module preference. The line module will be re-sized accordingly.",
    };
  }

  // Spindle power upgrade
  const kwMatch = r.match(/(\d+(?:\.\d+)?)\s*kw/i);
  if (kwMatch && (r.includes("spindle") || r.includes("upgrade"))) {
    return {
      action: "resize",
      changes: {
        userSpecsOverride: { spindlePowerKw: parseFloat(kwMatch[1]) },
      },
      summary: `Re-sized spindle motor for ${kwMatch[1]} kW requirement.`,
    };
  }

  // Spindle speed
  const rpmMatch = r.match(/(\d+)\s*rpm/i);
  if (rpmMatch && (r.includes("spindle") || r.includes("speed"))) {
    return {
      action: "resize",
      changes: {
        userSpecsOverride: { spindleMaxRpm: parseInt(rpmMatch[1], 10) },
      },
      summary: `Re-sized spindle motor for ${rpmMatch[1]} rpm max-speed requirement.`,
    };
  }

  // Add option by code
  const codeMatch = req.match(/\b([AMSPCKR]\d{2})\b/);
  if (codeMatch && (r.includes("add") || r.includes("include"))) {
    return {
      action: "add",
      changes: {
        addOptions: [{ orderCode: codeMatch[1], reason: "User-requested addition" }],
      },
      summary: `Added option ${codeMatch[1]} to the configuration.`,
    };
  }

  // Tech package add
  if (r.includes("s43") || r.includes("5-axis package") || r.includes("5 axis package")) {
    return {
      action: "add",
      changes: {
        addPackages: [{ id: "S43", reason: "5-axis Dynamics package requested" }],
      },
      summary: "Added S43 Dynamics 5-Axis Milling package.",
    };
  }

  // Control unit upgrade
  if (r.includes("ncu 1760") || r.includes("hsc")) {
    return {
      action: "swap",
      changes: { controlUnitId: "NCU_1760" },
      summary: "Upgraded to NCU 1760 (HSC variant).",
    };
  }
  if (r.includes("ncu 1750")) {
    return {
      action: "swap",
      changes: { controlUnitId: "NCU_1750" },
      summary: "Upgraded to NCU 1750.",
    };
  }

  return {
    action: "no_change",
    summary: "I couldn't infer the change you want from that text. Try: 'upgrade spindle to 30 kW', 'add M72 TRAORI', 'switch to NCU 1760', or 'add S43 package'.",
    changes: {},
  };
}
