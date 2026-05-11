import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEFAULT_FIXTURES_PATH = path.resolve(
    PROJECT_ROOT,
    'manual-tests/ollama-benchmark/fixtures'
);
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:3b';

const splitModelList = (rawValue) =>
    String(rawValue || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

const parseArgs = (argv) => {
    const parsedArgs = {
        fixturesPath: DEFAULT_FIXTURES_PATH,
        models: [],
        workerMode: false,
        showHelp: false,
    };

    for (let index = 0; index < argv.length; index += 1) {
        const currentArg = argv[index];

        if (currentArg === '--help' || currentArg === '-h') {
            parsedArgs.showHelp = true;
            continue;
        }

        if (currentArg === '--worker') {
            parsedArgs.workerMode = true;
            continue;
        }

        if (currentArg === '--fixtures' || currentArg === '-f') {
            const fixturesPathValue = argv[index + 1];

            if (!fixturesPathValue) {
                throw new Error('Missing value for --fixtures');
            }

            parsedArgs.fixturesPath = fixturesPathValue;
            index += 1;
            continue;
        }

        if (currentArg === '--models' || currentArg === '-m') {
            const modelsValue = argv[index + 1];

            if (!modelsValue) {
                throw new Error('Missing value for --models');
            }

            parsedArgs.models.push(...splitModelList(modelsValue));
            index += 1;
            continue;
        }

        if (currentArg === '--model') {
            const modelValue = argv[index + 1];

            if (!modelValue) {
                throw new Error('Missing value for --model');
            }

            parsedArgs.models.push(modelValue.trim());
            index += 1;
            continue;
        }

        throw new Error(`Unknown argument: ${currentArg}`);
    }

    parsedArgs.models = [...new Set(parsedArgs.models.filter(Boolean))];

    if (parsedArgs.models.length === 0) {
        parsedArgs.models = [DEFAULT_MODEL];
    }

    return parsedArgs;
};

const printHelp = () => {
    console.log(`
Usage:
  node scripts/benchmark-ollama.js [options]

Options:
  --fixtures, -f <path>   Fixture file or directory (default: manual-tests/ollama-benchmark/fixtures)
  --models, -m <list>     Comma-separated model list (example: qwen2.5:3b,gemma3:4b)
  --model <name>          Add one model (can be repeated)
  --help, -h              Show this help

Notes:
  - The benchmark forces AI_SEMANTIC_ENABLED=true in worker runs.
  - Each model runs in its own Node process, so OLLAMA_MODEL stays isolated per run.
`);
};

const collectJsonFiles = async (targetPath) => {
    const absolutePath = path.resolve(PROJECT_ROOT, targetPath);
    const targetStats = await fs.stat(absolutePath);

    if (targetStats.isFile()) {
        if (!absolutePath.endsWith('.json')) {
            throw new Error(`Fixture file must be .json: ${absolutePath}`);
        }

        return [absolutePath];
    }

    if (!targetStats.isDirectory()) {
        throw new Error(`Fixtures path must be a file or directory: ${absolutePath}`);
    }

    const collectedFiles = [];

    const walkDirectory = async (directoryPath) => {
        const entries = await fs.readdir(directoryPath, { withFileTypes: true });

        for (const entry of entries) {
            const entryPath = path.join(directoryPath, entry.name);

            if (entry.isDirectory()) {
                await walkDirectory(entryPath);
                continue;
            }

            if (entry.isFile() && entry.name.endsWith('.json')) {
                collectedFiles.push(entryPath);
            }
        }
    };

    await walkDirectory(absolutePath);

    return collectedFiles.sort((leftPath, rightPath) =>
        leftPath.localeCompare(rightPath)
    );
};

const extractRawCases = (parsedFixture) => {
    if (Array.isArray(parsedFixture)) {
        return parsedFixture;
    }

    if (
        parsedFixture &&
        typeof parsedFixture === 'object' &&
        Array.isArray(parsedFixture.cases)
    ) {
        return parsedFixture.cases;
    }

    if (parsedFixture && typeof parsedFixture === 'object') {
        return [parsedFixture];
    }

    throw new Error('Fixture JSON must be an object, an array, or { "cases": [...] }');
};

const normalizeFixtureCase = (rawFixtureCase, { fixtureFilePath, caseIndex }) => {
    if (!rawFixtureCase || typeof rawFixtureCase !== 'object') {
        throw new Error(
            `Invalid case at ${fixtureFilePath} index ${caseIndex + 1}. Case must be an object.`
        );
    }

    const caseId =
        String(rawFixtureCase.id || rawFixtureCase.caseId || '').trim() ||
        `${path.basename(fixtureFilePath)}#${caseIndex + 1}`;
    const emailSource =
        rawFixtureCase.email && typeof rawFixtureCase.email === 'object'
            ? rawFixtureCase.email
            : rawFixtureCase;
    const normalizedLinks = Array.isArray(emailSource.links)
        ? emailSource.links
              .map((linkValue) => String(linkValue || '').trim())
              .filter(Boolean)
        : [];
    const parsedLinkCount = Number.parseInt(String(emailSource.linkCount || ''), 10);
    const normalizedLinkCount = Number.isFinite(parsedLinkCount)
        ? parsedLinkCount
        : normalizedLinks.length;

    return {
        caseId,
        email: {
            subject: String(emailSource.subject || ''),
            from: String(emailSource.from || ''),
            replyTo: String(emailSource.replyTo || ''),
            textBody: String(emailSource.textBody || ''),
            htmlBody: String(emailSource.htmlBody || ''),
            snippet: String(emailSource.snippet || ''),
            links: normalizedLinks,
            senderDomain: String(emailSource.senderDomain || ''),
            replyToDomain: String(emailSource.replyToDomain || ''),
            linkCount: normalizedLinkCount,
        },
    };
};

const loadFixtureCases = async (fixturesPath) => {
    const fixtureFiles = await collectJsonFiles(fixturesPath);

    if (fixtureFiles.length === 0) {
        throw new Error(`No JSON fixture files found at: ${fixturesPath}`);
    }

    const normalizedCases = [];

    for (const fixtureFilePath of fixtureFiles) {
        const rawFixtureContent = await fs.readFile(fixtureFilePath, 'utf8');
        const parsedFixture = JSON.parse(rawFixtureContent);
        const rawCases = extractRawCases(parsedFixture);

        rawCases.forEach((rawFixtureCase, caseIndex) => {
            normalizedCases.push(
                normalizeFixtureCase(rawFixtureCase, { fixtureFilePath, caseIndex })
            );
        });
    }

    return normalizedCases;
};

const buildSummary = ({ model, caseResults }) => {
    const totalCases = caseResults.length;
    const evaluatedCount = caseResults.filter(
        (caseResult) => caseResult.status === 'evaluated'
    ).length;
    const failedCount = caseResults.filter(
        (caseResult) => caseResult.status === 'failed'
    ).length;
    const parserFallbackCount = caseResults.filter(
        (caseResult) => caseResult.parserFallback === true
    ).length;
    const measuredLatencies = caseResults
        .map((caseResult) => caseResult.latencyMs)
        .filter((latencyValue) => Number.isFinite(latencyValue));
    const latencySum = measuredLatencies.reduce(
        (accumulator, latencyValue) => accumulator + latencyValue,
        0
    );
    const avgLatencyMs =
        measuredLatencies.length > 0
            ? Number((latencySum / measuredLatencies.length).toFixed(2))
            : 0;

    return {
        model,
        totalCases,
        evaluatedCount,
        failedCount,
        parserFallbackCount,
        avgLatencyMs,
    };
};

const runWorkerBenchmark = async ({ model, fixturesPath }) => {
    process.env.AI_SEMANTIC_ENABLED = 'true';
    process.env.OLLAMA_MODEL = model;

    const [{ analyzeEmailSemanticsWithOllama }, { buildAiAnalysisInput }] =
        await Promise.all([
            import('../src/services/ollama-semantic.service.js'),
            import('../src/services/scan-ai-input.service.js'),
        ]);

    const benchmarkCases = await loadFixtureCases(fixturesPath);
    const caseResults = [];

    for (const benchmarkCase of benchmarkCases) {
        const analysisInput = buildAiAnalysisInput(benchmarkCase.email);
        const semanticResult = await analyzeEmailSemanticsWithOllama({ analysisInput });

        caseResults.push({
            caseId: benchmarkCase.caseId,
            status: semanticResult.status || 'failed',
            parserFallback: semanticResult.parserFallback === true,
            latencyMs: Number.isFinite(semanticResult.latencyMs)
                ? semanticResult.latencyMs
                : null,
            error: semanticResult.error || null,
        });
    }

    return buildSummary({ model, caseResults });
};

const runWorkerProcessForModel = async ({ model, fixturesPath }) =>
    new Promise((resolve) => {
        const childProcess = spawn(
            process.execPath,
            [__filename, '--worker', '--model', model, '--fixtures', fixturesPath],
            {
                cwd: PROJECT_ROOT,
                env: {
                    ...process.env,
                    AI_SEMANTIC_ENABLED: 'true',
                    OLLAMA_MODEL: model,
                },
                stdio: ['ignore', 'pipe', 'pipe'],
            }
        );
        let workerStdout = '';
        let workerStderr = '';

        childProcess.stdout.on('data', (stdoutChunk) => {
            workerStdout += stdoutChunk.toString();
        });

        childProcess.stderr.on('data', (stderrChunk) => {
            workerStderr += stderrChunk.toString();
        });

        childProcess.on('close', (exitCode) => {
            const stdoutLines = workerStdout
                .split('\n')
                .map((lineValue) => lineValue.trim())
                .filter(Boolean);
            const lastStdoutLine = stdoutLines[stdoutLines.length - 1] || '';

            try {
                const parsedPayload = JSON.parse(lastStdoutLine);

                if (!parsedPayload || typeof parsedPayload !== 'object') {
                    throw new Error('Worker returned non-object payload');
                }

                if (!parsedPayload.summary) {
                    throw new Error('Worker payload missing summary');
                }

                resolve({
                    ok: exitCode === 0,
                    summary: parsedPayload.summary,
                    stderr: workerStderr.trim(),
                });
            } catch {
                resolve({
                    ok: false,
                    summary: {
                        model,
                        totalCases: 0,
                        evaluatedCount: 0,
                        failedCount: 0,
                        parserFallbackCount: 0,
                        avgLatencyMs: 0,
                    },
                    stderr:
                        workerStderr.trim() ||
                        workerStdout.trim() ||
                        `Worker failed for model ${model} (exit code ${exitCode ?? 'unknown'})`,
                });
            }
        });
    });

const formatTable = (summaries) => {
    const columns = [
        { key: 'model', label: 'Model' },
        { key: 'totalCases', label: 'Total' },
        { key: 'evaluatedCount', label: 'Evaluated' },
        { key: 'failedCount', label: 'Failed' },
        { key: 'parserFallbackCount', label: 'ParserFallback' },
        { key: 'avgLatencyMs', label: 'AvgLatencyMs' },
    ];
    const widths = columns.map((column) =>
        Math.max(
            column.label.length,
            ...summaries.map((summary) => String(summary[column.key]).length)
        )
    );
    const formatRow = (rowValue) =>
        columns
            .map((column, index) =>
                String(rowValue[column.key]).padEnd(widths[index], ' ')
            )
            .join('  ');

    return [formatRow(Object.fromEntries(columns.map((column) => [column.key, column.label])))]
        .concat([
            columns
                .map((_, index) => '-'.repeat(widths[index]))
                .join('  '),
        ])
        .concat(summaries.map((summary) => formatRow(summary)))
        .join('\n');
};

const run = async () => {
    const parsedArgs = parseArgs(process.argv.slice(2));

    if (parsedArgs.showHelp) {
        printHelp();
        return;
    }

    if (parsedArgs.workerMode) {
        if (parsedArgs.models.length !== 1) {
            throw new Error('Worker mode requires exactly one model.');
        }

        const summary = await runWorkerBenchmark({
            model: parsedArgs.models[0],
            fixturesPath: parsedArgs.fixturesPath,
        });

        console.log(JSON.stringify({ summary }));
        return;
    }

    const summaries = [];
    const runFailures = [];
    const startedAt = Date.now();

    for (const model of parsedArgs.models) {
        console.log(`[benchmark] running model ${model} ...`);

        const workerResult = await runWorkerProcessForModel({
            model,
            fixturesPath: parsedArgs.fixturesPath,
        });

        summaries.push(workerResult.summary);

        if (!workerResult.ok) {
            runFailures.push({
                model,
                message: workerResult.stderr || 'unknown worker failure',
            });
        }
    }

    console.log('');
    console.log(`Fixtures: ${path.resolve(PROJECT_ROOT, parsedArgs.fixturesPath)}`);
    console.log(`Models: ${parsedArgs.models.join(', ')}`);
    console.log(`DurationMs: ${Date.now() - startedAt}`);
    console.log('');
    console.log(formatTable(summaries));

    if (runFailures.length > 0) {
        console.log('');
        console.log('Worker failures:');

        runFailures.forEach((runFailure) => {
            console.log(`- ${runFailure.model}: ${runFailure.message}`);
        });

        process.exitCode = 1;
    }
};

run().catch((error) => {
    console.error(`[benchmark] ${error.message}`);
    process.exit(1);
});
