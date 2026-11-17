import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"

/**
 * Everything the deployed site serves from public/ must be a real file. Git LFS replaces a tracked file with a small text
 * "pointer", and Vercel does not fetch LFS content, so a photo committed through LFS was served as that text and showed as a
 * broken image on the live site (the blurred placeholder behind it was all anyone saw). .gitattributes now keeps public/ out
 * of LFS; this test fails if a pointer ever gets in again.
 */

function filesUnder(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    return e.isDirectory() ? filesUnder(p) : [p]
  })
}

describe("public/ assets", () => {
  const files = filesUnder(path.resolve(__dirname, "../../public"))

  it("has the photographs", () => {
    expect(files.filter((f) => f.endsWith(".webp")).length).toBeGreaterThanOrEqual(33)
  })

  it("contains no Git LFS pointer files", () => {
    const pointers = files.filter((f) => fs.readFileSync(f).subarray(0, 40).toString("utf8").startsWith("version https://git-lfs"))
    expect(pointers.map((f) => path.relative(process.cwd(), f))).toEqual([])
  })

  it("every .webp really is a WebP image", () => {
    for (const f of files.filter((x) => x.endsWith(".webp"))) {
      const head = fs.readFileSync(f).subarray(0, 12)
      expect(head.subarray(0, 4).toString("ascii"), f).toBe("RIFF")
      expect(head.subarray(8, 12).toString("ascii"), f).toBe("WEBP")
    }
  })
})
