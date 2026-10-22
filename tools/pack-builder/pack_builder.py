#!/usr/bin/env python3
"""
TTRPG Helper - Content Pack Builder CLI
Packages creature collections into standard Content Packs:
- manifest.json / manifest.toml (system_id, edition, version, author, count)
- creatures.db (SQLite with indices on name, cr_or_level, type, tags)
- .pack / .pack.json bundles
"""

import os
import sys
import json
import sqlite3
import argparse
import time
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent.parent

def build_sqlite_creatures_db(db_path: Path, creatures: list, system_id: str):
    """Creates a standardized creatures.db with indices on name, cr/level, type, tags."""
    if db_path.exists():
        db_path.unlink()

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE creatures (
            id TEXT PRIMARY KEY,
            system_id TEXT NOT NULL,
            name TEXT NOT NULL,
            name_en TEXT,
            name_ru TEXT,
            cr_or_level TEXT,
            creature_type TEXT,
            size TEXT,
            ac INTEGER,
            hp INTEGER,
            tags TEXT,
            data_json TEXT NOT NULL
        )
    """)

    # Indices as specified in requirements
    cursor.execute("CREATE INDEX idx_creatures_name ON creatures(name);")
    cursor.execute("CREATE INDEX idx_creatures_cr_or_level ON creatures(cr_or_level);")
    cursor.execute("CREATE INDEX idx_creatures_type ON creatures(creature_type);")
    cursor.execute("CREATE INDEX idx_creatures_tags ON creatures(tags);")

    rows = []
    for c in creatures:
        cid = str(c.get("id", ""))
        name = str(c.get("name", c.get("name_en", c.get("name_ru", "Unknown"))))
        name_en = str(c.get("name_en", ""))
        name_ru = str(c.get("name_ru", ""))
        cr_or_level = str(c.get("cr_or_level", c.get("cr", c.get("level", "1"))))
        creature_type = str(c.get("creature_type", "Humanoid"))
        size = str(c.get("size", "Medium"))
        ac = int(c.get("ac", 10))
        hp = int(c.get("hp_average", c.get("hp", c.get("stats", {}).get("hp", 10))))
        
        tags_list = c.get("tags", [])
        if not tags_list and "traits" in c.get("customFields", {}):
            tags_list = c["customFields"]["traits"]
        tags_str = ",".join(tags_list) if isinstance(tags_list, list) else str(tags_list)

        data_json = json.dumps(c, ensure_ascii=False)

        rows.append((
            cid, system_id, name, name_en, name_ru, cr_or_level,
            creature_type, size, ac, hp, tags_str, data_json
        ))

    cursor.executemany("""
        INSERT INTO creatures (
            id, system_id, name, name_en, name_ru, cr_or_level,
            creature_type, size, ac, hp, tags, data_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, rows)

    conn.commit()
    conn.close()


def generate_manifest_toml(manifest: dict) -> str:
    """Generates manifest.toml representation of pack metadata."""
    lines = [
        f'id = "{manifest.get("id", "")}"',
        f'name = "{manifest.get("name", "")}"',
        f'system_id = "{manifest.get("system_id", "")}"',
        f'edition = "{manifest.get("edition", "")}"',
        f'version = "{manifest.get("version", "1.0.0")}"',
        f'author = "{manifest.get("author", "")}"',
        f'count = {manifest.get("count", 0)}',
        f'description = "{manifest.get("description", "").replace(chr(10), " ")}"',
        f'created_at = "{manifest.get("created_at", "")}"',
    ]
    if "license" in manifest:
        lines.append(f'license = "{manifest.get("license", "")}"')
    if "tags" in manifest and isinstance(manifest["tags"], list):
        tags_json = json.dumps(manifest["tags"])
        lines.append(f'tags = {tags_json}')
    return "\n".join(lines) + "\n"


def package_pack_file(pack_json_path: Path, output_dir: Path):
    """Processes a pack.json and produces manifest.json, manifest.toml, creatures.db and .pack."""
    t0 = time.time()
    with open(pack_json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    manifest = data.get("manifest", {})
    creatures = data.get("creatures", [])
    pack_id = manifest.get("id", pack_json_path.stem.replace(".pack", ""))
    system_id = manifest.get("system_id", "custom")

    pack_bundle_dir = output_dir / pack_id
    pack_bundle_dir.mkdir(parents=True, exist_ok=True)

    # 1. Write manifest.json & manifest.toml
    manifest_json_path = pack_bundle_dir / "manifest.json"
    with open(manifest_json_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    manifest_toml_path = pack_bundle_dir / "manifest.toml"
    with open(manifest_toml_path, "w", encoding="utf-8") as f:
        f.write(generate_manifest_toml(manifest))

    # 2. Write creatures.db (SQLite with indices)
    db_path = pack_bundle_dir / "creatures.db"
    build_sqlite_creatures_db(db_path, creatures, system_id)

    # 3. Write copy of .pack (compact bundle)
    pack_out_file = output_dir / f"{pack_id}.pack"
    with open(pack_out_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)

    # 4. Write copy of .pack.json
    pack_json_out_file = output_dir / f"{pack_id}.pack.json"
    with open(pack_json_out_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    duration_ms = int((time.time() - t0) * 1000)
    db_size = db_path.stat().st_size
    json_size = pack_json_out_file.stat().st_size

    print(f"  [OK] Pack '{pack_id}': {len(creatures)} creatures")
    print(f"       -> JSON size: {json_size / 1024:.1f} KB | SQLite DB: {db_size / 1024:.1f} KB ({duration_ms} ms)")
    return {
        "id": pack_id,
        "creatures": len(creatures),
        "json_size": json_size,
        "db_size": db_size,
        "duration_ms": duration_ms
    }


def main():
    parser = argparse.ArgumentParser(description="TTRPG Content Pack Builder")
    parser.add_argument("--pack", type=str, help="Path to single .pack.json to process")
    parser.add_argument("--out", type=str, default=str(PROJECT_ROOT / "packs"), help="Output directory")
    parser.add_argument("--build-all", action="store_true", help="Build SQLite databases for all packs in packs/")
    args = parser.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    print("=== TTRPG Content Pack Builder (SQLite + JSON) ===")

    if args.pack:
        pack_path = Path(args.pack)
        if not pack_path.exists():
            print(f"Error: {pack_path} not found")
            sys.exit(1)
        package_pack_file(pack_path, out_dir)
    else:
        # Scan for existing packs in packs/
        pack_files = list(out_dir.glob("*.pack.json"))
        if not pack_files:
            print(f"No .pack.json files found in {out_dir}. Run pack-builder.ts first.")
            sys.exit(1)

        for p in pack_files:
            package_pack_file(p, out_dir)

    print("\n[Done] All requested content packs packaged successfully.")


if __name__ == "__main__":
    main()
