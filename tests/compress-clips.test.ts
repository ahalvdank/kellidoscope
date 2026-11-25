import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Homebrew's bin dir is not always on the PATH vitest inherits (e.g. GUI-launched shells), so
// append it for the child processes; the tests skip when ffmpeg is still not found.
const FFMPEG_DIR = "/opt/homebrew/bin";
const ENV = { ...process.env, PATH: `${process.env.PATH ?? ""}:${FFMPEG_DIR}` };
const SCRIPT = path.resolve(__dirname, "../scripts/compress-clips.sh");
const hasFfmpeg = spawnSync("ffmpeg", ["-version"], { env: ENV }).status === 0;

const run = (cmd: string, args: string[]) => spawnSync(cmd, args, { env: ENV, encoding: "utf8" });
const probe = (file: string, entries: string, stream = "v:0") =>
  run("ffprobe", ["-v", "error", "-select_streams", stream, "-show_entries", `stream=${entries}`, "-of", "default=nw=1", file]);
const probeValue = (file: string, key: string) =>
  (probe(file, key).stdout.match(new RegExp(`${key}=(.*)`)) ?? [])[1];
const generate = (out: string, seconds: number) =>
  run("ffmpeg", [
    "-y", "-f", "lavfi", "-i", `testsrc=duration=${seconds}:size=1920x1080:rate=10`,
    "-f", "lavfi", "-i", `sine=frequency=440:duration=${seconds}`,
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", out,
  ]);

let dir: string;
beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "compress-clips-"));
});
afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("compress-clips.sh", () => {
  it.skipIf(!hasFfmpeg)("compresses a 1080p clip to a 1280-wide silent faststart h264 mp4 with a poster", () => {
    const input = path.join(dir, "raw.mp4");
    expect(generate(input, 4).status).toBe(0);
    const out = path.join(dir, "nested", "out", "clip.mp4");

    const res = run(SCRIPT, [input, out]);
    expect(res.status, res.stderr).toBe(0);

    expect(probeValue(out, "width")).toBe("1280");
    expect(Number(probeValue(out, "height")) % 2).toBe(0);
    expect(probeValue(out, "codec_name")).toBe("h264");
    expect(probeValue(out, "pix_fmt")).toBe("yuv420p");
    expect(probe(out, "codec_type", "a").stdout.trim()).toBe("");
    const bytes = fs.readFileSync(out);
    expect(bytes.indexOf("moov")).toBeGreaterThan(-1);
    expect(bytes.indexOf("moov")).toBeLessThan(bytes.indexOf("mdat"));
    expect(fs.statSync(path.join(dir, "nested", "out", "clip-poster.jpg")).size).toBeGreaterThan(0);
    expect(res.stdout).toMatch(/bytes|KB|MB/);
  });

  it.skipIf(!hasFfmpeg)("accepts .webm input and falls back to the first frame for clips under 2 s", () => {
    const input = path.join(dir, "short.webm");
    const gen = run("ffmpeg", ["-y", "-f", "lavfi", "-i", "testsrc=duration=1:size=640x360:rate=10", "-c:v", "libvpx", input]);
    expect(gen.status, gen.stderr).toBe(0);
    const out = path.join(dir, "short.mp4");

    const res = run(SCRIPT, [input, out]);
    expect(res.status, res.stderr).toBe(0);
    expect(probeValue(out, "width")).toBe("640");
    expect(fs.statSync(path.join(dir, "short-poster.jpg")).size).toBeGreaterThan(0);
  });

  it("exits 1 on a .txt input", () => {
    const input = path.join(dir, "notes.txt");
    fs.writeFileSync(input, "not a video");
    const res = run(SCRIPT, [input, path.join(dir, "x.mp4")]);
    expect(res.status).toBe(1);
    expect(res.stderr).toMatch(/extension|\.mov|\.mp4/i);
  });

  it("exits 1 when the input does not exist", () => {
    const res = run(SCRIPT, [path.join(dir, "missing.mp4"), path.join(dir, "x.mp4")]);
    expect(res.status).toBe(1);
    expect(res.stderr).toMatch(/compress-clips: input not found:/);
  });

  it("exits 1 with a usage message when no input is given", () => {
    const res = run(SCRIPT, []);
    expect(res.status).toBe(1);
    expect(res.stderr).toMatch(/usage/i);
  });

  it.skipIf(!hasFfmpeg)("warns on stderr but exits 0 when output reaches COMPRESS_MAX_BYTES", () => {
    const input = path.join(dir, "warn.mp4");
    expect(generate(input, 2).status).toBe(0);
    const out = path.join(dir, "warn-out.mp4");
    const res = spawnSync(SCRIPT, [input, out], { env: { ...ENV, COMPRESS_MAX_BYTES: "1" }, encoding: "utf8" });
    expect(res.status, res.stderr).toBe(0);
    expect(res.stderr).toMatch(/WARNING/);
    expect(fs.existsSync(out)).toBe(true);
  });

  it("exits 1 with the ffmpeg message when ffmpeg is not on PATH", () => {
    const input = path.join(dir, "noffmpeg.mp4");
    fs.writeFileSync(input, "placeholder");
    const emptyBin = fs.mkdtempSync(path.join(os.tmpdir(), "compress-clips-path-"));
    try {
      const res = spawnSync("/bin/bash", [SCRIPT, input, path.join(dir, "o.mp4")], {
        env: { ...process.env, PATH: emptyBin },
        encoding: "utf8",
      });
      expect(res.status).toBe(1);
      expect(res.stderr).toMatch(/compress-clips: ffmpeg not found on PATH/);
    } finally {
      fs.rmSync(emptyBin, { recursive: true, force: true });
    }
  });

  it.each([
    ["starts with a dash", "-o.mp4", /must not start with '-'/],
    ["does not end in .mp4", "out.mov", /must end in \.mp4/],
  ])("exits 1 when the output path %s", (_name, outName, message) => {
    const input = path.join(dir, "valid-in.mp4");
    fs.writeFileSync(input, "placeholder");
    const out = outName.startsWith("-") ? outName : path.join(dir, outName);
    const res = spawnSync(SCRIPT, [input, out], { env: ENV, encoding: "utf8", cwd: dir });
    expect(res.status).toBe(1);
    expect(res.stderr).toMatch(message);
  });

  it("exits 1 when the output path equals the input", () => {
    const input = path.join(dir, "same.mp4");
    fs.writeFileSync(input, "placeholder");
    const res = run(SCRIPT, [input, input]);
    expect(res.status).toBe(1);
    expect(res.stderr).toMatch(/must differ from the input/);
  });
});
