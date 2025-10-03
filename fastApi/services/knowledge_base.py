# services/knowledge_service.py
import os
import json
import logging
from langchain_community.vectorstores import Chroma
from langchain.chains import RetrievalQA
from langchain.schema import Document
from services.llm import LLMService
import config

logger = logging.getLogger(__name__)

class KnowledgeService:
    """Manages vector store and documentation search"""
    
    def __init__(self, llm_service: LLMService):
        self.llm_service = llm_service
        self.vectorstore = None
        self.qa_chain = None
        self._setup_vectorstore()
        self._setup_qa_chain()
    
    def _setup_vectorstore(self):
        """Setup vector store"""
        if not self.llm_service.embeddings:
            return
        
        try:
            if os.path.exists(config.VECTOR_DB_PATH):
                # Load existing
                self.vectorstore = Chroma(
                    persist_directory=config.VECTOR_DB_PATH,
                    embedding_function=self.llm_service.embeddings
                )
                logger.info("Vector database loaded")
            else:
                # Create new
                self._create_vectorstore()
        except Exception as e:
            logger.error(f"Vector store error: {e}")
    
    def _create_vectorstore(self):
        """Create vector store from processed docs"""
        if not os.path.exists(config.PROCESSED_DOCS_PATH):
            logger.warning("No processed docs found. Run data_ingestion.py first")
            return
        
        with open(config.PROCESSED_DOCS_PATH, 'r', encoding='utf-8') as f:
            doc_data = json.load(f)
        
        documents = [
            Document(page_content=item['content'], metadata=item['metadata'])
            for item in doc_data
        ]
        
        if documents:
            self.vectorstore = Chroma.from_documents(
                documents,
                self.llm_service.embeddings,
                persist_directory=config.VECTOR_DB_PATH
            )
            logger.info(f"Created vector store with {len(documents)} documents")
    
    def _setup_qa_chain(self):
        """Setup QA chain"""
        if self.vectorstore and self.llm_service.llm_precise:
            try:
                self.qa_chain = RetrievalQA.from_chain_type(
                    llm=self.llm_service.llm_precise,
                    chain_type="stuff",
                    retriever=self.vectorstore.as_retriever(search_kwargs={"k": 5})
                )
                logger.info("QA chain setup successfully")
            except Exception as e:
                logger.error(f"QA chain error: {e}")
    
    def search_documentation(self, query: str) -> str:
        """Search documentation using RAG"""
        if not self.qa_chain:
            return "Documentation search not available"
        
        try:
            result = self.qa_chain.run(query)
            return f"📚 **Documentation Search Result:**\n{result}"
        except Exception as e:
            return f"Search error: {e}"
    
    def is_ready(self) -> bool:
        return bool(self.vectorstore and self.qa_chain)
    
    def search_policy_documentation(self, policy_name: str, query: str = "") -> str:
        """Search for specific policy documentation"""
        if not self.vectorstore:  # Changed from self.collection
            return f"Knowledge base not initialized for {policy_name} policy"
        
        try:
            # Search for policy-specific information
            search_query = f"{policy_name} policy {query}".strip()
            
            # Use vectorstore similarity search
            results = self.vectorstore.similarity_search(
                search_query,
                k=3,
                filter={"type": "policy_doc"}  # Filter for policy documents
            )
            
            if results:
                # Return the most relevant policy documentation
                policy_info = "\n".join([doc.page_content for doc in results])
                return f"📚 **{policy_name} Policy Documentation:**\n\n{policy_info}"
            else:
                return f"No specific documentation found for {policy_name} policy"
                
        except Exception as e:
            logger.error(f"Error searching policy documentation: {str(e)}")
            return f"Error retrieving {policy_name} policy information"