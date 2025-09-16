import dotenv from "dotenv";
import { promisify } from "util";
import { exec } from "child_process";
// import { Groq } from "groq-sdk/index.mjs";
import { systemPrompt } from "./systemPrompt.js";
import readline from "readline";
import path from "path";
import fs from "fs";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

dotenv.config();
// const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const asyncPromisify = promisify(exec);
const history: any[] = [];
let tokenCount = 0;
let currentDir = process.cwd();

// external tool for command execution
const executeCommand = async ({ command }: { command: string }) => {
  try {
    console.log("Executing command:", command);

    // 🔒 Block dangerous commands
    const forbidden = ["rm -rf", "shutdown", "reboot", "mkfs", ":(){:|:&};:"];
    if (forbidden.some((f) => command.includes(f))) {
      return {
        success: false,
        command,
        error: "Blocked potentially unsafe command.",
      };
    }

    // Handle pwd
    if (command === "pwd") {
      return { success: true, output: currentDir };
    }

    // Handle cd
    if (command.startsWith("cd ")) {
      const target = command.replace("cd ", "").trim();
      const newDir = path.resolve(currentDir, target);

      if (!fs.existsSync(newDir) || !fs.lstatSync(newDir).isDirectory()) {
        return { success: false, error: `Directory does not exist: ${newDir}` };
      }

      currentDir = newDir;
      return { success: true, output: `Moved into: ${currentDir}` };
    }

    // Handle ls and ls -a
    if (command.startsWith("ls")) {
      const parts = command.split(" ");
      let dir = currentDir;
      let showHidden = false;

      if (parts.includes("-a")) showHidden = true;
      const dirArg = parts.find((p) => !["ls", "-a"].includes(p));
      if (dirArg) {
        dir = path.resolve(currentDir, dirArg);
        if (!fs.existsSync(dir) || !fs.lstatSync(dir).isDirectory()) {
          return { success: false, error: `Directory does not exist: ${dir}` };
        }
      }

      const files = fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((f) => showHidden || !f.name.startsWith("."))
        .map((f) => f.name);

      return { success: true, output: files, currentDir: dir };
    }

    // Execute other shell commands in currentDir
    const { stdout, stderr } = await asyncPromisify(command, {
      cwd: currentDir,
    });
    if (stderr) {
      return { success: false, error: stderr };
    }

    return {
      success: true,
      output: stdout || "Command executed successfully.",
    };
  } catch (error: any) {
    return { success: false, error: error.message || error.toString() };
  }
};
const executeCommandDeclaration = {
  type: "function",
  function: {
    name: "executeCommand",
    description:
      "Execute a single terminal/shell command. A command can be to create a folder, file, write on a file, edit the file or delete the file",
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description:
            "It will be a single terminal command. Ex: 'mkdir calculator'",
        },
      },
      required: ["command"],
    },
  },
};

// functions mapping
const functions = {
  executeCommand: executeCommand,
};

const aiAgent = async (prompt: string) => {
  try {
    history.push({
      role: "user",
      content: prompt,
    });
    const maxTry = 5;
    let attempt = 0;
    while (true) {
      attempt++;
      if (attempt > maxTry) {
        console.log("Max attempts reached. Exiting...");
        break;
      }
      console.log("Attempt number: ", attempt);
      // @ts-ignore
      // const res = await groq.chat.completions.create({
      //     temperature : 0,
      //     model : "llama-3.3-70b-versatile",
      //     messages : [
      //         {
      //             role : "system",
      //             content : systemPrompt
      //         },
      //         ...history
      //     ],
      //     // @ts-ignore
      //     tools : [executeCommandDeclaration],
      //     tool_choice : "auto"
      // });

      const response = await fetch(process.env.LLAMA_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.LLAMA_MODEL,
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            ...history,
          ],
          stream: false,
          tools: [executeCommandDeclaration],
          tool_choice: "auto",
        }),
      });

      const res = await response.json();
      tokenCount = res.prompt_eval_count + res.eval_count;
      history.push(res.message);

      const tollCalls = res.message.tool_calls && res.message.tool_calls.length > 0;
      if (!tollCalls || res?.message?.tool_calls?.length === 0) {
        console.log(
          "Final Response: ",
          res.message.content,
          "\n Total token used: ",
          tokenCount
        );
        break;
      }


      if (res.message.tool_calls && res.message.tool_calls.length > 0){
          for (const toolCall of res.message.tool_calls) {
            const funcName = toolCall.function.name;
            const command: any = toolCall.function.arguments;
            const func = await functions[funcName];
            const output = await func(command);
            history.push({
              tool_call_id: toolCall.id,
              role: "tool",
              content: JSON.stringify(output),
            });
          }
      }else{
        console.log(
            "Final Response: ",
            res.message.content,
            "\nTotal token used: ",
            tokenCount
          );
          break;
      }



    }
  } catch (error: any) {
    console.log(`\n${error.message}\n`);
  }
};

const main = async () => {
  // while (true) {
  //     const userPrompt = readlineSync.question("Ask anything about backend (type 'exit' to quit): ").trim();
  //     console.log(userPrompt)
  //     if (userPrompt.toLowerCase() === "exit") break;
  //     await aiAgent(userPrompt);
  // }
  // console.log("Goodbye!");

  rl.question(
    "Ask anything about your system and backend (type 'exit' to quite): ",
    async (answer) => {
      const userPrompt = answer.trim();
      if (userPrompt.toLowerCase() === "exit") {
        console.log("Goodbye!");
        rl.close();
        return;
      }

      await aiAgent(userPrompt);
      main();
    }
  );
};
main();
