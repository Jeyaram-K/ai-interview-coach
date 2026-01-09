"""
Database utilities for RAG vector storage with PostgreSQL + pgvector
"""
import psycopg2
from psycopg2.extras import RealDictCursor
from pgvector.psycopg2 import register_vector
from typing import List, Optional
import os

# Database configuration - stored in memory (can be updated via API)
DATABASE_CONFIG = {
    # PostgreSQL local settings
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432"),
    "database": os.getenv("DB_NAME", "salescoach_rag"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "postgres")
}

def get_database_settings():
    """Get current database settings"""
    return {
        "provider": "postgresql",
        "postgresql_configured": bool(DATABASE_CONFIG["host"])
    }

def get_connection():
    """Get database connection with pgvector support"""
    conn = psycopg2.connect(
        host=DATABASE_CONFIG["host"],
        port=DATABASE_CONFIG["port"],
        database=DATABASE_CONFIG["database"],
        user=DATABASE_CONFIG["user"],
        password=DATABASE_CONFIG["password"]
    )
    register_vector(conn)
    return conn

def init_database():
    """Initialize database with required tables and extensions"""
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        # Enable pgvector extension
        cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
        
        # Create documents table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                chunk_index INTEGER DEFAULT 0,
                embedding vector(768),
                created_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        # Create index for faster similarity search (with error handling for existing index)
        try:
            cur.execute("""
                CREATE INDEX IF NOT EXISTS documents_embedding_idx 
                ON documents USING ivfflat (embedding vector_cosine_ops)
                WITH (lists = 100)
            """)
        except Exception as e:
            # Index might fail if not enough rows, that's OK
            print(f"Index creation note: {e}")
        
        conn.commit()
        cur.close()
        conn.close()
        print("✅ Database initialized successfully (postgresql)")
        return True
    except Exception as e:
        print(f"⚠️ Database init error: {e}")
        return False

def add_document(title: str, content: str, chunk_index: int, embedding: List[float]) -> int:
    """Add a document chunk with its embedding"""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute(
        """
        INSERT INTO documents (title, content, chunk_index, embedding)
        VALUES (%s, %s, %s, %s)
        RETURNING id
        """,
        (title, content, chunk_index, embedding)
    )
    
    doc_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return doc_id

def search_similar(query_embedding: List[float], limit: int = 3) -> List[dict]:
    """Search for similar documents using cosine similarity"""
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute(
        """
        SELECT id, title, content, chunk_index,
               1 - (embedding <=> %s::vector) as similarity
        FROM documents
        ORDER BY embedding <=> %s::vector
        LIMIT %s
        """,
        (query_embedding, query_embedding, limit)
    )
    
    results = cur.fetchall()
    cur.close()
    conn.close()
    return [dict(row) for row in results]

def get_all_documents() -> List[dict]:
    """Get all unique document titles"""
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute("""
        SELECT DISTINCT title, 
               COUNT(*) as chunks,
               MIN(created_at) as created_at
        FROM documents
        GROUP BY title
        ORDER BY created_at DESC
    """)
    
    results = cur.fetchall()
    cur.close()
    conn.close()
    return [dict(row) for row in results]

def delete_document(title: str) -> int:
    """Delete all chunks of a document by title"""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("DELETE FROM documents WHERE title = %s", (title,))
    deleted = cur.rowcount
    
    conn.commit()
    cur.close()
    conn.close()
    return deleted

def get_document_count() -> int:
    """Get total number of document chunks"""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT COUNT(*) FROM documents")
    count = cur.fetchone()[0]
    
    cur.close()
    conn.close()
    return count

def test_connection() -> dict:
    """Test the current database connection"""
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.close()
        conn.close()
        return {"success": True, "provider": "postgresql"}
    except Exception as e:
        return {"success": False, "error": str(e), "provider": "postgresql"}
