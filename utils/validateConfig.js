module.exports.validateConfig = function validateConfig(config) {
    const params = [
        "APP_ID",
        "API_KEY",
        "API_KEY_ID",
        "TWILIO_ACCOUNT_SID",
        "TWILIO_API_SECRET",
        "TWILIO_API_KEY",
        "TWILIO_SERVICE_SID"
    ];

    return params.reduce((missingParams, param) => {
        const value = config[param]
        if (!value || value === '') missingParams.push(param);
        return missingParams;
    }, []);
}
