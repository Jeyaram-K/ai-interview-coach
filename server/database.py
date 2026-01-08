"""
Database utilities for RAG vector storage with PostgreSQL + pgvector
Supports local PostgreSQL and Supabase cloud
"""
import psycopg2
from psycopg2.extras import RealDictCursor
from pgvector.psycopg2 import register_vector
from typing import List, Optional
import os

# Database configuration - stored in memory (can be updated via API)
DATABASE_CONFIG = {
    "provider": os.getenv("DB_PROVIDER", "postgresql"),  # "postgresql" or "supabase"
    
    # PostgreSQL local settings
    "postgresql": {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": os.getenv("DB_PORT", "5432"),
        "database": os.getenv("DB_NAME", "salescoach_rag"),
        "user": os.getenv("DB_USER", "postgres"),
        "password": os.getenv("DB_PASSWORD", "postgres")
    },
    
    # Supabase cloud settings
    "supabase": {
        "url": os.getenv("SUPABASE_URL", ""),
        "key": os.getenv("SUPABASE_KEY", ""),
        "host": "",  # Extracted from URL
        "port": "5432",
        "database": "postgres",
        "user": "postgres",
        "password": ""  # Service role key
    }
}

def get_database_settings():
    """Get current database settings"""
    provider = DATABASE_CONFIG["provider"]
    return {
        "provider": provider,
        "postgresql_configured": bool(DATABASE_CONFIG["postgresql"]["host"]),
        "supabase_configured": bool(DATABASE_CONFIG["supabase"]["url"] and DATABASE_CONFIG["supabase"]["key"])
    }

def set_database_settings(provider: str, supabase_url: str = None, supabase_key: str = None):
    """Update database settings"""
    if provider not in ["postgresql", "supabase"]:
        raise ValueError("Invalid provider. Use 'postgresql' or 'supabase'")
    
    DATABASE_CONFIG["provider"] = provider
    
    if supabase_url:
        DATABASE_CONFIG["supabase"]["url"] = supabase_url
        # Extract host from URL (e.g., https://xxx.supabase.co -> db.xxx.supabase.co)
        if "supabase.co" in supabase_url:
            project_ref = supabase_url.replace("https://", "").replace(".supabase.co", "")
            DATABASE_CONFIG["supabase"]["host"] = f"db.{project_ref}.supabase.co"
    
    if supabase_key:
        DATABASE_CONFIG["supabase"]["key"] = supabase_key
        DATABASE_CONFIG["supabase"]["password"] = supabase_key
    
    return get_database_settings()

def get_connection():
    """Get database connection with pgvector support based on current provider"""
    provider = DATABASE_CONFIG["provider"]
    
    if provider == "supabase":
        return get_supabase_connection()
    else:
        return get_postgresql_connection()

def get_postgresql_connection():
    """Get local PostgreSQL connection"""
    config = DATABASE_CONFIG["postgresql"]
    conn = psycopg2.connect(
        host=config["host"],
        port=config["port"],
        database=config["database"],
        user=config["user"],
        password=config["password"]
    )
    register_vector(conn)
    return conn

def get_supabase_connection():
    """Get Supabase PostgreSQL connection"""
    config = DATABASE_CONFIG["supabase"]
    
    if not config["host"] or not config["password"]:
        raise Exception("Supabase not configured. Please set URL and API key.")
    
    conn = psycopg2.connect(
        host=config["host"],
        port=config["port"],
        database=config["database"],
        user=config["user"],
        password=config["password"],
        sslmode="require"  # Supabase requires SSL
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
        print(f"✅ Database initialized successfully ({DATABASE_CONFIG['provider']})")
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
        return {"success": True, "provider": DATABASE_CONFIG["provider"]}
    except Exception as e:
        return {"success": False, "error": str(e), "provider": DATABASE_CONFIG["provider"]}
