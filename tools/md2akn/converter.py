"""
LawAsCode Markdown -> Akoma Ntoso (AKN 3.0) Converter

Converts structured Markdown files (with YAML frontmatter) to
Akoma Ntoso XML conforming to OASIS AKN 3.0 schema.

Usage:
    python converter.py <input.md> <output.xml>
    python converter.py <input_dir> <output_dir>   (batch mode)
"""

import re
import sys
import os
import yaml
from xml.etree.ElementTree import Element, SubElement, tostring, indent
from xml.dom import minidom


# ============================================================
# Constants
# ============================================================

AKN_NS = "http://docs.oasis-open.org/legaldocml/ns/akn/3.0"
COUNTRY = "tw-tku"  # Taiwan - Tamkang University
ORGANIZATION = "tku-sa"  # TKU Student Association


# ============================================================
# Markdown Parser
# ============================================================

def parse_frontmatter(text: str) -> tuple:
    """Extract YAML frontmatter and body from markdown text."""
    if text.startswith('---'):
        parts = text.split('---', 2)
        if len(parts) >= 3:
            meta = yaml.safe_load(parts[1])
            body = parts[2].strip()
            return meta, body
    return {}, text


def parse_markdown_structure(body: str) -> dict:
    """Parse markdown body into a structured dict."""
    structure = {
        'chapters': [],
        'articles': [],  # articles without chapters
    }

    current_chapter = None
    current_article = None
    current_content_lines = []

    def flush_article():
        nonlocal current_article, current_content_lines
        if current_article:
            current_article['content'] = '\n'.join(current_content_lines).strip()
            current_content_lines = []

    for line in body.split('\n'):
        # H1: Title (skip)
        if line.startswith('# ') and not line.startswith('## '):
            continue

        # H2: Chapter
        m = re.match(r'^## 第(.+?)章\s*(.*)', line)
        if m:
            flush_article()
            current_article = None
            current_chapter = {
                'number': m.group(1),
                'title': m.group(2).strip(),
                'articles': [],
            }
            structure['chapters'].append(current_chapter)
            continue

        # H3: Article
        m = re.match(r'^### 第(.+?)條(?:[（(](.+?)[）)])?', line)
        if m:
            flush_article()
            current_article = {
                'number': m.group(1),
                'title': m.group(2) or '',
                'content': '',
            }
            if current_chapter:
                current_chapter['articles'].append(current_article)
            else:
                structure['articles'].append(current_article)
            continue

        # Content lines
        current_content_lines.append(line)

    flush_article()
    return structure


# ============================================================
# Chinese number utilities
# ============================================================

CN_NUM = {
    '零': 0, '一': 1, '二': 2, '三': 3, '四': 4,
    '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
    '十': 10, '百': 100,
}


def cn2num(s: str) -> int:
    if not s:
        return 0
    result = 0
    current = 0
    for ch in s:
        if ch in CN_NUM:
            val = CN_NUM[ch]
            if val >= 10:
                if current == 0:
                    current = 1
                result += current * val
                current = 0
            else:
                current = val
    result += current
    return result


def article_eid(number_cn: str) -> str:
    """Convert Chinese article number to eId, e.g. '九之一' -> 'art_9-1'"""
    if '之' in number_cn:
        parts = number_cn.split('之')
        return f"art_{cn2num(parts[0])}-{cn2num(parts[1])}"
    return f"art_{cn2num(number_cn)}"


# ============================================================
# AKN XML Builder
# ============================================================

def build_akn(meta: dict, structure: dict) -> Element:
    """Build AKN XML tree from metadata and parsed structure."""

    # Determine law type from name
    title = meta.get('title', '')
    short_name = meta.get('short_name', title)

    # Determine if it's a charter (章程) or regular law
    if '章程' in title:
        law_type = 'charter'
    else:
        law_type = 'act'

    # Root element
    akomaNtoso = Element('akomaNtoso', xmlns=AKN_NS)
    act = SubElement(akomaNtoso, 'act', name=law_type)

    # === META ===
    meta_el = SubElement(act, 'meta')
    build_identification(meta_el, meta, title, short_name)
    build_lifecycle(meta_el, meta)
    build_references(meta_el)

    # === PREAMBLE (optional) ===
    # Skip for now

    # === BODY ===
    body = SubElement(act, 'body')

    if structure['chapters']:
        for chp in structure['chapters']:
            build_chapter(body, chp)
    else:
        # Articles without chapters
        for art in structure['articles']:
            build_article(body, art)

    return akomaNtoso


def build_identification(meta_el: Element, meta: dict, title: str, short_name: str):
    """Build FRBR identification block."""
    identification = SubElement(meta_el, 'identification', source=f"#{ORGANIZATION}")

    # FRBRWork
    work = SubElement(identification, 'FRBRWork')
    SubElement(work, 'FRBRthis', value=f"/akn/{COUNTRY}/act/{short_name}/main")
    SubElement(work, 'FRBRuri', value=f"/akn/{COUNTRY}/act/{short_name}")

    # Use the latest history date as the date
    history = meta.get('history', [])
    if history:
        last = history[-1]
        date = last.get('date', '2024-01-01')
    else:
        date = '2024-01-01'

    SubElement(work, 'FRBRdate', date=date, name="publication")
    SubElement(work, 'FRBRauthor', href=f"#{ORGANIZATION}")
    SubElement(work, 'FRBRcountry', value="tw")

    # FRBRExpression
    expr = SubElement(identification, 'FRBRExpression')
    SubElement(expr, 'FRBRthis', value=f"/akn/{COUNTRY}/act/{short_name}/zho@{date}")
    SubElement(expr, 'FRBRuri', value=f"/akn/{COUNTRY}/act/{short_name}/zho@{date}")
    SubElement(expr, 'FRBRdate', date=date, name="publication")
    SubElement(expr, 'FRBRauthor', href=f"#{ORGANIZATION}")
    SubElement(expr, 'FRBRlanguage', language="zho")

    # FRBRManifestation
    manif = SubElement(identification, 'FRBRManifestation')
    SubElement(manif, 'FRBRthis', value=f"/akn/{COUNTRY}/act/{short_name}/zho@{date}.xml")
    SubElement(manif, 'FRBRuri', value=f"/akn/{COUNTRY}/act/{short_name}/zho@{date}")
    SubElement(manif, 'FRBRdate', date=date, name="transform")
    SubElement(manif, 'FRBRauthor', href=f"#{ORGANIZATION}")


def build_lifecycle(meta_el: Element, meta: dict):
    """Build lifecycle block from amendment history."""
    history = meta.get('history', [])
    if not history:
        return

    lifecycle = SubElement(meta_el, 'lifecycle', source=f"#{ORGANIZATION}")
    for idx, entry in enumerate(history):
        date = entry.get('date', '')
        desc = entry.get('description', '')

        # Determine event type
        if idx == 0:
            event_type = "generation"
        elif '修正' in desc:
            event_type = "amendment"
        elif '廢止' in desc:
            event_type = "repeal"
        else:
            event_type = "amendment"

        eventRef = SubElement(lifecycle, 'eventRef',
                              eId=f"e{idx + 1}",
                              date=date,
                              type=event_type,
                              source=f"#{ORGANIZATION}")
        eventRef.set('refersTo', f"#{desc[:30]}")


def build_references(meta_el: Element):
    """Build references block."""
    references = SubElement(meta_el, 'references', source=f"#{ORGANIZATION}")
    org = SubElement(references, 'TLCOrganization',
                     eId="tku-sa",
                     href="/akn/tw-tku/ontology/organization/tku-sa",
                     showAs="Tamkang University Student Association")


def build_chapter(parent: Element, chp: dict):
    """Build a chapter element with its articles."""
    chp_num = cn2num(chp['number'])
    chapter = SubElement(parent, 'chapter', eId=f"chp_{chp_num}")

    num = SubElement(chapter, 'num')
    num.text = f"第{chp['number']}章"

    if chp['title']:
        heading = SubElement(chapter, 'heading')
        heading.text = chp['title']

    for art in chp['articles']:
        build_article(chapter, art)


def build_article(parent: Element, art: dict):
    """Build an article element with its paragraphs."""
    eid = article_eid(art['number'])
    article = SubElement(parent, 'article', eId=eid)

    num = SubElement(article, 'num')
    num.text = f"第{art['number']}條"

    if art.get('title'):
        heading = SubElement(article, 'heading')
        heading.text = art['title']

    # Parse content into paragraphs and items
    content_text = art.get('content', '').strip()
    if not content_text:
        return

    paragraphs = parse_article_content(content_text)
    para_counter = 0

    for para in paragraphs:
        if para['type'] == 'paragraph':
            para_counter += 1
            p_eid = f"{eid}__para_{para_counter}"
            paragraph = SubElement(article, 'paragraph', eId=p_eid)
            content_el = SubElement(paragraph, 'content')
            p_el = SubElement(content_el, 'p')
            p_el.text = para['text']

        elif para['type'] == 'list':
            para_counter += 1
            p_eid = f"{eid}__para_{para_counter}"
            paragraph = SubElement(article, 'paragraph', eId=p_eid)

            if para.get('intro'):
                intro = SubElement(paragraph, 'intro')
                p_el = SubElement(intro, 'p')
                p_el.text = para['intro']

            list_el = SubElement(paragraph, 'list', eId=f"{p_eid}__list_1")

            for item in para['items']:
                item_num = item['num']
                item_eid = f"{p_eid}__list_1__item_{item_num}"
                point = SubElement(list_el, 'point', eId=item_eid)

                num_el = SubElement(point, 'num')
                num_el.text = f"{item_num}."

                content_el = SubElement(point, 'content')
                p_el = SubElement(content_el, 'p')
                p_el.text = item['text']

                # Sub-items
                if item.get('subitems'):
                    sublist = SubElement(point, 'list', eId=f"{item_eid}__list_1")
                    for sub in item['subitems']:
                        sub_eid = f"{item_eid}__list_1__item_{sub['num']}"
                        subpoint = SubElement(sublist, 'point', eId=sub_eid)
                        sub_num_el = SubElement(subpoint, 'num')
                        sub_num_el.text = f"({sub['num']})"
                        sub_content = SubElement(subpoint, 'content')
                        sub_p = SubElement(sub_content, 'p')
                        sub_p.text = sub['text']


def parse_article_content(text: str) -> list:
    """Parse article content into paragraphs and lists."""
    result = []
    lines = text.split('\n')

    current_para_lines = []
    current_list_intro = None
    current_items = []
    current_item = None

    def flush_para():
        nonlocal current_para_lines
        if current_para_lines:
            para_text = ' '.join(current_para_lines).strip()
            if para_text:
                result.append({'type': 'paragraph', 'text': para_text})
            current_para_lines = []

    def flush_list():
        nonlocal current_list_intro, current_items, current_item
        if current_item:
            current_items.append(current_item)
            current_item = None
        if current_items:
            result.append({
                'type': 'list',
                'intro': current_list_intro,
                'items': current_items,
            })
            current_list_intro = None
            current_items = []

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Numbered item: "1. xxx"
        m = re.match(r'^(\d+)\.\s*(.*)', line)
        if m:
            if not current_items and current_para_lines:
                # Previous paragraph text becomes list intro
                current_list_intro = ' '.join(current_para_lines).strip()
                current_para_lines = []
            if current_item:
                current_items.append(current_item)
            current_item = {
                'num': int(m.group(1)),
                'text': m.group(2).strip(),
                'subitems': [],
            }
            continue

        # Sub-item: "   (1) xxx"
        m = re.match(r'^\s*\((\d+)\)\s*(.*)', line)
        if m and current_item:
            current_item['subitems'].append({
                'num': int(m.group(1)),
                'text': m.group(2).strip(),
            })
            continue

        # Regular text
        if current_items or current_item:
            # Text after a list - flush list first
            flush_list()

        current_para_lines.append(line)

    flush_list()
    flush_para()

    return result


# ============================================================
# XML Output
# ============================================================

def prettify_xml(elem: Element) -> str:
    """Pretty-print XML with proper indentation."""
    rough = tostring(elem, encoding='unicode', xml_declaration=False)
    # Add XML declaration
    xml_str = f'<?xml version="1.0" encoding="UTF-8"?>\n{rough}'
    # Use minidom for pretty printing
    dom = minidom.parseString(xml_str)
    pretty = dom.toprettyxml(indent="  ", encoding=None)
    # Remove extra XML declaration from minidom
    lines = pretty.split('\n')
    if lines[0].startswith('<?xml'):
        lines[0] = '<?xml version="1.0" encoding="UTF-8"?>'
    return '\n'.join(line for line in lines if line.strip())


# ============================================================
# Main
# ============================================================

def convert_file(input_path: str, output_path: str):
    """Convert a single Markdown file to AKN XML."""
    with open(input_path, 'r', encoding='utf-8') as f:
        text = f.read()

    meta, body = parse_frontmatter(text)
    structure = parse_markdown_structure(body)

    akn = build_akn(meta, structure)
    xml_str = prettify_xml(akn)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(xml_str)

    title = meta.get('short_name', os.path.basename(input_path))
    chp_count = len(structure['chapters'])
    art_count = len(structure['articles']) + sum(len(c['articles']) for c in structure['chapters'])
    return title, chp_count, art_count


def main():
    if len(sys.argv) < 3:
        print(f"Usage: python {sys.argv[0]} <input.md|input_dir> <output.xml|output_dir>")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    if os.path.isdir(input_path):
        # Batch mode
        os.makedirs(output_path, exist_ok=True)
        md_files = sorted(f for f in os.listdir(input_path) if f.endswith('.md'))

        print(f"Converting {len(md_files)} files...")
        for md_file in md_files:
            in_path = os.path.join(input_path, md_file)
            xml_file = md_file.replace('.md', '.xml')
            out_path = os.path.join(output_path, xml_file)

            try:
                title, chp_count, art_count = convert_file(in_path, out_path)
                print(f"  [OK] {xml_file} ({chp_count} chp, {art_count} art)")
            except Exception as e:
                print(f"  [ERR] {xml_file}: {e}")
    else:
        # Single file
        title, chp_count, art_count = convert_file(input_path, output_path)
        print(f"[OK] {title} ({chp_count} chp, {art_count} art)")


if __name__ == '__main__':
    main()
