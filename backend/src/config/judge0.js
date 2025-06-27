const axios = require("axios");

const JUDGE0_API = "http://localhost:2358";

exports.runCode = async (language_id, source_code, input) => {
    try {
        const { data } = await axios.post(`${JUDGE0_API}/submissions`, {
            source_code,
            language_id,
            stdin: input
        });
        return data;
    } catch (error) {
        console.error("Judge0 Error:", error);
        return null;
    }
};
