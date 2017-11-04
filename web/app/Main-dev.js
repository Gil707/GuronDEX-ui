require("./assets/loader-dev");
if (!window.Intl) { // Safari polyfill
    require.ensure(["intl"], require => {
        window.Intl = require("intl");
        Intl.__addLocaleData(require("./assets/intl-data/en.json"));
        Intl.__addLocaleData(require("./assets/intl-data/ru.json"));
        require("index-dev.js");
    });
} else {
    require("index-dev.js");
}
