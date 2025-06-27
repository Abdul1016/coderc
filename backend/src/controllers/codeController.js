const axios = require("axios");

const JUDGE0_API = "http://localhost:2358"; // Change if using a different setup

exports.runCode = async (req, res) => {
    const { language_id, source_code, stdin } = req.body;

    try {
        const { data } = await axios.post(`${JUDGE0_API}/submissions?base64_encoded=false&wait=true`, {
            source_code,
            language_id,
            stdin
        });

        res.json({ stdout: data.stdout, stderr: data.stderr, time: data.time });
    } catch (error) {
        console.error("Judge0 Error:", error);
        res.status(500).json({ message: "Error executing code" });
    }
};
