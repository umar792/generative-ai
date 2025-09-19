import path from "path";
import fs from "fs";
import { promisify } from "util";
import { exec } from "child_process";
const asyncPromisify = promisify(exec);
let currentDir = process.cwd();
// external tool for command execution
export const executeCommand = async ({ commands }) => {
    try {
        const result = [];
        for (const cmd of commands) {
            console.log("Executing command:", cmd);
            // 🔒 Block dangerous commands
            const forbidden = ["rm -rf", "shutdown", "reboot", "mkfs", ":(){:|:&};:"];
            if (forbidden.some((f) => cmd.includes(f))) {
                result.push({
                    success: false,
                    cmd,
                    error: "Blocked potentially unsafe cmd.",
                });
                continue;
            }
            // Handle pwd
            if (cmd === "pwd") {
                result.push({ success: true, cmd, output: currentDir });
                continue;
            }
            // Handle cd
            if (cmd.startsWith("cd ")) {
                const target = cmd.replace("cd ", "").trim();
                const newDir = path.resolve(currentDir, target);
                if (!fs.existsSync(newDir) || !fs.lstatSync(newDir).isDirectory()) {
                    result.push({ success: false, cmd, error: `Directory does not exist: ${newDir}` });
                    continue;
                }
                currentDir = newDir;
                result.push({ success: true, cmd, output: `Moved into: ${currentDir}` });
                continue;
            }
            // Handle ls and ls -a
            if (cmd.startsWith("ls")) {
                const parts = cmd.split(" ");
                let dir = currentDir;
                let showHidden = false;
                if (parts.includes("-a"))
                    showHidden = true;
                const dirArg = parts.find((p) => !["ls", "-a"].includes(p));
                if (dirArg) {
                    dir = path.resolve(currentDir, dirArg);
                    if (!fs.existsSync(dir) || !fs.lstatSync(dir).isDirectory()) {
                        result.push({ success: false, cmd, error: `Directory does not exist: ${dir}` });
                        continue;
                    }
                }
                const files = fs
                    .readdirSync(dir, { withFileTypes: true })
                    .filter((f) => showHidden || !f.name.startsWith("."))
                    .map((f) => f.name);
                result.push({ success: true, cmd, output: files, currentDir: dir });
                continue;
            }
            // Execute other shell cmds in currentDir
            const { stdout, stderr } = await asyncPromisify(cmd, { cwd: currentDir });
            if (stderr) {
                result.push({ success: false, cmd, error: stderr });
            }
            else {
                result.push({
                    success: true,
                    cmd,
                    output: stdout || "Command executed successfully.",
                });
            }
        }
        return result;
    }
    catch (error) {
        return [{ success: false, error: error.message || error.toString() }];
    }
};
