"use server"

import fs from "fs"
import path from "path"

export async function getAppVersion() {
  try {
    const pkgPath = path.join(process.cwd(), "package.json")
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"))
    const env = process.env.NODE_ENV === "production" ? "prod" : "dev"
    return `v${pkg.version}-${env}`
  } catch (e) {
    return "v1.0.0-unknown"
  }
}
