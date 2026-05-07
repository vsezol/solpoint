#!/usr/bin/env python3
from __future__ import annotations

import os
import textwrap
from dataclasses import dataclass


PAGE_WIDTH = 612
PAGE_HEIGHT = 792
MARGIN = 40
GUTTER = 20
HEADER_HEIGHT = 64
COLUMN_WIDTH = (PAGE_WIDTH - (2 * MARGIN) - GUTTER) / 2

OUTPUT_PATH = "output/pdf/solpoint-app-summary.pdf"


@dataclass
class DrawItem:
    x: float
    y: float
    font: str
    size: int
    text: str


def escape_pdf_text(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace("(", "\\(")
        .replace(")", "\\)")
    )


def wrap_text(text: str, max_chars: int) -> list[str]:
    return textwrap.wrap(
        text,
        width=max_chars,
        break_long_words=False,
        break_on_hyphens=False,
    )


def add_section(
    items: list[DrawItem],
    x: float,
    y: float,
    title: str,
    body_lines: list[str],
    *,
    body_size: int = 10,
    title_size: int = 12,
    line_gap: int = 4,
    section_gap: int = 8,
) -> float:
    items.append(DrawItem(x, y, "F2", title_size, title))
    current_y = y - (title_size + 6)
    for line in body_lines:
        if line == "":
            current_y -= 4
            continue
        items.append(DrawItem(x, current_y, "F1", body_size, line))
        current_y -= body_size + line_gap
    return current_y - section_gap


def add_bullets(
    items: list[DrawItem],
    x: float,
    y: float,
    title: str,
    bullets: list[str],
    *,
    wrap_width: int = 42,
) -> float:
    items.append(DrawItem(x, y, "F2", 12, title))
    current_y = y - 18
    bullet_x = x + 10
    text_x = x + 20
    for bullet in bullets:
        wrapped = wrap_text(bullet, wrap_width)
        if not wrapped:
            continue
        items.append(DrawItem(bullet_x, current_y, "F1", 10, "-"))
        items.append(DrawItem(text_x, current_y, "F1", 10, wrapped[0]))
        current_y -= 14
        for line in wrapped[1:]:
            items.append(DrawItem(text_x, current_y, "F1", 10, line))
            current_y -= 14
    return current_y - 8


def build_pdf_content() -> bytes:
    left_x = MARGIN
    right_x = MARGIN + COLUMN_WIDTH + GUTTER
    top_y = PAGE_HEIGHT - MARGIN

    items: list[DrawItem] = []
    items.append(DrawItem(MARGIN, top_y, "F2", 22, "SolPoint App Summary"))
    items.append(
        DrawItem(
            MARGIN,
            top_y - 26,
            "F1",
            10,
            "Repo-grounded one-page overview generated from code, config, docs, and routes.",
        )
    )

    left_y = top_y - HEADER_HEIGHT
    right_y = top_y - HEADER_HEIGHT

    what_it_is = wrap_text(
        "SolPoint is a Next.js web app for discovering and managing Solana ecosystem people, events, hubs, communities, projects, and workspaces on a global map. The repo also shows messaging, meeting requests, QR profile sharing, and subscription flows layered on top of that network.",
        45,
    )
    left_y = add_section(items, left_x, left_y, "What It Is", what_it_is)

    who_its_for = wrap_text(
        "Primary persona: a Solana community member, organizer, builder, or operator who wants to find local people and places, track ecosystem activity, and manage community entities from one app.",
        45,
    )
    left_y = add_section(items, left_x, left_y, "Who It's For", who_its_for)

    feature_bullets = [
        "Browse a world map of users, events, hubs, communities, workspaces, and projects.",
        "View entity pages for hubs, communities, projects, workspaces, events, and user profiles.",
        "Create and manage entities, membership, roles, images, and ownership transfers via dashboard and APIs.",
        "Authenticate with Twitter via Supabase; web cookies and mobile deep-link exchange are both implemented.",
        "Use chats, friend/follow flows, invites/referrals, and meeting requests to coordinate with other users.",
        "Support QR profile sharing/check-in flows and Solana-based subscription/payment endpoints.",
        "Run admin and cron-backed Luma event ingest/enrichment workflows for external event data.",
    ]
    left_y = add_bullets(items, left_x, left_y, "What It Does", feature_bullets)

    run_lines = [
        "1. Install deps: `npm install`.",
        "2. Create `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, and `MOBILE_DEEP_LINK_SCHEMES`.",
        "3. Set up the Supabase schema/database from `supabase/schema.sql` or project migrations.",
        "4. Start locally with `npm run dev`, then open `http://localhost:3000`.",
        "5. Optional vars/services beyond that: Not found in repo as a single consolidated setup guide.",
    ]
    left_y = add_section(items, left_x, left_y, "How To Run", run_lines, body_size=9, line_gap=3)

    architecture_lines = [
        "UI layer: Next.js 16 App Router pages in `src/app` render landing, map, profile, chats, events, hubs, communities, projects, workspaces, subscription, and admin screens.",
        "Client services: `src/app/layout.tsx` wires `ThemeProvider`, `QueryProvider` (React Query), `AuthProvider`, `WalletContextProvider` (Solana wallet adapter), analytics, and mobile nav.",
        "Data/auth: Supabase browser/server clients live in `src/lib/supabase/*`; `src/middleware.ts` refreshes sessions; auth docs and routes show Twitter OAuth, cookie sessions, and a mobile token exchange flow.",
        "Server API: route handlers under `src/app/api/*` expose CRUD and workflow endpoints for events, hubs, communities, projects, workspaces, users, friends, chats, invites, meeting requests, QR, subscriptions, profile updates, and admin tooling.",
        "Persistence: database schema and migrations live under `supabase/schema.sql` and `supabase/migrations/*`, indicating Supabase Postgres as the backing store.",
        "Background flows: `vercel.json` schedules `/api/cron/luma-pipeline`; that endpoint triggers Luma transfer/enrichment jobs, and `scripts/luma-sync-to-events.mjs` syncs external Luma records into `events`.",
        "End-to-end flow: browser page or client hook -> internal `/api/*` route or Supabase client -> Supabase tables/functions/storage -> JSON back to UI; scheduled jobs follow the same path on the server side.",
        "Realtime transport details: Not found in repo as a single documented architecture diagram.",
    ]
    wrapped_arch: list[str] = []
    for line in architecture_lines:
        if line.startswith("Realtime transport details:"):
            wrapped_arch.extend(wrap_text(line, 48))
            continue
        wrapped = wrap_text(line, 48)
        if wrapped:
            wrapped_arch.append("- " + wrapped[0])
            wrapped_arch.extend("  " + part for part in wrapped[1:])
    right_y = add_section(items, right_x, right_y, "How It Works", wrapped_arch, body_size=9, line_gap=3)

    # Draw a subtle divider line under the header and between columns.
    content_lines = [
        "0.75 w",
        "0.85 0.87 0.90 RG",
        f"{MARGIN} {top_y - 38} m {PAGE_WIDTH - MARGIN} {top_y - 38} l S",
        f"{MARGIN + COLUMN_WIDTH + (GUTTER / 2)} {MARGIN} m {MARGIN + COLUMN_WIDTH + (GUTTER / 2)} {PAGE_HEIGHT - MARGIN - 52} l S",
    ]

    for item in items:
        content_lines.append("BT")
        content_lines.append(f"/{item.font} {item.size} Tf")
        if item.font == "F2":
            content_lines.append("0.09 0.12 0.18 rg")
        else:
            content_lines.append("0.18 0.20 0.24 rg")
        content_lines.append(f"1 0 0 1 {item.x:.2f} {item.y:.2f} Tm")
        content_lines.append(f"({escape_pdf_text(item.text)}) Tj")
        content_lines.append("ET")

    content_stream = "\n".join(content_lines).encode("latin-1", errors="replace")

    objects: list[bytes] = []

    def add_object(data: bytes) -> int:
        objects.append(data)
        return len(objects)

    add_object(b"<< /Type /Catalog /Pages 2 0 R >>")
    add_object(b"<< /Type /Pages /Count 1 /Kids [3 0 R] >>")
    add_object(
        f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {PAGE_WIDTH} {PAGE_HEIGHT}] "
        f"/Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>".encode("ascii")
    )
    add_object(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    add_object(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")
    add_object(
        b"<< /Length "
        + str(len(content_stream)).encode("ascii")
        + b" >>\nstream\n"
        + content_stream
        + b"\nendstream"
    )

    pdf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode("ascii"))
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")

    xref_start = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))

    pdf.extend(
        (
            f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_start}\n%%EOF\n"
        ).encode("ascii")
    )
    return bytes(pdf)


def main() -> None:
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    os.makedirs("tmp/pdfs", exist_ok=True)
    pdf_bytes = build_pdf_content()
    with open(OUTPUT_PATH, "wb") as handle:
        handle.write(pdf_bytes)
    print(OUTPUT_PATH)


if __name__ == "__main__":
    main()
