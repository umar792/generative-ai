from flask import Flask , request , jsonify
from transformers import AutoModelForCausalLM , AutoTokenizer
import torch


modelPath = "./Phi-3-mini-4k-instruct"


print("Loading model...")
tokenizer = AutoTokenizer.from_pretrained(modelPath)
model = AutoModelForCausalLM.from_pretrained(
    modelPath,
     device_map="auto",
    torch_dtype="auto"
)
print("Model ready ✅")

app = Flask(__name__)


@app.route("/chat", methods=["POST"])
def chat():
    data = request.json or {}
    prompt = data.get("prompt" , "Hello how are you")
    if not prompt:
        return jsonify({
            'success' : False,
            "error" : "Prompt not found"
        })
    inputs = tokenizer(prompt , return_tensors="pt").to(model.device)
    print(inputs)

    # generate reply
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=200,
            temperature=0.7,
            do_sample=True
        )
    
    reply = tokenizer.decode(outputs[0], skip_special_tokens=True)

    tokens_in = len(inputs["input_ids"][0])
    tokens_out = outputs.shape[1] - tokens_in

    return jsonify({
        "response": reply,
        "tokens_used": {
            "input": tokens_in,
            "output": tokens_out,
            "total": tokens_in + tokens_out
        }
    })


if __name__ == "__main__":
    app.run(debug=True)