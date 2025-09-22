#!/usr/bin/env node

import dotenv from "dotenv";
import { Groq } from "groq-sdk/index.mjs";
import { chatSystemPrompt, systemPrompt } from "./systemPrompt.js";
import readline from "readline";
import { optimizeQuery } from "./helpers/optimizeQuery.js";
import { executeCommand } from "./tools/executeCommand.js";
import { executeCommandDeclaration } from "./toolDeclaration.js";
import { fetchVectors } from "./helpers/fetchVectors.js";
import { classifyQuery } from "./helpers/classifyQuery.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

dotenv.config();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const history: any[] = [];
let tokenCount = 0;


// functions mapping
const functions = {
  executeCommand: executeCommand,
};



const aiAgent = async (prompt: string , sysPrompt:string , useTool:boolean) => {
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
      const res = await groq.chat.completions.create({
          temperature : 0,
          model : "llama-3.1-8b-instant",
          messages : [
              {
                  role : "system",
                  content : sysPrompt
              },
              ...history
          ],
          // @ts-ignore
          tools : useTool ? [executeCommandDeclaration] : undefined,
          tool_choice : "auto"
      });

      if (res.usage) {
        console.log(`${attempt} token usage ${res.usage.total_tokens}`)
        tokenCount += res.usage.total_tokens;
      }

      // const response = await fetch(process.env.LLAMA_API_URL, {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify({
      //     model: process.env.LLAMA_MODEL,
      //     messages: [
      //       {
      //         role: "system",
      //         content: systemPrompt,
      //       },
      //       ...history,
      //     ],
      //     stream: false,
      //     tools: [executeCommandDeclaration],
      //     tool_choice: "auto",
      //   }),
      // });

      // const res = await response.json();
      // tokenCount = res.prompt_eval_count + res.eval_count;
      history.push(res.choices[0].message);

      const tollCalls = res.choices[0].message.tool_calls && res.choices[0].message.tool_calls.length > 0;
      if (!tollCalls || res.choices[0]?.message?.tool_calls?.length === 0) {
          console.log(
            "Final Res.choices[0]: ",
            res.choices[0].message.content,
            "\n Total token used: ",
            tokenCount
          );
        break;
      }


      if (res.choices[0].message.tool_calls && res.choices[0].message.tool_calls.length > 0){
          for (const toolCall of res.choices[0].message.tool_calls) {
            const funcName = toolCall.function.name;
            // const command: any = toolCall.function.arguments;
            const command: any = JSON.parse(toolCall.function.arguments);
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
            res.choices[0].message.content,
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
  rl.question(
    "Ask anything about your system and backend (type 'exit' to quite): ",
    async (answer) => {
      const userPrompt = answer.trim();
      if (userPrompt.toLowerCase() === "exit") {
        console.log("Goodbye!");
        rl.close();
        return;
      }

      const mode = await classifyQuery(userPrompt);
      console.log(`Model ${mode} \n`) 
      if (mode === "chat"){
         await aiAgent(userPrompt, chatSystemPrompt, false)
      }else{
        const optimizePrompt = await optimizeQuery(userPrompt);
        console.log(`
            \n -----------------------------------------------------------------------------------
              optimizePrompt ${optimizePrompt}
            ------------------------------------------------------------------------------------- \n
        `)
        const topChunks = await fetchVectors(optimizePrompt);
        console.log(topChunks)
        await aiAgent(optimizePrompt, `${systemPrompt}\n\n---\n${topChunks}` , true);
      }

      main();
    }
  );
};
main();
