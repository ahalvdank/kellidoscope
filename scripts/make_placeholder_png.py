#!/usr/bin/env python3
"""Write a solid-colour 1200x630 PNG placeholder (stdlib only).

Usage: make_placeholder_png.py OUT_PATH [RRGGBB]
"""
import struct
import sys
import zlib
from pathlib import Path

WIDTH, HEIGHT = 1200, 630


def chunk(kind: bytes, data: bytes) -> bytes:
    body = kind + data
    return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))


def solid_png(rgb: tuple[int, int, int]) -> bytes:
    row = b"\x00" + bytes(rgb) * WIDTH  # filter type 0 + pixels
    raw = row * HEIGHT
    ihdr = struct.pack(">IIBBBBB", WIDTH, HEIGHT, 8, 2, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


if __name__ == "__main__":
    hexcolor = sys.argv[2] if len(sys.argv) > 2 else "1F2937"
    rgb = tuple(int(hexcolor[i : i + 2], 16) for i in (0, 2, 4))
    Path(sys.argv[1]).write_bytes(solid_png(rgb))
