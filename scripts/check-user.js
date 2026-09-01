const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://localhost:27017/binjwa_smm');
  const user = await mongoose.connection.db.collection('users').findOne({ _id: new mongoose.Types.ObjectId('6a60744a67bc8be7ad53a5bc') });
  console.log(JSON.stringify(user, null, 2));
  process.exit(0);
}
check().catch(console.error);
