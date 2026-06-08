const mongoose = require("mongoose");
require("dotenv").config();
const Account = require("../src/models/account.model");
const Ledger = require("../src/models/ledger.model");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to database.");

  const accountId = "6a26fb2ee92933f4c24ecf24";
  const userId = "6a26f6b1e92933f4c24ecf1c"; // Test Admin user ID

  console.log(`Checking account: ${accountId} for user: ${userId}`);
  const account = await Account.findOne({ _id: accountId, user: userId });
  console.log("Account found:", account);

  if (account) {
    const ledgers = await Ledger.find({ account: accountId })
      .populate("transaction")
      .sort({ _id: -1 });
    console.log("Ledger entries found:", ledgers.length);
    if (ledgers.length > 0) {
      console.log("First entry:", ledgers[0]);
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
