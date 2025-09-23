from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableParallel
from dotenv import load_dotenv
import os

# laod env
load_dotenv()


# initialized model
model = ChatGroq(
    model=os.getenv("LLAMA_MODEL"),
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=.3,
)


# ----------------------- simple Chain 01 ----------------------------------

# create basic prompt
# prompt = PromptTemplate(
#     template='generate 5 interesting fact about {topic}',
#     input_variables=["topic"]
# )
# # now create basic chain
# chain = prompt | model
# # invoke chain
# result = chain.invoke({'topic': "Generative AI"})
# # print result
# print(result)
# ----------------------------------------------------------------------




# ----------------------- simple Chain 02 -------------------------------------

# prompt 1
# prompt1 = PromptTemplate(
#     template='Generate a report on {topic}',
#     input_variables=['topic']
# )

# # prompt 2
# prompt2 = PromptTemplate(
#     template='Give me 2 lines summery of text in points \n {text}',
#     input_variables=['text']
# )

# #  parser to parse the raw text 
# parser = StrOutputParser()

# # create chain
# chain = prompt1 | model | parser | prompt2 | model | parser

# # invoke chain
# result = chain.invoke({'topic': "Python"})
# print(result)


# # check the graph of the chian invoke
# chain.get_graph().print_ascii()

# -------------------------------------------------------------------------------------




# ---------------------------------- parallel chain------------------------------------

prompt1 = PromptTemplate(
    template='Generate a short note on given text \n text=> {text}',
    input_variables=['text']
)
prompt2 = PromptTemplate(
    template='Generate a 5 quiz on given text \n text => {text}',
    input_variables=['text']
)
prompt3 = PromptTemplate(
    template='Merge the given note and quiz \n notes=> {note} \n quiz => {quiz}',
    input_variables=['note','quiz']
)

parser = StrOutputParser()

parallel_chin = RunnableParallel({
    'note' : prompt1 | model | parser,
    "quiz" : prompt2 | model | parser
})

merge_chain = prompt3 | model | parser

chain = parallel_chin | merge_chain

text = 'your_text'

result = chain.invoke({"text" : text})
print(result)

chain.get_graph().print_ascii()

# --------------------------------------------------------------------------------------