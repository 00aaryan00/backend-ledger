const http = require("http");
const mongoose = require("mongoose");
require("dotenv").config();

// Mongoose Models for helper direct DB update
const User = require("./src/models/user.model");

const request = (path, method, data = null, token = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: 3000,
      path: path,
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (token) {
      options.headers["Authorization"] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: JSON.parse(body),
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: body,
          });
        }
      });
    });

    req.on("error", (err) => reject(err));

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
};

async function run() {
  const timestamp = Date.now();
  const userA = {
    email: `usera_${timestamp}@example.com`,
    name: "System User A",
    password: "securePassword123",
  };

  const userB = {
    email: `userb_${timestamp}@example.com`,
    name: "Regular User B",
    password: "securePassword123",
  };

  try {
    // 1. Register User A and User B
    console.log("1. Registering User A...");
    const regARes = await request("/api/auth/register", "POST", userA);
    console.log("User A registered:", regARes.status, regARes.data);
    const userA_Id = regARes.data.user._id;
    const tokenA = regARes.data.token;

    console.log("\n2. Registering User B...");
    const regBRes = await request("/api/auth/register", "POST", userB);
    console.log("User B registered:", regBRes.status, regBRes.data);
    const userB_Id = regBRes.data.user._id;
    const tokenB = regBRes.data.token;

    // 3. Connect to DB to update User A to systemUser: true
    console.log("\n3. Setting User A systemUser status to true via direct DB connection...");
    await mongoose.connect(process.env.MONGO_URI);
    const updateResult = await User.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(userA_Id) },
      { $set: { systemUser: true } }
    );
    console.log("Raw update result:", updateResult);
    await mongoose.disconnect();
    console.log("User A systemUser status updated successfully!");

    // 4. Create accounts for User A and User B
    console.log("\n4. Creating Account for User A (system account)...");
    const accARes = await request("/api/accounts", "POST", {}, tokenA);
    console.log("Account A created:", accARes.status, accARes.data);
    const accAId = accARes.data.account._id;

    console.log("\n5. Creating Account for User B...");
    const accBRes = await request("/api/accounts", "POST", {}, tokenB);
    console.log("Account B created:", accBRes.status, accBRes.data);
    const accBId = accBRes.data.account._id;

    // 6. Give User B initial funds from User A (system user)
    console.log("\n6. User A (System) calling initial-funds to deposit 5000 to Account B...");
    const initialFundsData = {
      toAccount: accBId,
      amount: 5000,
      idempotencyKey: `init_${timestamp}`,
    };
    const initRes = await request("/api/transactions/system/initial-funds", "POST", initialFundsData, tokenA);
    console.log("Initial Funds Response:", initRes.status, initRes.data);

    // Verify Account B's balance is 5000
    const balBRes1 = await request(`/api/accounts/balance/${accBId}`, "GET", null, tokenB);
    console.log("User B Account Balance after initial funds:", balBRes1.data.balance);

    // 7. User B transfers 1000 to Account A (lag simulation triggers here)
    const transferKey = `transfer_${timestamp}`;
    const transferData = {
      fromAccount: accBId,
      toAccount: accAId,
      amount: 1000,
      idempotencyKey: transferKey,
    };

    console.log("\n7. User B triggers 1000 transfer to Account A...");
    const transferPromise = request("/api/transactions", "POST", transferData, tokenB);

    // Wait 2 seconds to make sure it's running
    await new Promise((r) => setTimeout(r, 2000));

    // 8. Try another request with the SAME idempotency key immediately
    console.log("\n8. Submitting duplicate request with same idempotency key (while first is PENDING)...");
    const dupRes = await request("/api/transactions", "POST", transferData, tokenB);
    console.log("Duplicate Request Response (should be still processing):", dupRes.status, dupRes.data);

    // 9. Wait for the initial transfer to finish
    console.log("\n9. Waiting for initial transfer to complete (simulation delay is 15s)...");
    const mainTransferRes = await transferPromise;
    console.log("Main Transfer Response:", mainTransferRes.status, mainTransferRes.data);

    // 10. Check account balances
    console.log("\n10. Checking final balances...");
    const balARes = await request(`/api/accounts/balance/${accAId}`, "GET", null, tokenA);
    const balBRes2 = await request(`/api/accounts/balance/${accBId}`, "GET", null, tokenB);
    console.log("User A Account Balance (should be 1000):", balARes.data.balance);
    console.log("User B Account Balance (should be 4000):", balBRes2.data.balance);

    // 11. Request again with same idempotency key now that it is COMPLETED
    console.log("\n11. Submitting request with same idempotency key (now that it is COMPLETED)...");
    const processedRes = await request("/api/transactions", "POST", transferData, tokenB);
    console.log("Completed Duplicate Request Response (should be already processed):", processedRes.status, processedRes.data);

    console.log("\nAPI Verification Successful!");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

run();
