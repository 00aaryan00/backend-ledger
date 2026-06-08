const mongoose = require("mongoose");
require("dotenv").config();

const User = require("./src/models/user.model");
const Account = require("./src/models/account.model");
const Ledger = require("./src/models/ledger.model");
const Transaction = require("./src/models/transaction.model");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB.");

  const users = await User.find({});
  console.log("\n=== USERS ===");
  console.log(users.map(u => ({ id: u._id, email: u.email, name: u.name, systemUser: u.systemUser })));

  const accounts = await Account.find({});
  console.log("\n=== ACCOUNTS ===");
  console.log(accounts);

  const ledgers = await Ledger.find({});
  console.log("\n=== LEDGER ENTRIES ===");
  console.log(ledgers);

  const transactions = await Transaction.find({});
  console.log("\n=== TRANSACTIONS ===");
  console.log(transactions);

  if (accounts.length > 0) {
    console.log("\n=== COMPUTED BALANCES ===");
    for (const acc of accounts) {
      const balance = await acc.getBalance();
      console.log(`Account ID: ${acc._id}, Computed Balance: ${balance}`);
    }
  }

  await mongoose.disconnect();
}

run();
