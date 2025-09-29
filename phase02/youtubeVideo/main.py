from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from dotenv import load_dotenv
import os
from langchain_pinecone.vectorstores import PineconeVectorStore
from pinecone import pinecone
from langchain_core.runnables import RunnableParallel , RunnablePassthrough , RunnableLambda
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate



load_dotenv()

model = ChatGroq(
    model=os.getenv("LLAMA_MODEL"),
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=.3,
)

# transcript youTube video
def ytTranscript(id):
    try:
        newTranscript = []
        transcript = YouTubeTranscriptApi().fetch(id)
        for trans in transcript:
            newTranscript.append(trans.text)
        return " ".join(newTranscript)
    except TranscriptsDisabled:
        return "Transcripts are disabled for this video."
    except Exception as e:
        return f"An error occurred: {str(e)}"
    

# text splitter
def textSplitter():
    text = ytTranscript("Gfr50f6ZBvo")
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
    )
    chunks = splitter.create_documents([text])
    return chunks



# Vector embedding
def vectorEmbedding():
    embedding = GoogleGenerativeAIEmbeddings(
        model="text-embedding-004",
        google_api_key=os.getenv("GEMINI_API_KEY")
    )

    pine = pinecone.Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    pineIndex = pine.Index(os.getenv("PINECONE_INDEX_NAME"))
    vector_store = PineconeVectorStore(
        index=pineIndex,
        embedding=embedding
    )

    chunks = textSplitter()
    vector_store.add_texts([chunk.page_content for chunk in chunks])


# vectorEmbedding()

# fetchVectors
def fetchVectors(userPrompt):
    embedding = GoogleGenerativeAIEmbeddings(
        model="text-embedding-004",
        google_api_key=os.getenv("GEMINI_API_KEY")
    )

    userQueryVector = embedding.embed_query(userPrompt)

    pine = pinecone.Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    pineIndex = pine.Index(os.getenv("PINECONE_INDEX_NAME"))

    result = pineIndex.query(
        top_k=3,
        vector=userQueryVector,
        include_metadata=True
    )

    texts = "\n\n".join([match["metadata"].get("text") for match in result["matches"]])
    return texts
    # llmResult = model.invoke(f'Give the user friendly answer from provided document, \n userPrompt=> {userPrompt} \n document=>{texts}')
    # print(llmResult)



prompt = PromptTemplate(
    template="Give the user friendly answer of the user from provided docs, \n Question: {question} \n docs: {content} ",
    input_variables=["question","content"]
)
parser = StrOutputParser()
# chains 

chain1 = RunnableParallel({
    "content" : RunnableLambda(fetchVectors),
    "question" : RunnablePassthrough()
})

chain2 = prompt | model | parser

mainChain = chain1 | chain2
result = mainChain.invoke("Can you summarized the video")
print(result)
mainChain.get_graph().print_ascii()


