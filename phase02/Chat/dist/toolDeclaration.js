export const executeCommandDeclaration = {
    type: "function",
    function: {
        name: "executeCommand",
        description: "Execute a single or multi terminal/shell command. A command can be to create a folder, file, write on a file, edit the file or delete the file",
        parameters: {
            type: "object",
            properties: {
                commands: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of shell commands to execute in sequence. eg: commands=['pwd','ls','ls -a']",
                },
            },
            required: ["commands"],
        },
    },
};
