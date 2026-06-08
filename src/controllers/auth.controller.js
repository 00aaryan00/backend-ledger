const userModel = require("../models/user.model")
const jwt = require("jsonwebtoken")
const tokenBlackListModel = require("../models/blackList.model")

/**
 * - user register controller
 * - POST /api/auth/register
 */
async function userRegisterController(req, res) {
    const { email, password, name } = req.body

    const isExists = await userModel.findOne({ email: email })

    if (isExists) {
        return res.status(422).json({
            message: "User already exists with email.",
            status: "failed"
        })
    }

    const user = await userModel.create({ email, password, name })

    const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: "3d" }
    )

    res.cookie("token", token)

    res.status(201).json({
        user: {
            _id: user._id,
            email: user.email,
            name: user.name
        },
        token
    })
}

/**
 * - User Login Controller
 * - POST /api/auth/login
 */
async function userLoginController(req, res) {
    const { email, password } = req.body

    const user = await userModel.findOne({ email }).select("+password")

    if (!user) {
        return res.status(401).json({
            message: "Email or password is INVALID"
        })
    }

    const isValidPassword = await user.comparePassword(password)

    if (!isValidPassword) {
        return res.status(401).json({
            message: "Email or password is INVALID"
        })
    }

    const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: "3d" }
    )

    res.cookie("token", token)

    res.status(200).json({
        user: {
            _id: user._id,
            email: user.email,
            name: user.name
        },
        token
    })
}

/**
 * - User Logout Controller
 * - POST /api/auth/logout
 */
async function userLogoutController(req, res) {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1]

    if (!token) {
        return res.status(200).json({
            message: "User logged out successfully"
        })
    }

    await tokenBlackListModel.create({ token: token })

    res.clearCookie("token")

    res.status(200).json({
        message: "User logged out successfully"
    })
}

/**
 * - Upgrade user to system admin (dev utility)
 * - POST /api/auth/make-system-user
 */
async function makeSystemUserController(req, res) {
    try {
        const user = await userModel.findById(req.user._id)
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }
        // Use raw collection update to bypass mongoose field immutability
        await userModel.collection.updateOne(
            { _id: user._id },
            { $set: { systemUser: true } }
        )
        return res.json({ message: "Successfully upgraded user to System Admin!" })
    } catch (error) {
        console.error("Upgrade error:", error)
        return res.status(500).json({ message: "Server error", error: error.message })
    }
}

module.exports = {
    userRegisterController,
    userLoginController,
    userLogoutController,
    makeSystemUserController
}
