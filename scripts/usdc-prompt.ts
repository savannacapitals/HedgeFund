import readline from "readline";

/** Asks a question and does not echo what is typed (for recovery phrases and keys) */
export function readHidden(question: string): Promise<string> {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
        const write = (rl as any)._writeToOutput;
        process.stdout.write(question);
        (rl as any)._writeToOutput = () => {}; // swallow what the user types
        rl.question("", (answer) => {
            (rl as any)._writeToOutput = write;
            rl.close();
            process.stdout.write("\n");
            resolve(answer);
        });
    });
}

export function ask(question: string): Promise<string> {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}
