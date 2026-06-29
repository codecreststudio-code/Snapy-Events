import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
  console.log("Querying storage_usage table metadata/record...");
  const { data, error } = await supabase
    .from("storage_usage")
    .select("*")
    .limit(1)

  console.log("Error:", error ? error.message : "None");
  console.log("Data:", data);
}

run()
