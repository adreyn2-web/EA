#!/usr/bin/env python3
"""
Generate a formatted weekly meal plan PDF from data/meal_plan.json.
Outputs to data/meal_plan_YYYY-MM-DD.pdf.
Requires: pip install reportlab
"""

import json
from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).parent.parent
DATA_DIR = ROOT / "data"
INPUT_PATH = DATA_DIR / "meal_plan.json"

# Brand colors
DARK = colors.HexColor("#1a1a2e")
ACCENT = colors.HexColor("#e94560")
LIGHT_GRAY = colors.HexColor("#f5f5f5")
MID_GRAY = colors.HexColor("#cccccc")
WHITE = colors.white

styles = getSampleStyleSheet()

H1 = ParagraphStyle("H1", parent=styles["Normal"], fontSize=22, fontName="Helvetica-Bold",
                    textColor=DARK, spaceAfter=4)
H2 = ParagraphStyle("H2", parent=styles["Normal"], fontSize=13, fontName="Helvetica-Bold",
                    textColor=ACCENT, spaceBefore=14, spaceAfter=4)
H3 = ParagraphStyle("H3", parent=styles["Normal"], fontSize=10, fontName="Helvetica-Bold",
                    textColor=DARK, spaceBefore=8, spaceAfter=2)
BODY = ParagraphStyle("BODY", parent=styles["Normal"], fontSize=9, fontName="Helvetica",
                      textColor=DARK, spaceAfter=2, leading=13)
SMALL = ParagraphStyle("SMALL", parent=styles["Normal"], fontSize=8, fontName="Helvetica",
                       textColor=colors.HexColor("#666666"), spaceAfter=2)
LABEL = ParagraphStyle("LABEL", parent=styles["Normal"], fontSize=8, fontName="Helvetica-Bold",
                       textColor=WHITE)


def macro_badge(label: str, value: str) -> Table:
    data = [[Paragraph(label, LABEL)], [Paragraph(value, LABEL)]]
    t = Table(data, colWidths=[1.1 * inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), ACCENT),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ROUNDEDCORNERS", [4, 4, 4, 4]),
    ]))
    return t


def macro_row(targets: dict) -> Table:
    badges = [
        macro_badge("CALORIES", f"{targets.get('calories', 0)} kcal"),
        macro_badge("PROTEIN", f"{targets.get('protein_g', 0)}g"),
        macro_badge("CARBS", f"{targets.get('carbs_g', 0)}g"),
        macro_badge("FAT", f"{targets.get('fat_g', 0)}g"),
    ]
    t = Table([badges], colWidths=[1.2 * inch] * 4, hAlign="LEFT")
    t.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 6),
                           ("RIGHTPADDING", (0, 0), (-1, -1), 6)]))
    return t


def meal_table(day_data: dict) -> Table:
    header = [
        Paragraph("Meal", LABEL),
        Paragraph("Recipe", LABEL),
        Paragraph("Protein", LABEL),
        Paragraph("Cal", LABEL),
        Paragraph("Prep", LABEL),
        Paragraph("Est. Cost", LABEL),
    ]
    rows = [header]
    for meal in day_data.get("meals", []):
        m = meal.get("macros", {})
        rows.append([
            Paragraph(meal.get("meal_type", "").replace("_", " ").title(), BODY),
            Paragraph(meal.get("recipe_name", ""), BODY),
            Paragraph(f"{m.get('protein_g', 0)}g", BODY),
            Paragraph(str(m.get("calories", 0)), BODY),
            Paragraph(f"{meal.get('prep_time_minutes', 0)} min", BODY),
            Paragraph(f"${meal.get('estimated_cost_usd', 0):.2f}", BODY),
        ])

    totals = day_data.get("daily_totals", {})
    rows.append([
        Paragraph("DAILY TOTAL", ParagraphStyle("bold", parent=BODY, fontName="Helvetica-Bold")),
        Paragraph("", BODY),
        Paragraph(f"{totals.get('protein_g', 0)}g", ParagraphStyle("bold", parent=BODY, fontName="Helvetica-Bold")),
        Paragraph(str(totals.get("calories", 0)), ParagraphStyle("bold", parent=BODY, fontName="Helvetica-Bold")),
        Paragraph("", BODY),
        Paragraph(f"${totals.get('estimated_cost_usd', 0):.2f}", ParagraphStyle("bold", parent=BODY, fontName="Helvetica-Bold")),
    ])

    col_widths = [0.9 * inch, 2.8 * inch, 0.7 * inch, 0.5 * inch, 0.6 * inch, 0.7 * inch]
    t = Table(rows, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), DARK),
        ("BACKGROUND", (0, 1), (-1, -2), WHITE),
        ("BACKGROUND", (0, -1), (-1, -1), LIGHT_GRAY),
        ("ROWBACKGROUNDS", (0, 1), (-1, -2), [WHITE, LIGHT_GRAY]),
        ("GRID", (0, 0), (-1, -1), 0.5, MID_GRAY),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t


def recipe_detail_section(day_data: dict, story: list):
    story.append(Paragraph("Recipe Details", H3))
    for meal in day_data.get("meals", []):
        name = meal.get("recipe_name", "")
        batch = meal.get("batch_cook_note", "")
        story.append(Paragraph(f"<b>{meal.get('meal_type','').replace('_',' ').title()}: {name}</b>"
                               + (f" <i>({batch})</i>" if batch else ""), BODY))

        ingredients = meal.get("ingredients", [])
        if ingredients:
            ing_text = " · ".join(
                f"{i.get('quantity','')} {i.get('unit','')} {i.get('item','')}" for i in ingredients
            )
            story.append(Paragraph(f"<i>Ingredients:</i> {ing_text}", SMALL))
        story.append(Spacer(1, 4))


def grocery_section(grocery: dict) -> list:
    elements = []
    elements.append(Paragraph("Grocery List", H2))
    elements.append(Paragraph("Organized by store section — check off as you go.", SMALL))
    elements.append(Spacer(1, 6))

    category_order = ["proteins", "produce", "dairy", "grains", "pantry", "frozen", "other"]
    category_labels = {
        "proteins": "Proteins & Meat",
        "produce": "Produce",
        "dairy": "Dairy & Eggs",
        "grains": "Grains & Bread",
        "pantry": "Pantry & Spices",
        "frozen": "Frozen",
        "other": "Other",
    }

    for cat in category_order:
        items = grocery.get(cat, [])
        if not items:
            continue
        elements.append(Paragraph(category_labels[cat], H3))
        rows = [["", "Item", "Quantity", "Est. Cost"]]
        for item in items:
            rows.append([
                "☐",
                item.get("item", ""),
                f"{item.get('quantity', '')} {item.get('unit', '')}".strip(),
                f"${item.get('estimated_cost_usd', 0):.2f}",
            ])
        t = Table(rows, colWidths=[0.2 * inch, 3.0 * inch, 1.8 * inch, 0.9 * inch])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), DARK),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_GRAY]),
            ("GRID", (0, 0), (-1, -1), 0.5, MID_GRAY),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 8))

    return elements


def last_week_summary(tracker_path: Path) -> list:
    if not tracker_path.exists():
        return []
    with open(tracker_path) as f:
        entries = json.load(f)
    if not entries:
        return []
    last = entries[-1]

    elements = [Paragraph("Last Week's Summary", H2)]
    rows = []
    if last.get("actual_cost") is not None:
        rows.append(["Actual spend", f"${last['actual_cost']:.2f}"])
    if last.get("rating") is not None:
        rows.append(["Rating", f"{last['rating']} / 5"])
    if last.get("notes"):
        rows.append(["Notes", last["notes"]])

    if rows:
        t = Table(rows, colWidths=[1.8 * inch, 4.4 * inch])
        t.setStyle(TableStyle([
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [WHITE, LIGHT_GRAY]),
            ("GRID", (0, 0), (-1, -1), 0.5, MID_GRAY),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ]))
        elements.append(t)

    return elements


def build_pdf(plan: dict, output_path: Path, tracker_path: Path):
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=letter,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )

    story = []
    week_of = plan.get("week_of", date.today().isoformat())
    est_cost = plan.get("estimated_weekly_cost_usd", 0)

    # Header
    story.append(Paragraph(f"Weekly Meal Plan", H1))
    story.append(Spacer(1, 6))
    story.append(Paragraph(f"Week of {week_of}  ·  Est. grocery cost: <b>${est_cost:.2f}</b>", SMALL))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=2, color=ACCENT, spaceAfter=10))

    # Macro targets
    story.append(Paragraph("Daily Targets", H2))
    story.append(macro_row(plan.get("macro_targets", {})))
    story.append(Spacer(1, 12))

    # Last week summary (if available)
    story.extend(last_week_summary(tracker_path))
    if tracker_path.exists():
        story.append(Spacer(1, 8))

    # Meal plan by day
    story.append(Paragraph("Meal Plan", H2))
    for day_data in plan.get("days", []):
        story.append(Paragraph(day_data.get("day", ""), H3))
        story.append(meal_table(day_data))
        story.append(Spacer(1, 6))
        recipe_detail_section(day_data, story)
        story.append(HRFlowable(width="100%", thickness=0.5, color=MID_GRAY, spaceAfter=8))

    # Grocery list
    story.extend(grocery_section(plan.get("grocery_list", {})))

    story.append(Paragraph("Rate This Week's Meals", H2))
    story.append(Paragraph(
        "Log actual cost and a rating in the Compass dashboard (More → Health) "
        "so next week's plan can learn from it.", BODY))

    doc.build(story)
    print(f"PDF saved: {output_path}")


def main():
    if not INPUT_PATH.exists():
        print(f"Error: {INPUT_PATH} not found. Run generate_meal_plan.py first.")
        raise SystemExit(1)

    with open(INPUT_PATH) as f:
        plan = json.load(f)

    week_of = plan.get("week_of", date.today().isoformat())
    output_path = DATA_DIR / f"meal_plan_{week_of}.pdf"
    tracker_path = DATA_DIR / "tracker.json"

    build_pdf(plan, output_path, tracker_path)


if __name__ == "__main__":
    main()
