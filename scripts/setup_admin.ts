import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupAdmin() {
  const email = 'syedfarrukh55@gmail.com'
  const password = 'Sofb@1432'

  console.log(`Setting up admin account for: ${email}`)

  // 1. Check if user exists in auth
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
  
  if (listError) {
    console.error('Error listing users:', listError)
    return
  }

  let user = users.find(u => u.email === email)

  if (!user) {
    console.log('User not found in Auth. Creating...')
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })
    
    if (createError) {
      console.error('Error creating user:', createError)
      return
    }
    user = createData.user
    console.log('User created successfully in Auth:', user.id)
  } else {
    console.log('User found in Auth:', user.id)
    console.log('Updating password...')
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password
    })
    if (updateError) {
      console.error('Error updating password:', updateError)
    } else {
      console.log('Password updated successfully.')
    }
  }

  // 2. Ensure they exist in public.users and update is_admin
  console.log('Updating public.users table...')
  const { error: dbError } = await supabase
    .from('users')
    .upsert({ 
      id: user.id, 
      email: email,
      full_name: 'Syed Farrukh',
      is_admin: true,
      updated_at: new Date().toISOString()
    })
    
  if (dbError) {
    console.error('Error updating public.users:', dbError)
  } else {
    console.log('Successfully granted admin privileges in public.users.')
  }
}

setupAdmin()
