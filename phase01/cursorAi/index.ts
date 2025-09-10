import {promisify} from "util";
import {exec} from "child_process";
import readlineSync from "readline-sync";
import { GoogleGenAI } from "@google/genai";
import { systemInstruction } from "./systemInstruction.js";





import dotenv from "dotenv";
dotenv.config()

console.log(process.env.KEY)
const asyncPromisify = promisify(exec)
const ai = new GoogleGenAI({ apiKey: process.env.KEY });
interface History {
    role: string;
    parts : {
        text?:string,
        functionCall?:any,
        functionResponse?:any
    }[]
}
const history:History[] = []


const executeCommands = async ({command}:{command:string})=>{
      try {
       console.log(command , "command===========================>")
      // @ts-ignore
       const {stdout , stderr} = await asyncPromisify(command);

       if(stderr){
        return `Error : in file creating or folder creating , any read,wite, ${stderr}`
       }

       return `success: ${stdout || "Command execute successfully"} `

        
      } catch (error:any) {
         return `Error : ${error}`
      }
}


const execCommandDeclaration = {
    name : "executeCommands",
    description : "Execute a single terminal/shell command. A command can be to create a folder, file, write on a file, edit the file or delete the file",
    parameters : {
        type : "OBJECT",
        properties :{
            command : {
                type : "STRING",
                description : 'It will be a single terminal command. Ex: "mkdir calculator"'
            },
        },
        required : ["command"]
    }
}

const funcCall = {
    executeCommands:executeCommands
}


const aiAgent = async (prompt:string)=>{
    history.push({
        role :"user",
        parts: [{text:prompt}]
      })

      while(true){
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents : history,
            systemInstruction : systemInstruction,
            config : {
                tools : [{
                    // @ts-ignore
                    functionDeclarations : [execCommandDeclaration]
                }]
            }
            
        })
        if(response.functionCalls && response.functionCalls.length > 0){

            for(let i=0; i< response.functionCalls?.length; i++){
                const {name,args} = response.functionCalls[i];
                console.log(name)
                // @ts-ignore
                const takeFunc = funcCall[name]
                const result = await takeFunc(args)
                history.push({
                    role :"model",
                    parts: [{
                        functionCall: response.functionCalls[i],
                      },]
                  })
    
                  history.push({
                    role :"user",
                    parts: [{
                        functionResponse: {
                            name: name,
                            response: {
                              result: result,
                            },
                          }
                      },]
                  })
            }
    
    
          }else{
              console.log(response.text);
              history.push({
                role :"model",
                parts: [{text:response.text!}]
              })
              break;
          }


      }
}

const main = async ()=>{
    const userPrompt = readlineSync.question("Ask any thing: ")
    await aiAgent(userPrompt);
    main()
}
main()