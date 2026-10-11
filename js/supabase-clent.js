"use strict";

// Hysteria's Cure — Supabase Client
// Uses the public project URL and publishable key.
// Never place a secret or service_role key in this file.

const SUPABASE_URL = "https://iltnklpuyifvnojiqrkh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_wMSMx1WpGWn7Tk0zBUDAhg_Jlj8RWDO";

if (typeof window.supabase === "undefined") {
    throw new Error(
        "Supabase library not loaded. Check the Supabase CDN script."
    );
}

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);
