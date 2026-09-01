const { createClient } = require('@supabase/supabase-js');
const mongoose = require('mongoose');

const supabase = createClient(
  'https://nieemhyzusnzhwlnahfp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZWVtaHl6dXNuemh3bG5haGZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDE5NTQwOSwiZXhwIjoyMDk5NzcxNDA5fQ.wY-0DJey-C8t-thIXg27A_IiCiD2BsivPYaxjmoiY8E'
);

async function fix() {
  await mongoose.connect('mongodb://localhost:27017/binjwa_smm');
  const User = mongoose.connection.db.collection('users');

  const { data: tickets, error } = await supabase.from('support_tickets').select('*');
  if (error) {
    console.error(error);
    process.exit(1);
  }

  for (const ticket of tickets) {
    if (ticket.admin_id === ticket.user_id) {
      console.log(`Fixing ticket ${ticket.id}...`);
      let mongoUser;
      try {
        mongoUser = await User.findOne({ _id: new mongoose.Types.ObjectId(ticket.user_id) });
      } catch (e) {
        continue;
      }
      
      if (mongoUser) {
        const correctAdminId = mongoUser.assignedAdminId || mongoUser.createdByAdminId;
        if (correctAdminId && correctAdminId.toString() !== ticket.user_id) {
          const { error: updateError } = await supabase
            .from('support_tickets')
            .update({ admin_id: correctAdminId.toString() })
            .eq('id', ticket.id);
            
          if (updateError) {
            console.error(`Failed to update ticket ${ticket.id}:`, updateError);
          } else {
            console.log(`Updated ticket ${ticket.id} admin_id to ${correctAdminId}`);
          }
        } else {
          console.log(`No valid assignedAdminId for user ${ticket.user_id}`);
        }
      }
    }
  }
  
  console.log("Done fixing tickets.");
  process.exit(0);
}
fix().catch(console.error);
