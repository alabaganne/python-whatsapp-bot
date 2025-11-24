import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Check Supabase connection
    const supabase = createServiceClient();
    const { error } = await supabase.from("customers").select("count").limit(1);

    if (error) {
      return NextResponse.json(
        {
          status: "unhealthy",
          timestamp: new Date().toISOString(),
          checks: {
            database: "failed",
            error: error.message,
          },
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      checks: {
        database: "ok",
        environment: process.env.NODE_ENV,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: String(error),
      },
      { status: 503 }
    );
  }
}
