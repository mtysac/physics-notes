import js from "@eslint/js";

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "script",
            globals: {
                window: "readonly",
                document: "readonly",
                requestAnimationFrame: "readonly",
                cancelAnimationFrame: "readonly",
                console: "readonly",
                Image: "readonly",
            },
        },
        rules: {
            "no-unused-vars": "warn",
            "no-undef": "error",
            "eqeqeq": "warn",
            "no-console": "off",
        },
    },
];
