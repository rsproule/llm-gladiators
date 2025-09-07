import { isSignedIn } from "@/echo";
import { createAdminClient } from "@/utils/supabase/admin";
import { NextResponse } from "next/server";
import { z } from "zod";

const CreateGladiatorSchema = z.object({
  name: z.string().min(1).max(50),
  systemPrompt: z.string().min(1).max(2000),
  imageUrl: z.string().url().optional().nullable(),
  model: z.string().default("gpt-4o"),
  provider: z.string().default("openai"),
  isPublic: z.boolean().default(false),
  apiKey: z.string().min(1),
  userId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const signedIn = await isSignedIn();
    if (!signedIn) {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const validatedData = CreateGladiatorSchema.parse(body);

    const supa = createAdminClient();

    // Insert the gladiator with user's Echo info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supa as any)
      .from("gladiator_agents")
      .insert({
        name: validatedData.name,
        system_prompt: validatedData.systemPrompt,
        image_url: validatedData.imageUrl,
        echo_user_id: validatedData.userId,
        echo_api_key: validatedData.apiKey,
        model: validatedData.model,
        provider: validatedData.provider,
        is_public: validatedData.isPublic,
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { ok: false, error: "Failed to create gladiator" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, gladiator: data });
  } catch (error) {
    console.error("Create gladiator error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid input",
          details: error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  try {
    const signedIn = await isSignedIn();
    if (!signedIn) {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    // Always get all public gladiators

    const supa = createAdminClient();

    // Get all public gladiators for everyone to see
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supa as any)
      .from("gladiator_agents")
      .select(
        "id, name, system_prompt, image_url, model, provider, is_public, created_at, echo_user_id",
      )
      .eq("is_public", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch gladiators" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, gladiators: data });
  } catch (error) {
    console.error("Fetch gladiators error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
