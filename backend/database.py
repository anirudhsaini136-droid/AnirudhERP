import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    ASYNC_DATABASE_URL = DATABASE_URL.replace('postgresql://', 'postgresql+asyncpg://')
else:
    ASYNC_DATABASE_URL = None

# Create async engine only if DATABASE_URL is configured properly
engine = None
AsyncSessionLocal = None

if ASYNC_DATABASE_URL and 'YOUR_PROJECT_REF' not in ASYNC_DATABASE_URL:
    engine = create_async_engine(
        ASYNC_DATABASE_URL,
        pool_size=10,
        max_overflow=5,
        pool_timeout=30,
        pool_recycle=1800,
        pool_pre_ping=False,
        echo=False,
        connect_args={
            "statement_cache_size": 0,
            "command_timeout": 30,
        }
    )
    
    AsyncSessionLocal = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False
    )

Base = declarative_base()

async def get_db():
    if AsyncSessionLocal is None:
        yield None
        return
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
