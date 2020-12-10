import fs from "fs/promises"

/**
 * creates a folder, does not throw EEXIST error
 * @param path where the folder should be created
 */
export async function createFolderSave(path: string) {
  try {
    await fs.mkdir(path)
  } catch (e) {
    if (e.code === "EEXIST") return
    throw e
  }
}