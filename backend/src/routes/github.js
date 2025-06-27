const express = require("express");
const passport = require("passport");

const router = express.Router();

router.get("/github", passport.authenticate("github", { scope: ["user:email"] }));

router.get("/github/callback", passport.authenticate("github", { failureRedirect: "/" }), (req, res) => {
    res.redirect("/dashboard");
});

module.exports = router;
