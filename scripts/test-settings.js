require('dotenv').config();
const mongoose = require('mongoose');
const GlobalSetting = require('./models/globalSetting.model');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/binjwa_smm')
  .then(async () => {
    try {
      let settings = await GlobalSetting.findOne({ configId: 'global_config' });
      if (!settings) {
        settings = await GlobalSetting.create({ configId: 'global_config' });
      }
      console.log('Settings fetched successfully');
      process.exit(0);
    } catch (err) {
      console.error('Error:', err);
      process.exit(1);
    }
  });
