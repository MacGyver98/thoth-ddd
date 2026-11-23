import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { mergeManaged, writeGeneratedFiles } from "../src/install.js";
import { MANAGED_BEGIN, MANAGED_END } from "../src/targets.js";

async function tempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "thoth-ddd-test-"));
}

test("mergeManaged appends to a user-owned file without dropping content", () => {
  const existing = "# My instructions\n\nKeep this.\n";
  const generated = `${MANAGED_BEGIN}\nthoth rules\n${MANAGED_END}\n`;
  const merged = mergeManaged(existing, generated);
  assert.match(merged, /Keep this\./);
  assert.match(merged, /thoth rules/);
  assert.equal(mergeManaged(merged, generated), merged, "merge is idempotent");
});

test("mergeManaged replaces an older managed block in place", () => {
  const existing = [
    "# Header",
    "",
    MANAGED_BEGIN,
    "old content",
    MANAGED_END,
    "",
    "## Footer",
    "keep me",
  ].join("\n");
  const generated = `${MANAGED_BEGIN}\nnew content\n${MANAGED_END}\n`;
  const merged = mergeManaged(existing, generated);
  assert.match(merged, /new content/);
  assert.doesNotMatch(merged, /old content/);
  assert.match(merged, /keep me/);
  assert.match(merged, /# Header/);
});

test("installer creates files and is idempotent", async () => {
  const dir = await tempDir();
  const files = [{ path: "a/b.md", content: "hello" }];
  const first = await writeGeneratedFiles(files, { targetDir: dir });
  assert.equal(first[0].action, "created");
  assert.equal(await readFile(join(dir, "a/b.md"), "utf8"), "hello");

  const second = await writeGeneratedFiles(files, { targetDir: dir });
  assert.equal(second[0].action, "unchanged");
});

test("installer skips conflicting files unless force is set", async () => {
  const dir = await tempDir();
  await mkdir(join(dir, "a"), { recursive: true });
  await writeFile(join(dir, "a/b.md"), "user content");
  const files = [{ path: "a/b.md", content: "generated" }];

  const skipped = await writeGeneratedFiles(files, { targetDir: dir });
  assert.equal(skipped[0].action, "skipped");
  assert.equal(await readFile(join(dir, "a/b.md"), "utf8"), "user content");

  const forced = await writeGeneratedFiles(files, { targetDir: dir, force: true });
  assert.equal(forced[0].action, "updated");
  assert.equal(await readFile(join(dir, "a/b.md"), "utf8"), "generated");
});

test("installer merges managed files instead of replacing them", async () => {
  const dir = await tempDir();
  await writeFile(join(dir, "AGENTS.md"), "# Existing\n\nDo not lose this.\n");
  const files = [
    {
      path: "AGENTS.md",
      content: `# Generated\n\n${MANAGED_BEGIN}\nthoth gateway\n${MANAGED_END}\n`,
    },
  ];
  await writeGeneratedFiles(files, { targetDir: dir });
  const result = await readFile(join(dir, "AGENTS.md"), "utf8");
  assert.match(result, /Do not lose this\./);
  assert.match(result, /thoth gateway/);
});

test("dry-run never writes", async () => {
  const dir = await tempDir();
  const result = await writeGeneratedFiles(
    [{ path: "x.md", content: "x" }],
    { targetDir: dir, dryRun: true },
  );
  assert.equal(result[0].action, "dry-run");
  await assert.rejects(() => readFile(join(dir, "x.md")));
});

test("installer rejects duplicate output paths before any write", async () => {
  const dir = await tempDir();
  await assert.rejects(
    () =>
      writeGeneratedFiles(
        [
          { path: "a.md", content: "1" },
          { path: "a.md", content: "2" },
        ],
        { targetDir: dir },
      ),
    /duplicate output path/,
  );
});
