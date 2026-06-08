const express = require("express")
const cookieParser = require("cookie-parser")
const path = require("path")
const app = express()

app.use(express.json())
app.use(cookieParser())

// Serve static frontend files
app.use(express.static(path.join(__dirname, "../public")))

/**
 * - Routes required
 */
const authRouter = require("./routes/auth.routes")
const accountRouter = require("./routes/account.routes")
const transactionRoutes = require("./routes/transaction.routes")

/**
 * - Use Routes
 */
app.use("/api/auth", authRouter)
app.use("/api/accounts", accountRouter)
app.use("/api/transactions", transactionRoutes)

module.exports = app