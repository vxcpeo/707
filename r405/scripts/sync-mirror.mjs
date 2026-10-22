import { cp, lstat, mkdir, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";

const run = promisify(execFile);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const dryRun = process.argv.includes("--dry-run");
const ownedDirectories = ["src", "public", "tests", "scripts"];
const ownedFiles = [
  "index.html", "vite.config.js", "playwright.config.js", ".env.example",
  "package.json", "package-lock.json",
];

async function exists(target) {
  try { await lstat(target); return true; }
  catch (error) { if (error.code === "ENOENT") return false; throw error; }
}

async function findWorkspace(start) {
  let candidate = start;
  while (true) {
    if (await exists(path.join(candidate, "contracts")) &&
        await exists(path.join(candidate, "website", "src", "App.vue")) &&
        await exists(path.join(candidate, "website", "package.json")))
      return realpath(candidate);
    const parent = path.dirname(candidate);
    if (parent === candidate) throw new Error("Cannot locate the primary website workspace.");
    candidate = parent;
  }
}

const workspace = await findWorkspace(scriptDirectory);
const root = await realpath(path.join(workspace, "website"));
const mirrorNames = ["r405", "a707", path.join("a707", "r405")];
const mirrors = mirrorNames.map((name) => path.resolve(root, name));
const archiveBase = path.resolve(workspace, "output", "rebrand");
const archive = path.join(archiveBase, `mirrors-before-probiuna-${new Date().toISOString().replace(/[:.]/g, "-")}`);

function assertInside(parent, target) {
  const relative = path.relative(parent, target);
  if (!relative || relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative))
    throw new Error(`Path is outside its permitted directory: ${target}`);
}

// Refuse links or junctions before recursive copies, archive writes, or removals.
async function validateTree(target) {
  const info = await lstat(target);
  if (info.isSymbolicLink()) throw new Error(`Refusing a linked path: ${target}`);
  if (info.isDirectory())
    for (const entry of await readdir(target)) await validateTree(path.join(target, entry));
}

async function filesIn(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = path.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await filesIn(path.join(directory, entry.name), name));
    else files.push(name);
  }
  return files.sort();
}

async function hashFile(target) {
  return createHash("sha256").update(await readFile(target)).digest("hex");
}

async function hashesIn(directory) {
  const hashes = {};
  for (const name of await filesIn(directory)) hashes[name] = await hashFile(path.join(directory, name));
  return hashes;
}

async function verifiedArchive(source, destination) {
  await validateTree(source);
  assertInside(archive, destination);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true });
  const info = await lstat(source);
  const before = info.isDirectory() ? await hashesIn(source) : await hashFile(source);
  const after = info.isDirectory() ? await hashesIn(destination) : await hashFile(destination);
  if (JSON.stringify(before) !== JSON.stringify(after))
    throw new Error(`Archive verification failed: ${source}`);
}

async function replacePublic(mirror) {
  const target = path.resolve(mirror, "public");
  assertInside(root, target);
  if (path.dirname(target) !== mirror) throw new Error(`Unexpected public directory: ${target}`);
  if (await exists(target)) {
    assertInside(mirror, await realpath(target));
    await validateTree(target);
    // The exact current tree has already been archived and hash-checked.
    await rm(target, { recursive: true });
  }
  await cp(path.join(root, "public"), target, { recursive: true });
}

const deploymentHashes = {};
for (const app of [root, ...mirrors]) {
  if (app !== root) {
    assertInside(root, app);
    if (await realpath(app) !== app) throw new Error(`Refusing a linked mirror: ${app}`);
  }
  deploymentHashes[app] = await hashFile(path.join(app, "src", "deployment.json"));
}
for (const name of [...ownedDirectories, ...ownedFiles]) await validateTree(path.join(root, name));
for (const mirror of mirrors)
  for (const name of [...ownedDirectories, ...ownedFiles, "dist"])
    if (await exists(path.join(mirror, name))) await validateTree(path.join(mirror, name));

const sourcePackage = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const sourceLock = JSON.parse(await readFile(path.join(root, "package-lock.json"), "utf8"));
if (sourcePackage.name !== sourceLock.name || sourcePackage.name !== sourceLock.packages[""].name)
  throw new Error("Primary package and lockfile names differ; fix them before syncing.");

const plan = {
  source: root, mirrors, archive, directories: ownedDirectories, files: ownedFiles,
  preserved: ["src/deployment.json", ".git", ".env", "other deployment and chain records"],
  build: "Each mirror is rebuilt from its own source using the installed primary Vite toolchain.",
};
if (dryRun) {
  console.log(JSON.stringify({ dryRun: true, ...plan }, null, 2));
} else {
  assertInside(workspace, archiveBase);
  if (await exists(archiveBase) && await realpath(archiveBase) !== archiveBase)
    throw new Error(`Refusing a linked archive directory: ${archiveBase}`);
  await mkdir(archive, { recursive: true });
  assertInside(workspace, await realpath(archive));
  for (let index = 0; index < mirrors.length; index++) {
    const mirror = mirrors[index];
    const backup = path.join(archive, mirrorNames[index]);
    for (const name of [...ownedDirectories, ...ownedFiles, "dist"])
      if (await exists(path.join(mirror, name)))
        await verifiedArchive(path.join(mirror, name), path.join(backup, name));
    for (const name of ownedDirectories.filter((name) => name !== "public")) {
      await cp(path.join(root, name), path.join(mirror, name), {
        recursive: true,
        filter: (source) => source !== path.join(root, "src", "deployment.json"),
      });
    }
    await replacePublic(mirror);
    for (const name of ownedFiles) await cp(path.join(root, name), path.join(mirror, name));
    console.log(`Synchronized ${path.relative(workspace, mirror)}; deployment record preserved.`);
  }
  const builds = [];
  for (const mirror of mirrors) {
    const dist = path.resolve(mirror, "dist");
    assertInside(mirror, dist);
    if (await exists(dist)) {
      assertInside(mirror, await realpath(dist));
      await validateTree(dist);
    }
    const { stdout, stderr } = await run(process.execPath, [path.join(root, "node_modules", "vite", "bin", "vite.js"), "build"], {
      cwd: mirror, maxBuffer: 1024 * 1024,
    });
    console.log(stdout.trim());
    if (stderr.trim()) console.error(stderr.trim());
    builds.push({ mirror, status: "passed" });
  }
  const verified = [];
  for (const mirror of mirrors) {
    let matchedFiles = 0;
    for (const name of [...ownedDirectories, ...ownedFiles]) {
      const source = path.join(root, name);
      const info = await lstat(source);
      const files = info.isDirectory() ? (await filesIn(source)).map((file) => path.join(name, file)) : [name];
      for (const file of files) {
        if (file === path.join("src", "deployment.json")) continue;
        if (await hashFile(path.join(root, file)) !== await hashFile(path.join(mirror, file)))
          throw new Error(`Mirror mismatch: ${path.join(mirror, file)}`);
        matchedFiles++;
      }
    }
    if (JSON.stringify(await filesIn(path.join(root, "public"))) !== JSON.stringify(await filesIn(path.join(mirror, "public"))))
      throw new Error(`Unexpected public files remain in ${mirror}`);
    verified.push({ mirror, matchedFiles });
  }
  for (const app of [root, ...mirrors])
    if (deploymentHashes[app] !== await hashFile(path.join(app, "src", "deployment.json")))
      throw new Error(`Deployment record changed: ${app}`);
  const report = { ...plan, completedAt: new Date().toISOString(), builds, verified, deploymentHashes };
  await writeFile(path.join(archive, "sync-report.json"), JSON.stringify(report, null, 2) + "\n");
  await writeFile(path.join(archiveBase, "probiuna-mirror-sync.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(`Probiuna mirrors verified. Archive and report: ${archive}`);
}
