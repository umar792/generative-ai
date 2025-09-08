import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import readlineSync from "readline-sync"
dotenv.config()
const ai = new GoogleGenAI({ apiKey: process.env.KEY });
interface HistoryEntry {
    role: string;
    parts: { text?: string,functionCall?:any ,functionResponse?:any }[];
}

const history: HistoryEntry[] = [];


const sum = ({num1,num2}:{num1:number,num2:number})=>{
    return num1 + num2
}

const multiply = ({num1,num2}:{num1:number,num2:number})=>{
    return num1 * num2
}

const primeNumber = ({ num }: { num: number }) => {
    if (num <= 1) {
      return false; 
    }
  
    for (let i = 2; i <= Math.sqrt(num); i++) {
      if (num % i === 0) {
        return false;
      }
    }
  
    return true;
  };
  

const getCryptoData = async ({coin}:{coin:string})=>{
    try {
        console.log(coin)
        const res = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coin}`)
        const data = await res.json()
        return data[0];
    } catch (error) {
        return error
    }
} 


const sumFunctionDeclaration = {
    name : "sum",
    description : "sum two number first number is num1, second number is num2,get two number sum",
    parameters : {
        type : "OBJECT",
        properties :{
            num1 : {
                type : "NUMBER",
                description : "this is the first number of the obj, which is num1"
            },
            num2 : {
                type : "NUMBER",
                description : "this is the second number of the obj, which is num2"
            },
        },
        required : ["num1","num2"]
    }
}

const multiplyFunctionDeclaration = {
    name : "multiply",
    description : "multiply two number first number is num1, second number is num2,get two number multiplication",
    parameters : {
        type : "OBJECT",
        properties :{
            num1 : {
                type : "NUMBER",
                description : "this is the first number of the obj, which is num1"
            },
            num2 : {
                type : "NUMBER",
                description : "this is the second number of the obj, which is num2"
            },
        },
        required : ["num1","num2"]
    }
}


const primeNumberFunctionDeclaration = {
    name : "primeNumber",
    description : "get prime number , send number like 1 false",
    parameters : {
        type : "OBJECT",
        properties :{
            num1 : {
                type : "NUMBER",
                description : "this is the first number of the obj, which is prime or not"
            },
        },
        required : ["num1"]
    }
}
const getCryptoDataFunctionDeclaration = {
    name : "getCryptoData",
    description : "get getCryptoData price of a coin, like send bitcoin i will return you complete detail",
    parameters : {
        type : "OBJECT",
        properties :{
            coin : {
                type : "STRING",
                description : "this is coin name whose need to find the detail"
            },
        },
        required : ["coin"]
    }
}


const funcCall = {
    sum : sum,
    multiply: multiply,
    primeNumber:primeNumber,
    getCryptoData :getCryptoData
}



const generatePrompt = async (prompt: string) => {
    history.push({
        role :"user",
        parts: [{text:prompt}]
      })
  while(true){
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        // @ts-ignore
        contents: history,
        config: {
            tools : [{
                // @ts-ignore
                functionDeclarations : [sumFunctionDeclaration,multiplyFunctionDeclaration,primeNumberFunctionDeclaration,getCryptoDataFunctionDeclaration]
            }]
        },
      });
      if(response.functionCalls && response.functionCalls.length > 0){

        for(let i=0; i< response.functionCalls?.length; i++){
            const {name,args} = response.functionCalls[i];
            console.log(name,args)
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
};


const main = async ()=>{
    const userPrompt = readlineSync.question("Ask any thing: ")
    console.log(userPrompt)
    await generatePrompt(userPrompt);
    main()
}
main()




