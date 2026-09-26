#!/usr/bin/env python3
"""Recover the structured 6,236-ayah search index from the user's reference Hermes APK bundle."""
from __future__ import annotations

import argparse
import json
import re
from ctypes import LittleEndianStructure, c_uint8, c_uint32, c_uint64, sizeof
from enum import IntEnum
from io import BytesIO
from pathlib import Path
from struct import unpack


class Header(LittleEndianStructure):
    _pack_ = 1
    _fields_ = [
        ('magic', c_uint64), ('version', c_uint32), ('sourceHash', c_uint8 * 20),
        ('fileLength', c_uint32), ('globalCodeIndex', c_uint32), ('functionCount', c_uint32),
        ('stringKindCount', c_uint32), ('identifierCount', c_uint32), ('stringCount', c_uint32),
        ('overflowStringCount', c_uint32), ('stringStorageSize', c_uint32),
        ('bigIntCount', c_uint32), ('bigIntStorageSize', c_uint32),
        ('regExpCount', c_uint32), ('regExpStorageSize', c_uint32),
        ('literalValueBufferSize', c_uint32), ('objKeyBufferSize', c_uint32),
        ('objShapeTableCount', c_uint32), ('numStringSwitchImms', c_uint32),
        ('segmentID', c_uint32), ('cjsModuleCount', c_uint32),
        ('functionSourceCount', c_uint32), ('debugInfoOffset', c_uint32), ('options', c_uint8),
    ]


class Tag(IntEnum):
    NullTag = 0
    TrueTag = 1
    FalseTag = 2
    NumberTag = 3
    LongStringTag = 4
    ShortStringTag = 5
    ByteStringTag = 6
    IntegerTag = 7


def align(pos: int, n: int = 4) -> int:
    return (pos + n - 1) // n * n


def unpack_slp(data: bytes, count: int):
    stream = BytesIO(data)
    out = []
    while len(out) < count:
        first = stream.read(1)
        if not first:
            break
        tag = Tag((first[0] >> 4) & 7)
        if first[0] >> 7:
            nxt = stream.read(1)
            if not nxt:
                break
            run_length = ((first[0] & 15) << 8) | nxt[0]
        else:
            run_length = first[0] & 15
        for _ in range(run_length):
            if tag == Tag.NullTag:
                value = None
            elif tag == Tag.TrueTag:
                value = True
            elif tag == Tag.FalseTag:
                value = False
            elif tag == Tag.NumberTag:
                raw = stream.read(8)
                if len(raw) != 8:
                    return out
                value = unpack('<d', raw)[0]
            elif tag == Tag.LongStringTag:
                raw = stream.read(4)
                if len(raw) != 4:
                    return out
                value = int.from_bytes(raw, 'little')
            elif tag == Tag.ShortStringTag:
                raw = stream.read(2)
                if len(raw) != 2:
                    return out
                value = int.from_bytes(raw, 'little')
            elif tag == Tag.ByteStringTag:
                raw = stream.read(1)
                if len(raw) != 1:
                    return out
                value = raw[0]
            elif tag == Tag.IntegerTag:
                raw = stream.read(4)
                if len(raw) != 4:
                    return out
                value = int.from_bytes(raw, 'little')
            out.append((tag, value))
            if len(out) == count:
                break
    return out


def parse_layout(bundle: bytes):
    header = Header.from_buffer_copy(bundle[:sizeof(Header)])
    assert header.magic == 0x1F1903C103BC1FC6, hex(header.magic)
    assert header.version == 98, f'unsupported Hermes HBC version: {header.version}'

    pos = align(sizeof(Header), 32) + header.functionCount * 12
    pos = align(pos); pos += header.stringKindCount * 4
    pos = align(pos); pos += header.identifierCount * 4
    pos = align(pos)

    entries = []
    for _ in range(header.stringCount):
        value = int.from_bytes(bundle[pos:pos+4], 'little'); pos += 4
        entries.append((value & 1, (value >> 1) & ((1 << 23) - 1), (value >> 24) & 255))

    pos = align(pos)
    overflow = []
    for _ in range(header.overflowStringCount):
        overflow.append((int.from_bytes(bundle[pos:pos+4], 'little'), int.from_bytes(bundle[pos+4:pos+8], 'little')))
        pos += 8

    pos = align(pos)
    storage = bundle[pos:pos+header.stringStorageSize]; pos += header.stringStorageSize
    strings = []
    for is16, offset, length in entries:
        if length == 255:
            offset, length = overflow[offset]
        raw = storage[offset:offset + length * (2 if is16 else 1)]
        strings.append(raw.decode('utf-16le', 'surrogatepass') if is16 else raw.decode('latin1'))

    pos = align(pos)
    literal_values = bundle[pos:pos+header.literalValueBufferSize]; pos += header.literalValueBufferSize
    pos = align(pos)
    object_keys = bundle[pos:pos+header.objKeyBufferSize]; pos += header.objKeyBufferSize
    pos = align(pos)
    shapes = []
    for _ in range(header.objShapeTableCount):
        offset = int.from_bytes(bundle[pos:pos+4], 'little')
        count = int.from_bytes(bundle[pos+4:pos+8], 'little')
        pos += 8
        shapes.append((offset, count))

    return strings, literal_values, object_keys, shapes


def locate_verse_shape(strings, object_keys, shapes) -> int:
    target = ['surahNumber', 'ayahNumber', 'mushafPage', 'text']
    matches = []
    for index, (offset, count) in enumerate(shapes):
        if count != 4:
            continue
        values = unpack_slp(object_keys[offset:], count)
        keys = []
        for tag, value in values:
            if tag not in (Tag.LongStringTag, Tag.ShortStringTag, Tag.ByteStringTag) or not isinstance(value, int) or value >= len(strings):
                keys = []
                break
            keys.append(strings[value])
        if keys == target:
            matches.append(index)
    assert matches == [482], f'unexpected exact verse object shape(s): {matches}'
    return matches[0]


def recover_records(bundle: bytes):
    strings, literal, object_keys, shapes = parse_layout(bundle)
    shape = locate_verse_shape(strings, object_keys, shapes)
    records = []
    seen = set()

    def add_candidate(offset: int):
        if offset >= len(literal):
            return
        values = unpack_slp(literal[offset:], 4)
        if len(values) != 4:
            return
        raw_values = [value for _, value in values]
        if not all(isinstance(value, (int, float)) and not isinstance(value, bool) for value in raw_values[:3]):
            return
        text_tag, string_id = values[3]
        if text_tag not in (Tag.LongStringTag, Tag.ShortStringTag, Tag.ByteStringTag):
            return
        if not isinstance(string_id, int) or not 0 <= string_id < len(strings):
            return
        text = strings[string_id]
        if not re.search(r'[\u0600-\u06ff]', text):
            return
        record = (int(raw_values[0]), int(raw_values[1]), int(raw_values[2]), text)
        if record not in seen:
            seen.add(record)
            records.append(record)

    for i in range(len(bundle) - 6):
        if bundle[i] == 1 and int.from_bytes(bundle[i+2:i+4], 'little') == shape:
            add_candidate(int.from_bytes(bundle[i+4:i+6], 'little'))
    for i in range(len(bundle) - 10):
        if bundle[i] == 2 and int.from_bytes(bundle[i+2:i+6], 'little') == shape:
            add_candidate(int.from_bytes(bundle[i+6:i+10], 'little'))

    records.sort(key=lambda row: (row[0], row[1]))
    return [
        {'surahNumber': surah, 'ayahNumber': ayah, 'mushafPage': page, 'text': text}
        for surah, ayah, page, text in records
    ]


def validate(rows) -> None:
    assert len(rows) == 6236, len(rows)
    assert len({row['surahNumber'] for row in rows}) == 114
    assert min(row['mushafPage'] for row in rows) == 1
    assert max(row['mushafPage'] for row in rows) == 604
    assert len({(row['surahNumber'], row['ayahNumber']) for row in rows}) == 6236
    by_key = {(row['surahNumber'], row['ayahNumber']): row for row in rows}
    assert by_key[(1, 2)] == {'surahNumber':1, 'ayahNumber':2, 'mushafPage':1, 'text':'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ'}
    assert by_key[(2, 6)]['mushafPage'] == 3
    assert by_key[(114, 6)] == {'surahNumber':114, 'ayahNumber':6, 'mushafPage':604, 'text':'مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ'}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('bundle', type=Path)
    parser.add_argument('--json-out', type=Path)
    parser.add_argument('--ts-out', type=Path)
    args = parser.parse_args()
    rows = recover_records(args.bundle.read_bytes())
    validate(rows)
    compact = json.dumps(rows, ensure_ascii=False, separators=(',', ':'))
    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(compact, encoding='utf-8')
    if args.ts_out:
        args.ts_out.parent.mkdir(parents=True, exist_ok=True)
        args.ts_out.write_text(
            "import type {VerseSearchEntry} from '../services/VerseSearchService';\n\n"
            f"export const VERSE_INDEX: readonly VerseSearchEntry[] = {compact} as const;\n",
            encoding='utf-8',
        )
    print(f'EXACT_INDEX_RECORDS={len(rows)}')
    print('EXACT_INDEX_SOURCE=USER_SUPPLIED_REFERENCE_APK')


if __name__ == '__main__':
    main()
