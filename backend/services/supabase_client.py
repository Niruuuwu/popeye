from supabase import Client, create_client

from backend.config import settings

# Use service role key for server-side auth validation if available, else anon key
key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
supabase: Client = create_client(settings.SUPABASE_URL, key)
