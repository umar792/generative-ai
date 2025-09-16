import dotenv from "dotenv";
import  {promisify}  from "util";
import { exec } from "child_process";
import {Groq} from "groq-sdk/index.mjs";
import { systemPrompt } from "./systemPrompt.js";



dotenv.config();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const asyncPromisify = promisify(exec);
const history:any[] = [];


// external tool for command execution
const executeCommand = async (command:{command:any})=>{
       try {
        console.log("command is running", command , "llllllllllllllllllllllll")
        const {stdout, stderr} = await asyncPromisify(command.command);
        if(stderr){
            return `Error : in file creating or folder creating , any read,wite, ${stderr}`
        }
        return `success: ${stdout || "command execute successfully"} `
       } catch (error:any) {
        return `Error : ${error}`
        
       }
}
const executeCommandDeclaration = {
    type: "function",
    function: {
        name: "executeCommand",
        description: "Execute a single terminal/shell command. A command can be to create a folder, file, write on a file, edit the file or delete the file",
        parameters: {
            type: "object",
            properties: {
                command: {
                    type: "string",
                    description: "It will be a single terminal command. Ex: 'mkdir calculator'"
                }
            },
            required: ["command"]
        }
    }
};


// functions mapping
const functions = {
    executeCommand:executeCommand
}


const aiAgent = async (prompt:string)=>{
    history.push({
        role : "user",
        content : prompt
    })
    const maxTry = 5;
    let attempt = 0;
    while(true){
        attempt++;
        if(attempt > maxTry){
            console.log("Max attempts reached. Exiting...");
            break;
        }
        console.log("Attempt number: ", attempt);
        // @ts-ignore
        const res = await groq.chat.completions.create({
            temperature : 1,
            model : "llama-3.3-70b-versatile",
            messages : [
                {
                    role : "system",
                    content : systemPrompt
                },
                ...history
            ],
            // @ts-ignore
            tools : [executeCommandDeclaration]
        });
        console.log(JSON.stringify(res.choices[0].message));
        if(res.choices[0].message.tool_calls && res.choices[0].message.tool_calls.length > 0){
            for(const toolCall of res.choices[0].message.tool_calls){
                const funcName  = toolCall.function.name;
                const command:any = toolCall.function.arguments;
                const func = await functions[funcName]
                console.log("commandcommandcommand" , command)
                const output = await func(command);
                history.push({
                    tool_call_id: toolCall.id,
                    role: "tool",
                    content: output,
                })
                // push the assistant response after tool execution
                history.push({
                    role: "user",
                    content: `The command "${command}" has been executed. 
              Please provide a concise, friendly, and helpful response based on the command result 
              and guide me on what to do next in my backend project.`,
                  });
            }
            
        }else{
            history.push({
                role : "assistant",
                content : res.choices[0].message.content || ""
            })
            console.log("Final Response: ",res.choices[0].message.content)
            break;
        }
    }
    

}



const main = async ()=>{
   const prompt = "Where i am";
   await aiAgent(prompt);
   console.log("Chat history: ", JSON.stringify(history,null,2));
}
main();