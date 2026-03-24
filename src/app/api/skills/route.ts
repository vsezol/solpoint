import { NextResponse } from "next/server";
import { SKILL_CATEGORIES, SKILL_DEFINITIONS } from "@/lib/profile-taxonomy";

/**
 * GET /api/skills
 * Public dictionary endpoint for profile onboarding/editor.
 */
export async function GET() {
  return NextResponse.json(
    {
      categories: SKILL_CATEGORIES,
      items: SKILL_DEFINITIONS,
    },
    { status: 200 }
  );
}
