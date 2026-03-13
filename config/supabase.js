// Import the createClient function from the Supabase JavaScript library.
const { createClient } = require('@supabase/supabase-js');

// Access our Supabase credentials from the environment variables.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

/**
 * Initialize the Supabase client.
 * 
 * UNLIKE MONGOOSE: Mongoose acts as an Object Data Modeling (ODM) layer 
 * that maintains a persistent stateful connection to a MongoDB database. 
 * Contrastingly, the Supabase JavaScript client is essentially a thin 
 * wrapper around PostgreSQL's PostgREST API. 
 * 
 * We don't "connect" or wait for a connection event. Instead, we configure 
 * the client with our project URL and API key. When we execute data interactions
 * (like supabase.from('...')), the client executes stateless HTTP requests 
 * directly to the Supabase backend.
 */
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
