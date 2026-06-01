#!/usr/bin/env python3
"""
Rivoly Website — Auto-translate i18n.js using Claude Haiku.

Usage:
    export ANTHROPIC_API_KEY='sk-ant-...'
    python3 translate_site.py

- Reads the 'en' dictionary from i18n.js as source.
- For each target language, translates ONLY missing keys.
- Writes results back to i18n.js (preserves existing translations).
- Keys with HTML (<em>, <br>) are translated with HTML intact.
"""

import os, re, json, time
import anthropic

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
I18N_PATH = os.path.join(SCRIPT_DIR, "i18n.js")

TARGET_LANGS = {
    "de": "German",
    "fr": "French",
    "es": "Spanish",
    "pt": "Portuguese",
    "it": "Italian",
    "nl": "Dutch",
    "pl": "Polish",
    "ru": "Russian",
    "ar": "Arabic",
    "fa": "Persian (Farsi)",
    "ur": "Urdu",
    "hi": "Hindi",
    "bn": "Bengali",
    "id": "Indonesian",
    "vi": "Vietnamese",
    "th": "Thai",
    "fil": "Filipino (Tagalog)",
    "sw": "Swahili",
    "ha": "Hausa",
    "kk": "Kazakh",
    "uz": "Uzbek",
    "tk": "Turkmen",
}

SYSTEM_PROMPT = (
    "You are a professional marketing translator. "
    "Translate the given JSON key-value pairs into {lang}. "
    "Rules:\n"
    "- Keep brand name 'Rivoly' unchanged.\n"
    "- Keep HTML tags (<em>, <br>, etc.) exactly as-is, only translate text.\n"
    "- Keep special characters like →, ✓, ●, ₺, ⚠ unchanged.\n"
    "- Keep numbers and symbols (#TXN-2847, 9:41, ₺248, etc.) unchanged.\n"
    "- Use a natural, friendly marketing tone.\n"
    "- Return ONLY a valid JSON object with the same keys, no explanation."
)

BATCH_SIZE = 40


def load_i18n_js():
    with open(I18N_PATH, "r", encoding="utf-8") as f:
        content = f.read()
    return content


def extract_en_dict(js_content):
    """Extract the 'en' object from the RIVOLY_I18N assignment."""
    # Find en: { ... } block — parse as JSON after extracting
    match = re.search(r'\ben:\s*(\{.*?\n\})', js_content, re.DOTALL)
    if not match:
        raise ValueError("Could not find 'en' dictionary in i18n.js")
    en_str = match.group(1)
    # Convert JS object to JSON (keys are already quoted)
    try:
        return json.loads(en_str)
    except json.JSONDecodeError as e:
        raise ValueError(f"Could not parse 'en' dictionary: {e}")


def extract_lang_dict(js_content, lang):
    """Extract existing translations for a language, or return empty dict."""
    pattern = rf'\b{re.escape(lang)}:\s*(\{{.*?\n\}})'
    match = re.search(pattern, js_content, re.DOTALL)
    if not match:
        return {}
    try:
        return json.loads(match.group(1))
    except json.JSONDecodeError:
        return {}


def translate_batch(client, keys_values, lang_name):
    """Translate a batch of {key: value} using Claude Haiku."""
    prompt = f"Translate these UI strings into {lang_name}:\n\n{json.dumps(keys_values, ensure_ascii=False, indent=2)}"
    msg = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=4096,
        system=SYSTEM_PROMPT.replace("{lang}", lang_name),
        messages=[{"role": "user", "content": prompt}],
    )
    text = msg.content[0].text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        text = re.sub(r"^```[a-z]*\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
    return json.loads(text)


def build_lang_block(lang, d):
    """Render a language dictionary as a JS object literal."""
    lines = [f"\n{lang}: {{"]
    for k, v in d.items():
        esc_v = v.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
        lines.append(f'  "{k}": "{esc_v}",')
    # Remove trailing comma from last entry
    if lines[-1].endswith(","):
        lines[-1] = lines[-1][:-1]
    lines.append("}")
    return "\n".join(lines)


def update_i18n_js(js_content, lang, new_dict):
    """Insert or replace a language block in the JS file."""
    block = build_lang_block(lang, new_dict)

    # Check if the block already exists
    pattern = rf'\n{re.escape(lang)}:\s*\{{.*?\n\}}'
    if re.search(pattern, js_content, re.DOTALL):
        return re.sub(pattern, block, js_content, flags=re.DOTALL)
    else:
        # Insert before the closing `};` of RIVOLY_I18N
        return re.sub(r'\n\};\s*$', f',\n{block}\n\n}};', js_content)


def main():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY not set.")
        return

    client = anthropic.Anthropic(api_key=api_key)
    js_content = load_i18n_js()
    en_dict = extract_en_dict(js_content)
    print(f"Source: {len(en_dict)} English keys")

    for lang, lang_name in TARGET_LANGS.items():
        existing = extract_lang_dict(js_content, lang)
        missing = {k: v for k, v in en_dict.items() if k not in existing}
        if not missing:
            print(f"[{lang}] {lang_name} — all {len(existing)} keys present, skipping.")
            continue

        print(f"[{lang}] {lang_name} — translating {len(missing)} missing keys...")
        translated = {}
        items = list(missing.items())
        for i in range(0, len(items), BATCH_SIZE):
            batch = dict(items[i:i+BATCH_SIZE])
            try:
                result = translate_batch(client, batch, lang_name)
                translated.update(result)
                print(f"  batch {i//BATCH_SIZE+1}: {len(result)} keys ✓")
                time.sleep(0.5)
            except Exception as e:
                print(f"  batch {i//BATCH_SIZE+1}: ERROR — {e}")
                # Fall back to English for failed batch
                translated.update(batch)

        merged = {**en_dict}  # start with all EN keys as fallback order
        merged.update(existing)
        merged.update(translated)

        js_content = update_i18n_js(js_content, lang, merged)
        with open(I18N_PATH, "w", encoding="utf-8") as f:
            f.write(js_content)
        print(f"  [{lang}] saved.")

    print("\nDone. All languages written to i18n.js.")


if __name__ == "__main__":
    main()
