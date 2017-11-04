module.exports = {
    formats: {
        "number": {
            asset: {
                style: "decimal",
                useGrouping: false
            }
        },
        "date": {
            full: {
                second: "numeric",
                minute: "numeric",
                hour: "numeric",
                day: "numeric",
                month: "long",
                year: "numeric"
            },
            short: {
                second: "numeric",
                minute: "numeric",
                hour: "numeric",
                day: "numeric",
                month: "numeric",
                year: "numeric"
            },
            time: {
                second: "numeric",
                minute: "numeric",
                hour: "numeric"
            }
        }
    }
};
